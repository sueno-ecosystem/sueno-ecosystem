import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { VideoEditor } from "@/components/videos/VideoEditor";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, supabase, session] = await Promise.all([
    params,
    createClient(),
    getAdminSession(),
  ]);

  if (session.status !== "ok") notFound();

  const [{ data: video }, { data: pillars }, { data: triggerTags }, { data: videoTags }] =
    await Promise.all([
      supabase.from("videos").select("*").eq("id", id).single(),
      supabase.from("pillars").select("*").order("sort", { ascending: true }),
      supabase.from("trigger_tags").select("*").order("sort", { ascending: true }),
      supabase.from("video_tags").select("tag_slug").eq("video_id", id),
    ]);

  if (!video) notFound();

  return (
    <VideoEditor
      initialVideo={video}
      pillars={pillars ?? []}
      triggerTags={triggerTags ?? []}
      initialTagSlugs={(videoTags ?? []).map((t) => t.tag_slug)}
      role={session.role}
    />
  );
}
