import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { BundleEditor } from "@/components/bundles/BundleEditor";

export default async function BundleDetailPage({
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

  const [
    { data: bundle },
    { data: pillars },
    { data: allProducts },
    { data: bundleItems },
    { data: triggerTags },
    { data: weights },
  ] = await Promise.all([
    supabase.from("bundles").select("*").eq("id", id).single(),
    supabase.from("pillars").select("*").order("sort", { ascending: true }),
    supabase.from("products").select("*").order("name", { ascending: true }),
    supabase.from("bundle_items").select("*").eq("bundle_id", id).order("sort", { ascending: true }),
    supabase.from("trigger_tags").select("*").order("sort", { ascending: true }),
    supabase.from("bundle_tag_weights").select("*").eq("bundle_id", id),
  ]);

  if (!bundle) notFound();

  return (
    <BundleEditor
      initialBundle={bundle}
      pillars={pillars ?? []}
      allProducts={allProducts ?? []}
      initialItems={bundleItems ?? []}
      triggerTags={triggerTags ?? []}
      initialWeights={weights ?? []}
      role={session.role}
    />
  );
}
