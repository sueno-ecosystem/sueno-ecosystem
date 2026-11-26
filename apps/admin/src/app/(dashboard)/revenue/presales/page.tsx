import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { PresalesTable } from "@/components/revenue/PresalesTable";

export default async function RevenuePresalesPage() {
  const [supabase, session] = await Promise.all([createClient(), getAdminSession()]);
  if (session.status !== "ok" || session.role !== "owner") {
    redirect("/");
  }

  const [{ data: presales }, { data: events }] = await Promise.all([
    supabase.from("presales").select("*").order("created_at", { ascending: false }),
    supabase.from("stripe_events").select("id").limit(1),
  ]);

  return (
    <PresalesTable
      presales={presales ?? []}
      hasWebhookEvents={(events ?? []).length > 0}
    />
  );
}
