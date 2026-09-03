import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/auth";
import type { AuthRoleKey } from "@/lib/supabase/auth";

const ADMIN_ROLES = new Set<AuthRoleKey>(["admin", "manager", "staff"]);
const NOTIFICATION_TYPES = new Set(["Order Update", "Promotion", "Wishlist", "Account", "System"]);

async function requireAdmin() {
  const client = await getSupabaseServerClient();
  if (!client) return { error: "Supabase is not configured.", status: 503 as const };
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return { error: "Authentication required.", status: 401 as const };
  const { data: role, error: roleError } = await client.rpc("current_user_role_key");
  const roleKey = (role as AuthRoleKey | null) ?? null;
  if (roleError || !roleKey || !isAdminRole(roleKey) || !ADMIN_ROLES.has(roleKey)) {
    return { error: "Admin permission required.", status: 403 as const };
  }
  const admin = getSupabaseAdminClient();
  if (!admin) return { error: "Server notification service is not configured.", status: 503 as const };
  return { client, admin, user, status: 200 as const };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validActionUrl(value: string) {
  return value === "" || (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"));
}

async function customerIds(admin: ReturnType<typeof getSupabaseAdminClient>) {
  if (!admin) return [] as string[];
  const [rolesResult, profilesResult, membershipsResult] = await Promise.all([
    admin.from("roles").select("id, key").in("key", ["customer", "admin", "manager", "staff"]).is("deleted_at", null),
    admin.from("profiles").select("id, role_id, status, deleted_at").is("deleted_at", null).eq("status", "active"),
    admin.from("profile_roles").select("profile_id, role_id, deleted_at").is("deleted_at", null),
  ]);
  const logQueryError = (label: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) => {
    if (!error) return;
    console.error(`[notification recipient resolver] ${label} query failed`, {
      message: error.message ?? "",
      code: error.code ?? "",
      details: error.details ?? "",
      hint: error.hint ?? "",
    });
  };
  logQueryError("roles", rolesResult.error);
  logQueryError("profiles", profilesResult.error);
  logQueryError("profile_roles", membershipsResult.error);
  if (rolesResult.error || profilesResult.error || membershipsResult.error) throw new Error("Unable to resolve customer recipients.");
  const roleKeyById = new Map((rolesResult.data ?? []).map((row) => [String(row.id), String(row.key)]));
  const adminKeys = new Set(["admin", "manager", "staff"]);
  const customerRoleIds = new Set((rolesResult.data ?? []).filter((row) => row.key === "customer").map((row) => String(row.id)));
  const membershipRoles = new Map<string, string[]>();
  for (const row of membershipsResult.data ?? []) {
    const current = membershipRoles.get(String(row.profile_id)) ?? [];
    current.push(roleKeyById.get(String(row.role_id)) ?? "");
    membershipRoles.set(String(row.profile_id), current);
  }
  return (profilesResult.data ?? [])
    .filter((profile) => {
      const primary = profile.role_id ? roleKeyById.get(String(profile.role_id)) : null;
      const assigned = membershipRoles.get(String(profile.id)) ?? [];
      if (primary && adminKeys.has(primary)) return false;
      if (assigned.some((key) => adminKeys.has(key))) return false;
      return !primary || customerRoleIds.has(String(profile.role_id)) || assigned.includes("customer");
    })
    .map((profile) => String(profile.id));
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { data, error } = await auth.admin.from("profiles").select("id, full_name, email, role_id, status, deleted_at").is("deleted_at", null).eq("status", "active").order("full_name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const roles = await auth.admin.from("roles").select("id, key").is("deleted_at", null);
    const roleById = new Map((roles.data ?? []).map((row) => [String(row.id), String(row.key)]));
    const customers = (data ?? []).filter((row) => !row.role_id || roleById.get(String(row.role_id)) === "customer").map((row) => ({ id: String(row.id), name: String(row.full_name ?? "").trim() || String(row.email ?? "Customer"), email: String(row.email ?? "") }));
    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load customers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await request.json() as Record<string, unknown>;
    const title = text(body.title);
    const message = text(body.message);
    const type = text(body.type);
    const target = text(body.target);
    const userId = text(body.userId);
    const actionLabel = text(body.actionLabel);
    const actionUrl = text(body.actionUrl);
    if (!title || !message || !NOTIFICATION_TYPES.has(type) || !["specific", "all_customers"].includes(target)) return NextResponse.json({ error: "Title, message, type, and recipient are required." }, { status: 400 });
    if (title.length > 160 || message.length > 4000 || actionLabel.length > 80 || actionUrl.length > 500) return NextResponse.json({ error: "One or more fields exceed the allowed length." }, { status: 400 });
    if (!validActionUrl(actionUrl)) return NextResponse.json({ error: "Action URL must be a safe relative path such as /products." }, { status: 400 });
    const recipients = target === "specific" ? (userId ? [userId] : []) : await customerIds(auth.admin);
    if (recipients.length === 0) return NextResponse.json({ error: target === "specific" ? "Select a customer." : "No active customer recipients found." }, { status: 400 });
    if (target === "specific" && !(await customerIds(auth.admin)).includes(userId)) return NextResponse.json({ error: "Selected recipient is not an active customer." }, { status: 400 });
    const { error } = await auth.admin.from("notifications").insert(recipients.map((recipientId) => ({ user_id: recipientId, title, message, type, action_label: actionLabel || null, action_url: actionUrl || null, metadata: { created_by: auth.user.id, target } })));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ created: recipients.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create notification." }, { status: 500 });
  }
}
