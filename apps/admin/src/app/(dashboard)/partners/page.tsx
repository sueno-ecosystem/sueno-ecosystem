import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { PartnersTable, type PartnerListItem } from "@/components/partners/PartnersTable";

export default async function PartnersPage() {
  const [supabase, session] = await Promise.all([createClient(), getAdminSession()]);
  const canEdit = session.status === "ok" && (session.role === "owner" || session.role === "editor");

  const [{ data: partners }, { data: products }, dealsResult] = await Promise.all([
    supabase.from("partners").select("*").order("name", { ascending: true }),
    supabase.from("products").select("id, partner_id"),
    canEdit ? supabase.from("partner_deals").select("*") : Promise.resolve({ data: [] }),
  ]);

  const countByPartner = new Map<string, number>();
  for (const p of products ?? []) {
    countByPartner.set(p.partner_id, (countByPartner.get(p.partner_id) ?? 0) + 1);
  }

  const dealByPartner = new Map((dealsResult.data ?? []).map((d) => [d.partner_id, d]));

  const items: PartnerListItem[] = (partners ?? []).map((p) => ({
    ...p,
    productCount: countByPartner.get(p.id) ?? 0,
    deal: dealByPartner.get(p.id) ?? null,
  }));

  return <PartnersTable initialPartners={items} canEdit={canEdit} />;
}
