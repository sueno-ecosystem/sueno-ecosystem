import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { PartnerEditor } from "@/components/partners/PartnerEditor";

export default async function PartnerDetailPage({
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
  const canEdit = session.role === "owner" || session.role === "editor";

  const [{ data: partner }, dealResult, { data: products }] = await Promise.all([
    supabase.from("partners").select("*").eq("id", id).single(),
    canEdit
      ? supabase.from("partner_deals").select("*").eq("partner_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("products").select("*").eq("partner_id", id).order("sort", { ascending: true }),
  ]);

  if (!partner) notFound();

  return (
    <PartnerEditor
      initialPartner={partner}
      initialDeal={dealResult.data}
      products={products ?? []}
      role={session.role}
    />
  );
}
