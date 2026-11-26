import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { TagsManager } from "@/components/settings/TagsManager";

export default async function TagsPage() {
  const [supabase, session] = await Promise.all([createClient(), getAdminSession()]);
  const canEdit = session.status === "ok" && (session.role === "owner" || session.role === "editor");

  const [{ data: tags }, { data: pillars }] = await Promise.all([
    supabase.from("trigger_tags").select("*").order("sort", { ascending: true }),
    supabase.from("pillars").select("*").order("sort", { ascending: true }),
  ]);

  return (
    <TagsManager
      initialTags={tags ?? []}
      pillars={pillars ?? []}
      canEdit={canEdit}
    />
  );
}
