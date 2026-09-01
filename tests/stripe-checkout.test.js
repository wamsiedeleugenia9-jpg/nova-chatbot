const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const Module = require("node:module");

const root = join(__dirname, "..");
const checkoutHelper = readFileSync(join(root, "lib/server/checkout.js"), "utf8");
const stripeHelper = readFileSync(join(root, "lib/server/stripe.js"), "utf8");
const route = readFileSync(join(root, "pages/api/stripe/checkout.js"), "utf8");

function loadCheckoutHelper() {
  const path = require.resolve("../lib/server/checkout");
  delete require.cache[path];
  return require(path);
}

test("Stripe client and Checkout configuration stay server-only", () => {
  assert.doesNotMatch(stripeHelper, /require\(["']server-only["']\)/);
  assert.doesNotMatch(checkoutHelper, /require\(["']server-only["']\)/);
  assert.match(stripeHelper, /typeof window !== "undefined"/);
  assert.match(checkoutHelper, /typeof window !== "undefined"/);
  assert.match(stripeHelper, /process\.env\.STRIPE_SECRET_KEY/);
  assert.doesNotMatch(stripeHelper + checkoutHelper + route, /NEXT_PUBLIC_STRIPE|SUPABASE_SERVICE_ROLE_KEY/);
});

test("complete Pages Router Checkout dependency chain loads without server-only", async () => {
  const { loadBindings, transform } = require("next/dist/build/swc");
  await loadBindings();
  const transformed = await transform(route, {
    filename: join(root, "pages/api/stripe/checkout.js"),
    jsc: { parser: { syntax: "ecmascript" }, target: "es2020" },
    module: { type: "commonjs" }
  });
  const routePath = join(root, "pages/api/stripe/checkout.js");
  const compiledRoute = new Module(routePath, module);
  compiledRoute.filename = routePath;
  compiledRoute.paths = Module._nodeModulePaths(join(root, "pages/api/stripe"));

  const originalLoad = Module._load;
  Module._load = function rejectServerOnly(request, parent, isMain) {
    if (request === "server-only") throw new Error("server-only entered the Checkout runtime chain");
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    compiledRoute._compile(transformed.code, routePath);
    assert.equal(typeof compiledRoute.exports.default, "function");
  } finally {
    Module._load = originalLoad;
  }
});

test("Checkout endpoint requires Supabase authentication and POST", () => {
  assert.match(route, /req\.method !== "POST"/);
  assert.match(route, /authenticatedClient\(req\)/);
  assert.match(route, /if \(!auth\) return res\.status\(401\)/);
});

test("Checkout rejects current Founders before creating a Stripe session", () => {
  const authorization = route.indexOf("await authorizeFounder(auth)");
  const denial = route.indexOf('authorization.allowed === true', authorization);
  const creation = route.indexOf("checkout.sessions.create", denial);
  assert.ok(authorization > -1 && denial > authorization && creation > denial);
  assert.match(route, /status\(409\)\.json\(\{ error: "subscription_already_active" \}\)/);
});

test("Checkout creation is idempotent for each subscription lifecycle", () => {
  const previousOrigin = process.env.EWA_APP_ORIGIN;
  const previousPrice = process.env.STRIPE_FOUNDER_PRICE_ID;
  process.env.EWA_APP_ORIGIN = "https://ewa.example";
  process.env.STRIPE_FOUNDER_PRICE_ID = "price_founder_server";
  try {
    const { founderCheckoutIdempotencyKey } = loadCheckoutHelper();
    assert.equal(founderCheckoutIdempotencyKey("user-1"), "founder-checkout:user-1:initial");
    assert.equal(founderCheckoutIdempotencyKey("user-1", "sub_expired"), "founder-checkout:user-1:sub_expired");
    assert.notEqual(founderCheckoutIdempotencyKey("user-1"), founderCheckoutIdempotencyKey("user-2"));
    assert.match(route, /select\("stripe_subscription_id"\)[\s\S]*\.eq\("user_id", auth\.user\.id\)/);
    assert.match(route, /\{ idempotencyKey: founderCheckoutIdempotencyKey\(auth\.user\.id, previousSubscription\?\.stripe_subscription_id\) \}/);
  } finally {
    if (previousOrigin === undefined) delete process.env.EWA_APP_ORIGIN;
    else process.env.EWA_APP_ORIGIN = previousOrigin;
    if (previousPrice === undefined) delete process.env.STRIPE_FOUNDER_PRICE_ID;
    else process.env.STRIPE_FOUNDER_PRICE_ID = previousPrice;
  }
});

test("Founder Checkout is fixed server-side with subscription mode and one item", () => {
  assert.match(checkoutHelper, /process\.env\.STRIPE_FOUNDER_PRICE_ID/);
  assert.match(checkoutHelper, /mode: "subscription"/);
  assert.match(checkoutHelper, /line_items: \[\{ price: priceId, quantity: 1 \}\]/);
  assert.doesNotMatch(route, /req\.body/);
});

test("Checkout maps the EWA user on session and subscription metadata", () => {
  assert.match(checkoutHelper, /client_reference_id: user\.id/);
  assert.match(checkoutHelper, /metadata: \{ ewa_user_id: user\.id \}/);
  assert.match(checkoutHelper, /subscription_data: \{ metadata: \{ ewa_user_id: user\.id \} \}/);
});

test("redirect URLs use only the configured canonical origin", () => {
  assert.match(checkoutHelper, /process\.env\.EWA_APP_ORIGIN/);
  assert.match(checkoutHelper, /url\.protocol !== "https:"/);
  assert.match(checkoutHelper, /success_url: `\$\{origin\}/);
  assert.match(checkoutHelper, /cancel_url: `\$\{origin\}/);
  assert.doesNotMatch(checkoutHelper + route, /req\.headers\.host|req\.body.*(?:url|origin)/i);
});

test("Founder parameters ignore browser input and use authenticated identity and server environment", () => {
  const previousOrigin = process.env.EWA_APP_ORIGIN;
  const previousPrice = process.env.STRIPE_FOUNDER_PRICE_ID;
  process.env.EWA_APP_ORIGIN = "https://ewa.example";
  process.env.STRIPE_FOUNDER_PRICE_ID = "price_founder_server";
  try {
    const { founderCheckoutParams } = loadCheckoutHelper();
    const params = founderCheckoutParams({ id: "auth-user-123", email: "user@example.com" });
    assert.deepEqual(params.line_items, [{ price: "price_founder_server", quantity: 1 }]);
    assert.equal(params.mode, "subscription");
    assert.equal(params.client_reference_id, "auth-user-123");
    assert.equal(params.metadata.ewa_user_id, "auth-user-123");
    assert.equal(params.subscription_data.metadata.ewa_user_id, "auth-user-123");
    assert.equal(params.success_url, "https://ewa.example/?checkout=success");
    assert.equal(params.cancel_url, "https://ewa.example/?checkout=cancelled");
  } finally {
    if (previousOrigin === undefined) delete process.env.EWA_APP_ORIGIN;
    else process.env.EWA_APP_ORIGIN = previousOrigin;
    if (previousPrice === undefined) delete process.env.STRIPE_FOUNDER_PRICE_ID;
    else process.env.STRIPE_FOUNDER_PRICE_ID = previousPrice;
  }
});

test("canonical origin rejects untrusted or unsafe URL forms", () => {
  const previousOrigin = process.env.EWA_APP_ORIGIN;
  const { applicationOrigin } = loadCheckoutHelper();
  try {
    for (const origin of ["http://evil.example", "https://ewa.example/path", "https://user:pass@ewa.example", "not a url"]) {
      process.env.EWA_APP_ORIGIN = origin;
      assert.throws(() => applicationOrigin(), /origin is invalid/);
    }
    process.env.EWA_APP_ORIGIN = "http://localhost:3000";
    assert.equal(applicationOrigin(), "http://localhost:3000");
  } finally {
    if (previousOrigin === undefined) delete process.env.EWA_APP_ORIGIN;
    else process.env.EWA_APP_ORIGIN = previousOrigin;
  }
});
