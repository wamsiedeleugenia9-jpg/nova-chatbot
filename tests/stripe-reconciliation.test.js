const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const root = join(__dirname, "..");
process.env.STRIPE_FOUNDER_PRICE_ID = "price_founder";

const { hasValidReconciliationAuthorization } = require("../lib/server/reconciliationAuth");
const { reconcileFounderSubscriptions } = require("../lib/server/stripeSubscriptions");

const userId = "11111111-1111-4111-8111-111111111111";
function subscription(id, status = "active") {
  return {
    id,
    customer: `cus_${id}`,
    status,
    cancel_at_period_end: status === "canceled",
    canceled_at: status === "canceled" ? 900 : null,
    ended_at: status === "canceled" ? 950 : null,
    metadata: { ewa_user_id: userId },
    items: { data: [{ price: { id: "price_founder" }, current_period_start: 100, current_period_end: 200 }] }
  };
}

test("reconciliation pages through active and historical Founder subscriptions", async () => {
  const listCalls = [];
  const pages = [
    { data: [subscription("sub_old", "canceled")], has_more: true },
    { data: [subscription("sub_current")], has_more: false }
  ];
  const stripe = {
    subscriptions: {
      list: async params => {
        listCalls.push(params);
        return pages.shift();
      }
    }
  };
  const projections = [];
  const client = { rpc: async (name, payload) => {
    projections.push([name, payload]);
    return { data: true, error: null };
  } };

  const result = await reconcileFounderSubscriptions(stripe, client, new Date("2026-09-05T12:00:00Z"));

  assert.deepEqual(result, { scanned: 2, synchronized: 2, unchanged: 0 });
  assert.deepEqual(listCalls, [
    { price: "price_founder", status: "all", limit: 100 },
    { price: "price_founder", status: "all", limit: 100, starting_after: "sub_old" }
  ]);
  assert.deepEqual(projections.map(([, payload]) => payload.p_stripe_subscription_id), ["sub_old", "sub_current"]);
  assert.ok(projections.every(([name, payload]) => name === "sync_stripe_subscription" && payload.p_user_id === userId));
  assert.equal(projections[0][1].p_status, "canceled");
  assert.equal(projections[1][1].p_status, "active");
  assert.match(projections[0][1].p_event_id, /^~reconcile:\d+:sub_old$/);
  assert.equal("create" in stripe.subscriptions, false);
});

test("repeating the same reconciliation snapshot is idempotent", async () => {
  const seen = new Set();
  const client = { rpc: async (_name, payload) => {
    const orderingKey = `${payload.p_stripe_subscription_id}:${payload.p_event_created}:${payload.p_event_id}`;
    if (seen.has(orderingKey)) return { data: false, error: null };
    seen.add(orderingKey);
    return { data: true, error: null };
  } };
  const stripe = { subscriptions: { list: async () => ({ data: [subscription("sub_1"), subscription("sub_2")], has_more: false }) } };
  const at = new Date("2026-09-05T12:00:00Z");

  assert.deepEqual(await reconcileFounderSubscriptions(stripe, client, at), { scanned: 2, synchronized: 2, unchanged: 0 });
  assert.deepEqual(await reconcileFounderSubscriptions(stripe, client, at), { scanned: 2, synchronized: 0, unchanged: 2 });
  assert.equal(seen.size, 2);
});

test("reconciliation fails closed for subscriptions without trusted EWA metadata", async () => {
  const unmapped = subscription("sub_unmapped");
  unmapped.metadata = {};
  const stripe = { subscriptions: { list: async () => ({ data: [unmapped], has_more: false }) } };
  const client = { rpc: async () => assert.fail("an unmapped subscription must not reach Supabase") };

  await assert.rejects(reconcileFounderSubscriptions(stripe, client), /trusted EWA user mapping/);
});

test("reconciliation endpoint uses a dedicated constant-time bearer secret", () => {
  assert.equal(hasValidReconciliationAuthorization("Bearer correct", "correct"), true);
  assert.equal(hasValidReconciliationAuthorization("Bearer incorrect", "correct"), false);
  assert.equal(hasValidReconciliationAuthorization("correct", "correct"), false);
  assert.equal(hasValidReconciliationAuthorization(undefined, "correct"), false);
  assert.equal(hasValidReconciliationAuthorization("Bearer correct", ""), false);

  const route = readFileSync(join(root, "pages/api/stripe/reconcile.js"), "utf8");
  assert.match(route, /req\.method !== "POST"/);
  assert.match(route, /STRIPE_RECONCILIATION_SECRET/);
  assert.match(route, /hasValidReconciliationAuthorization\(req\.headers\.authorization\)/);
  assert.match(route, /reconcileFounderSubscriptions\(getStripe\(\), getPrivilegedSupabase\(\)\)/);
  assert.doesNotMatch(route, /checkout\.sessions\.create|subscriptions\.create/);
});
