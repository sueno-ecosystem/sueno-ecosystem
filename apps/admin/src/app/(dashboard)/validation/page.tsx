import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { ValidationDashboard } from "@/components/validation/ValidationDashboard";

export default async function ValidationPage() {
  const [supabase, session] = await Promise.all([createClient(), getAdminSession()]);
  const isOwner = session.status === "ok" && session.role === "owner";

  const [{ data: waitlist }, presalesResult] = await Promise.all([
    supabase.from("waitlist").select("id, utm, created_at").order("created_at", { ascending: false }),
    isOwner
      ? supabase
          .from("presales")
          .select("stripe_session_id, amount_cents, utm, created_at")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <ValidationDashboard
      waitlist={waitlist ?? []}
      presales={presalesResult.data ?? []}
      isOwner={isOwner}
      posthogDashboardUrl={process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL || null}
      defaultSiteUrl={process.env.NEXT_PUBLIC_SITE_URL || "https://sueno.app"}
    />
  );
}
