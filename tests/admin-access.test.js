const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { accessFor, authorizeFeature, isAdmin, requireAdmin } = require("../lib/server/access");
const { authenticatedClient } = require("../lib/server/supabase");

function authWithRole(role, observed = {}) {
  return {
    user: { id: "server-verified-user", email: "ignored@example.test", user_metadata: { role: "admin" } },
    client: {
      from(table) {
        observed.table = table;
        return {
          select(columns) {
            observed.columns = columns;
            return {
              eq(column, value) {
                observed.filter = [column, value];
                return { maybeSingle: async () => ({ data: role ? { role } : null, error: null }) };
              }
            };
          }
        };
      }
    }
  };
}

test("admin receives full access without evaluating subscription entitlements", async () => {
  let entitlementChecks = 0;
  const result = await authorizeFeature(authWithRole("admin"), async () => {
    entitlementChecks += 1;
    return false;
  });
  assert.equal(result.allowed, true);
  assert.equal(isAdmin(result.access), true);
  assert.equal(entitlementChecks, 0);
  assert.ok(await requireAdmin(authWithRole("admin")));
});

test("normal authenticated users are not admins and require entitlements", async () => {
  const access = await accessFor(authWithRole(null));
  assert.equal(isAdmin(access), false);
  assert.equal(access.role, "user");
  assert.equal(await requireAdmin(authWithRole("user")), null);
  assert.equal((await authorizeFeature(authWithRole("user"), async () => false)).allowed, false);
});

test("unauthenticated requests cannot obtain admin privileges", async () => {
  assert.deepEqual(await accessFor(null), { authenticated: false, role: null, userId: null });
  assert.equal((await authorizeFeature(null, async () => true)).allowed, false);
  assert.equal(await requireAdmin(null), null);
  assert.equal(await authenticatedClient({ headers: {} }), null);
});

test("admin status comes only from the server-side role lookup", async () => {
  const observed = {};
  const auth = authWithRole("user", observed);
  auth.role = "admin";
  auth.user.app_metadata = { role: "admin" };
  const result = await authorizeFeature(auth, async () => false, { role: "admin", isAdmin: true });
  assert.equal(result.allowed, false);
  assert.equal(isAdmin(result.access), false);
  assert.deepEqual(observed, {
    table: "user_roles",
    columns: "role",
    filter: ["user_id", "server-verified-user"]
  });
});

test("role migration permits self-read but prevents client role writes", () => {
  const migration = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260825010000_create_user_roles.sql"), "utf8");
  assert.match(migration, /references auth\.users\(id\) on delete cascade/i);
  assert.match(migration, /check \(role in \('user', 'admin'\)\)/i);
  assert.match(migration, /for select to authenticated[\s\S]*auth\.uid\(\).*user_id/i);
  assert.match(migration, /revoke all on table public\.user_roles from anon, authenticated/i);
  assert.doesNotMatch(migration, /for (insert|update|delete) to authenticated/i);
});
