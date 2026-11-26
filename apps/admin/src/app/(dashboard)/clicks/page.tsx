import { createClient } from "@/lib/supabase/server";
import { ClicksDashboard, type ClickAggregateInput } from "@/components/growth/ClicksDashboard";

export default async function ClicksPage() {
  const supabase = await createClient();

  const [{ data: clicks }, { data: products }, { data: bundles }] = await Promise.all([
    supabase
      .from("outbound_clicks")
      .select("id, product_id, bundle_id, source, platform, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("products").select("id, name"),
    supabase.from("bundles").select("id, title"),
  ]);

  const prodMap = new Map((products ?? []).map((p) => [p.id, p.name]));
  const bundleMap = new Map((bundles ?? []).map((b) => [b.id, b.title]));

  const rows: ClickAggregateInput[] = (clicks ?? []).map((c) => ({
    id: c.id,
    targetType: c.bundle_id ? "bundle" : "product",
    targetName:
      (c.bundle_id ? bundleMap.get(c.bundle_id) : c.product_id ? prodMap.get(c.product_id) : null) ??
      c.bundle_id ??
      c.product_id ??
      "Unknown",
    source: c.source,
    platform: c.platform,
    createdAt: c.created_at,
  }));

  return <ClicksDashboard rows={rows} />;
}
