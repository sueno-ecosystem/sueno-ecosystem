import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { PillarsManager } from "@/components/settings/PillarsManager";

export default async function PillarsPage() {
  const [supabase, session] = await Promise.all([createClient(), getAdminSession()]);
  const canEdit = session.status === "ok" && (session.role === "owner" || session.role === "editor");

  const { data: pillars } = await supabase
    .from("pillars")
    .select("*")
    .order("sort", { ascending: true });

  return <PillarsManager initialPillars={pillars ?? []} canEdit={canEdit} />;
}
