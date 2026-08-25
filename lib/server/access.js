const ADMIN_ROLE = "admin";

function isAdmin(access) {
  return access?.authenticated === true && access.role === ADMIN_ROLE;
}

async function accessFor(auth) {
  if (!auth?.client || !auth?.user?.id) {
    return { authenticated: false, role: null, userId: null };
  }

  const { data, error } = await auth.client
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) throw error;
  return {
    authenticated: true,
    role: data?.role === ADMIN_ROLE ? ADMIN_ROLE : "user",
    userId: auth.user.id
  };
}

async function requireAdmin(auth) {
  const access = await accessFor(auth);
  return isAdmin(access) ? access : null;
}

// This is the single entry point for future plan-protected features. The role is
// loaded using the authenticated user's RLS-scoped Supabase client; client
// payloads, user metadata and email addresses are deliberately not consulted.
async function authorizeFeature(auth, evaluateEntitlements) {
  const access = await accessFor(auth);
  if (!access.authenticated) return { allowed: false, access };
  if (isAdmin(access)) return { allowed: true, access };

  const allowed = typeof evaluateEntitlements === "function"
    ? await evaluateEntitlements(access.userId)
    : false;
  return { allowed: allowed === true, access };
}

module.exports = { ADMIN_ROLE, accessFor, authorizeFeature, isAdmin, requireAdmin };
