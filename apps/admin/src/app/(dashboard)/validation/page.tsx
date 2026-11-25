import { createClient } from "@/lib/supabase/server";
import { ValidationDashboard } from "@/components/validation/ValidationDashboard";

export default async function ValidationPage() {
  const supabase = await createClient();

  const [{ data: waitlist }, { data: presales }] = await Promise.all([
    supabase.from("waitlist").select("id, utm, created_at").order("created_at", { ascending: false }),
    supabase
      .from("presales")
      .select("stripe_session_id, amount_cents, utm, created_at")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <ValidationDashboard
      waitlist={waitlist ?? []}
      presales={presales ?? []}
      posthogDashboardUrl={process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL || null}
      defaultSiteUrl={process.env.NEXT_PUBLIC_SITE_URL || "https://sueno.app"}
    />
  );
}
