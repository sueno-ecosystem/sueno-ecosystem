import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { BundlesTable, type BundleListItem } from "@/components/bundles/BundlesTable";

export default async function BundlesPage() {
  const [supabase, session] = await Promise.all([createClient(), getAdminSession()]);
  const canEdit = session.status === "ok" && (session.role === "owner" || session.role === "editor");

  const [{ data: bundles }, { data: bundleItems }, { data: pillars }] = await Promise.all([
    supabase.from("bundles").select("*").order("sort", { ascending: true }).order("updated_at", { ascending: false }),
    supabase.from("bundle_items").select("bundle_id"),
    supabase.from("pillars").select("*").order("sort", { ascending: true }),
  ]);

  const countMap = new Map<string, number>();
  for (const item of bundleItems ?? []) {
    countMap.set(item.bundle_id, (countMap.get(item.bundle_id) ?? 0) + 1);
  }

  const items: BundleListItem[] = (bundles ?? []).map((b) => ({
    ...b,
    itemCount: countMap.get(b.id) ?? 0,
  }));

  return <BundlesTable initialBundles={items} pillars={pillars ?? []} canEdit={canEdit} />;
}
