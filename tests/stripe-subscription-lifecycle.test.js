const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const Module = require("node:module");
const { spawnSync } = require("node:child_process");

const root = join(__dirname, "..");
process.env.STRIPE_FOUNDER_PRICE_ID = "price_founder";
const { isFounderSubscriptionEntitled } = require("../lib/server/founderEntitlement");
const { synchronizeFounderSubscription, trustedUserId } = require("../lib/server/stripeSubscriptions");

const userId = "11111111-1111-4111-8111-111111111111";
function subscription(overrides = {}) {
  return {
    id: "sub_1", customer: "cus_1", status: "active", cancel_at_period_end: false,
    canceled_at: null, ended_at: null, metadata: { ewa_user_id: userId },
    items: { data: [{ price: { id: "price_founder" }, current_period_start: 100, current_period_end: 200 }] },
    ...overrides
  };
}

test("Pages Router access-status dependencies load without the RSC server-only poison pill", () => {
  const founderAccessPath = join(root, "lib", "server", "founderAccess.js");
  const result = spawnSync(process.execPath, ["-e", `require(${JSON.stringify(founderAccessPath)})`], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const route = readFileSync(join(root, "pages", "api", "access-status.js"), "utf8");
  const access = readFileSync(founderAccessPath, "utf8");
  const entitlement = readFileSync(join(root, "lib", "server", "founderEntitlement.js"), "utf8");
  assert.match(route, /lib\/server\/founderAccess/);
  assert.match(access, /require\("\.\/founderEntitlement"\)/);
  assert.doesNotMatch(entitlement, /require\(["']server-only["']\)/);
});

test("Founder entitlement helper still rejects browser execution", () => {
  const entitlementPath = join(root, "lib", "server", "founderEntitlement.js");
  const result = spawnSync(process.execPath, ["-e", `global.window = {}; require(${JSON.stringify(entitlementPath)})`], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Founder entitlement evaluation is server-only/);
});

test("complete Pages Router webhook dependency chain loads without server-only", async () => {
  const routePath = join(root, "pages/api/stripe/webhook.js");
  const route = readFileSync(routePath, "utf8");
  const { loadBindings, transform } = require("next/dist/build/swc");
  await loadBindings();
  const transformed = await transform(route, {
    filename: routePath,
    jsc: { parser: { syntax: "ecmascript" }, target: "es2020" },
    module: { type: "commonjs" }
  });
  const compiledRoute = new Module(routePath, module);
  compiledRoute.filename = routePath;
  compiledRoute.paths = Module._nodeModulePaths(join(root, "pages/api/stripe"));

  const originalLoad = Module._load;
  Module._load = function rejectServerOnly(request, parent, isMain) {
    if (request === "server-only") throw new Error("server-only entered the webhook runtime chain");
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    compiledRoute._compile(transformed.code, routePath);
    assert.equal(typeof compiledRoute.exports.default, "function");
  } finally {
    Module._load = originalLoad;
  }
});

test("webhook privileged dependencies reject browser execution", () => {
  for (const [relativePath, message] of [
    ["lib/server/privilegedSupabase.js", "privileged Supabase client is server-only"],
    ["lib/server/stripeSubscriptions.js", "subscription synchronization is server-only"]
  ]) {
    const modulePath = join(root, relativePath);
    const result = spawnSync(process.execPath, ["-e", `global.window = {}; require(${JSON.stringify(modulePath)})`], {
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0, relativePath);
    assert.match(result.stderr, new RegExp(message), relativePath);
  }
});

test("only active Founder access within its paid period is entitled", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const base = { stripe_price_id: "price_founder", status: "active", current_period_end: "2026-02-01T00:00:00Z" };
  assert.equal(isFounderSubscriptionEntitled(base, now), true);
  assert.equal(isFounderSubscriptionEntitled({ ...base, cancel_at_period_end: true }, now), true);
  assert.equal(isFounderSubscriptionEntitled({ ...base, current_period_end: "2025-12-31T23:59:59Z" }, now), false);
  for (const status of ["trialing", "past_due", "incomplete", "incomplete_expired", "unpaid", "canceled", "paused"]) {
    assert.equal(isFounderSubscriptionEntitled({ ...base, status }, now), false, status);
  }
  assert.equal(isFounderSubscriptionEntitled({ ...base, stripe_price_id: "price_browser_supplied" }, now), false);
});

test("synchronization validates Founder price and trusted subscription metadata", async () => {
  const calls = [];
  const client = { rpc: async (name, payload) => { calls.push([name, payload]); return { data: true, error: null }; } };
  const event = { id: "evt_1", created: 123 };
  assert.deepEqual(await synchronizeFounderSubscription(client, subscription(), event), { ignored: false, userId });
  assert.equal(calls[0][0], "sync_stripe_subscription");
  assert.equal(calls[0][1].p_user_id, userId);
  assert.equal(calls[0][1].p_current_period_end, "1970-01-01T00:03:20.000Z");
  const wrongPrice = subscription({ items: { data: [{ price: { id: "price_attacker" } }] } });
  assert.deepEqual(await synchronizeFounderSubscription(client, wrongPrice, event), { ignored: true, reason: "not_founder_price" });
  assert.equal(calls.length, 1);
  assert.throws(() => trustedUserId(subscription({ metadata: { ewa_user_id: "browser-user" } })), /trusted EWA user/);
});

test("synchronization accepts the unexpanded price ID returned on a Stripe subscription item", async () => {
  const calls = [];
  const client = { rpc: async (name, payload) => { calls.push([name, payload]); return { data: true, error: null }; } };
  const unexpandedPrice = subscription({
    items: { data: [{ price: "price_founder", current_period_start: 100, current_period_end: 200 }] }
  });

  assert.deepEqual(
    await synchronizeFounderSubscription(client, unexpandedPrice, { id: "evt_unexpanded", created: 124 }),
    { ignored: false, userId }
  );
  assert.equal(calls[0][1].p_stripe_price_id, "price_founder");
});

test("synchronization distinguishes stale events and rejects malformed RPC success responses", async () => {
  const event = { id: "evt_1", created: 123 };
  const staleClient = { rpc: async () => ({ data: false, error: null }) };
  assert.deepEqual(await synchronizeFounderSubscription(staleClient, subscription(), event), {
    ignored: true, reason: "stale_or_duplicate_event", userId
  });

  const malformedClient = { rpc: async () => ({ data: null, error: null }) };
  await assert.rejects(
    synchronizeFounderSubscription(malformedClient, subscription(), event),
    /unexpected result/
  );
});

test("duplicate and stale events are rejected atomically by the database migration", () => {
  const migration = readFileSync(join(root, "supabase/migrations/20260826020000_add_stripe_event_ordering.sql"), "utf8");
  assert.match(migration, /on conflict \(user_id\) do update/);
  assert.match(migration, /last_stripe_event_created,[\s\S]*last_stripe_event_id\)[\s\S]*< \(excluded\.last_stripe_event_created, excluded\.last_stripe_event_id\)/);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/);
});

test("webhook preserves raw body, verifies signatures first, and supports lifecycle events", () => {
  const route = readFileSync(join(root, "pages/api/stripe/webhook.js"), "utf8");
  assert.match(route, /bodyParser: false/);
  assert.match(route, /webhooks\.constructEvent\(await rawBody\(req\), signature, process\.env\.STRIPE_WEBHOOK_SECRET\)/);
  assert.match(route, /status\(400\)\.json\(\{ error: "invalid_signature" \}\)/);
  assert.ok(route.indexOf("constructEvent") < route.indexOf("getPrivilegedSupabase()"));
  for (const type of ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"]) assert.match(route, new RegExp(type.replaceAll(".", "\\.")));
  assert.match(route, /founderSynchronizationRequired[\s\S]*result\.reason === "not_founder_price"[\s\S]*throw new Error/);
});

test("paid POST operations are gated while history and stored data remain read-only accessible", () => {
  const chat = readFileSync(join(root, "pages/api/chat.js"), "utf8");
  const blueprint = readFileSync(join(root, "pages/api/blueprint.js"), "utf8");
  assert.ok(chat.indexOf("authorizeFounder(auth)") < chat.indexOf('fetch("https://api.anthropic.com'));
  assert.match(chat, /req\.method === "GET"[\s\S]*loadChatHistory/);
  assert.match(chat + blueprint, /status\(403\)\.json\(\{ error: "subscription_required" \}\)/);
  assert.doesNotMatch(chat, /stripe_subscriptions[\s\S]{0,100}\.delete\(/);
  assert.match(blueprint, /if \(req\.method === "POST"\)[\s\S]*authorizeFounder\(auth\)/);
});

test("Checkout return query never grants access", () => {
  const page = readFileSync(join(root, "pages/index.jsx"), "utf8");
  assert.match(page, /checkout"\) === "success"[\s\S]*Plata este in curs de confirmare/);
  assert.doesNotMatch(page, /setAccessStatus\([^\n]*(checkout|searchParams|location)/i);
});

test("chat page has one history response declaration and one set of chat controls", () => {
  const page = readFileSync(join(root, "pages/index.jsx"), "utf8");
  const restoreHistory = readFileSync(join(root, "lib/chat/restoreHistory.js"), "utf8");
  assert.equal((restoreHistory.match(/historyResponse = await fetchImpl/g) || []).length, 1);
  assert.equal((restoreHistory.match(/accessResponse = await fetchImpl/g) || []).length, 1);
  assert.equal((page.match(/<textarea\b/g) || []).length, 1);
  assert.equal((page.match(/<button onClick=\{\(\) => send\(\)\}/g) || []).length, 1);
  assert.match(page, /accessStatus && !accessStatus\.entitled[\s\S]*EWA AI Founder/);
});
