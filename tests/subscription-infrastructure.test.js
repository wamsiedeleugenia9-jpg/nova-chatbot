const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const migration = readFileSync(join(root, "supabase", "migrations", "20260826010000_create_stripe_subscriptions.sql"), "utf8");

test("Stripe server configuration is documented without public secret variables", () => {
  const env = readFileSync(join(root, ".env.example"), "utf8");
  for (const name of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_FOUNDER_PRICE_ID", "SUPABASE_SERVICE_ROLE_KEY"]) {
    assert.match(env, new RegExp(`^${name}=`, "m"));
    assert.doesNotMatch(env, new RegExp(`^NEXT_PUBLIC_${name}=`, "m"));
  }

  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(packageJson.dependencies.stripe, "18.5.0");
  assert.equal(packageJson.dependencies["server-only"], "0.0.1");
});

test("subscription projection is user-owned and identifies Stripe records uniquely", () => {
  assert.match(migration, /user_id uuid primary key references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /unique \(stripe_customer_id\)/);
  assert.match(migration, /unique \(stripe_subscription_id\)/);
  for (const column of ["stripe_price_id", "status", "cancel_at_period_end", "current_period_start", "current_period_end", "canceled_at", "ended_at", "created_at", "updated_at"]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`));
  }
  assert.match(migration, /create index stripe_subscriptions_status_idx/);
  assert.match(migration, /create index stripe_subscriptions_current_period_end_idx/);
});

test("subscription RLS permits own-row reads but no authenticated writes", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /for select to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(migration, /for (?:insert|update|delete) to authenticated/i);
  assert.match(migration, /revoke all on table public\.stripe_subscriptions from anon, authenticated/);
  assert.match(migration, /grant select on table public\.stripe_subscriptions to authenticated/);
});

test("privileged Supabase helper is isolated under the server directory", () => {
  const helper = readFileSync(join(root, "lib", "server", "privilegedSupabase.js"), "utf8");
  assert.doesNotMatch(helper, /require\(["']server-only["']\)/);
  assert.match(helper, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(helper, /typeof window !== "undefined"/);
  assert.doesNotMatch(helper, /NEXT_PUBLIC_/);

  const browserClient = readFileSync(join(root, "lib", "supabaseClient.js"), "utf8");
  assert.doesNotMatch(browserClient, /privilegedSupabase|SUPABASE_SERVICE_ROLE_KEY/);
});
