import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { ProductsTable } from "@/components/products/ProductsTable";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const [supabase, session, params] = await Promise.all([
    createClient(),
    getAdminSession(),
    searchParams,
  ]);

  const [{ data: products }, { data: partners }, { data: pillars }] = await Promise.all([
    supabase.from("products").select("*").order("sort", { ascending: true }).order("updated_at", { ascending: false }),
    supabase.from("partners").select("*").order("name", { ascending: true }),
    supabase.from("pillars").select("*").order("sort", { ascending: true }),
  ]);

  const canEdit = session.status === "ok" && (session.role === "owner" || session.role === "editor");

  return (
    <ProductsTable
      initialProducts={products ?? []}
      partners={partners ?? []}
      pillars={pillars ?? []}
      canEdit={canEdit}
      openNewOnMount={params.new === "1"}
    />
  );
}
