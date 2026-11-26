import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { MembersTable } from "@/components/revenue/MembersTable";

export default async function RevenueMembersPage() {
  const [supabase, session] = await Promise.all([createClient(), getAdminSession()]);
  if (session.status !== "ok" || session.role !== "owner") {
    redirect("/");
  }

  const [{ data: subscriptions }, { data: events }] = await Promise.all([
    supabase.from("subscriptions").select("*").order("updated_at", { ascending: false }),
    supabase.from("stripe_events").select("id").limit(1),
  ]);

  return (
    <MembersTable
      subscriptions={subscriptions ?? []}
      hasWebhookEvents={(events ?? []).length > 0}
    />
  );
}
