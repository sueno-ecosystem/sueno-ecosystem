import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { ProductEditor } from "@/components/products/ProductEditor";

export default async function ProductDetailPage({
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

  const [{ data: product }, { data: partners }, { data: pillars }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("partners").select("*").order("name", { ascending: true }),
    supabase.from("pillars").select("*").order("sort", { ascending: true }),
  ]);

  if (!product) notFound();

  return (
    <ProductEditor
      initialProduct={product}
      partners={partners ?? []}
      pillars={pillars ?? []}
      role={session.role}
    />
  );
}
