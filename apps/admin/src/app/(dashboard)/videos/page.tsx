import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { VideosTable } from "@/components/videos/VideosTable";

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const [supabase, session, params] = await Promise.all([
    createClient(),
    getAdminSession(),
    searchParams,
  ]);

  const [{ data: videos }, { data: pillars }] = await Promise.all([
    supabase.from("videos").select("*").order("sort", { ascending: true }).order("updated_at", { ascending: false }),
    supabase.from("pillars").select("*").order("sort", { ascending: true }),
  ]);

  const canEdit = session.status === "ok" && (session.role === "owner" || session.role === "editor");

  return (
    <VideosTable
      initialVideos={videos ?? []}
      pillars={pillars ?? []}
      canEdit={canEdit}
      openNewOnMount={params.new === "1"}
    />
  );
}
