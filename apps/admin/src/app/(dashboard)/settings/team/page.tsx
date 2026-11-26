import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { TeamManager } from "@/components/settings/TeamManager";

export default async function TeamSettingsPage() {
  const [supabase, session] = await Promise.all([createClient(), getAdminSession()]);
  if (session.status !== "ok") notFound();

  const { data: admins } = await supabase
    .from("admins")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <TeamManager
      initialAdmins={admins ?? []}
      currentUserId={session.userId}
      currentRole={session.role}
    />
  );
}
