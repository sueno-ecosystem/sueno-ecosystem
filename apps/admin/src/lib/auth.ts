import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminRole = "owner" | "editor" | "reviewer";

export type AdminSessionResult =
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | { status: "unauthorized"; userId: string; email: string | null }
  | { status: "ok"; userId: string; email: string | null; role: AdminRole };

/**
 * Verifies the current Supabase session and checks public.is_admin() + public.admin_role()
 * using the signed-in user's session (no service role key).
 */
export async function getAdminSession(): Promise<AdminSessionResult> {
  if (!isSupabaseConfigured()) {
    return { status: "unconfigured" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "unauthenticated" };
  }

  const [{ data: isAdmin }, { data: role }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("admin_role"),
  ]);

  if (!isAdmin || (role !== "owner" && role !== "editor" && role !== "reviewer")) {
    return {
      status: "unauthorized",
      userId: user.id,
      email: user.email ?? null,
    };
  }

  return {
    status: "ok",
    userId: user.id,
    email: user.email ?? null,
    role,
  };
}
