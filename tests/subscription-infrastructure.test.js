const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

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
  assert.match(helper, /process\.env\.SUPABASE_URL \|\| process\.env\.NEXT_PUBLIC_SUPABASE_URL/);

  const browserClient = readFileSync(join(root, "lib", "supabaseClient.js"), "utf8");
  assert.doesNotMatch(browserClient, /privilegedSupabase|SUPABASE_SERVICE_ROLE_KEY/);
});

test("privileged Supabase uses the public project URL when no server URL alias exists", () => {
  const helperPath = join(root, "lib", "server", "privilegedSupabase.js");
  const script = `
    const Module = require("node:module");
    const originalLoad = Module._load;
    Module._load = (request, parent, isMain) => request === "@supabase/supabase-js"
      ? { createClient: (...args) => ({ args }) }
      : originalLoad(request, parent, isMain);
    delete process.env.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    const client = require(${JSON.stringify(helperPath)}).getPrivilegedSupabase();
    process.stdout.write(JSON.stringify(client.args));
  `;
  const result = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  const [url, key, options] = JSON.parse(result.stdout);
  assert.equal(url, "https://project.supabase.co");
  assert.equal(key, "service-role-secret");
  assert.deepEqual(options, { auth: { persistSession: false, autoRefreshToken: false } });
});
