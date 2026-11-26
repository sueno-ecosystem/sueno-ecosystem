import Stripe from "stripe";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { publicMediaUrl } from "@/lib/format";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { PlansEditor, type R2ImageOption, type StripePlanItem } from "@/components/settings/PlansEditor";

export default async function PlansSettingsPage() {
  const [supabase, session] = await Promise.all([createClient(), getAdminSession()]);
  if (session.status !== "ok" || session.role !== "owner") {
    redirect("/");
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return (
      <PlaceholderPage
        title="Plans & Checkout"
        description="Manage Stripe membership & pre-sale product metadata and R2 checkout images."
        notice="Stripe not configured. Add STRIPE_SECRET_KEY in apps/admin/.env.local to manage plans."
      />
    );
  }

  const stripe = new Stripe(secret);
  const [pricesRes, { data: products }, { data: bundles }] = await Promise.all([
    stripe.prices.list({ expand: ["data.product"], limit: 20 }),
    supabase.from("products").select("name, image_key").not("image_key", "is", null),
    supabase.from("bundles").select("title, hero_image_key").not("hero_image_key", "is", null),
  ]);

  const plans: StripePlanItem[] = pricesRes.data
    .filter((p) => typeof p.product === "object" && p.product !== null && !("deleted" in p.product && p.product.deleted))
    .map((p) => {
      const prod = p.product as Stripe.Product;
      return {
        priceId: p.id,
        productId: prod.id,
        productName: prod.name,
        productDescription: prod.description ?? "",
        productImage: prod.images?.[0] ?? null,
        unitAmount: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval ?? null,
        active: p.active,
      };
    });

  const r2Images: R2ImageOption[] = [
    ...(products ?? []).flatMap((p) => {
      const url = publicMediaUrl(p.image_key);
      return url && p.image_key ? [{ label: `Product: ${p.name}`, key: p.image_key, url }] : [];
    }),
    ...(bundles ?? []).flatMap((b) => {
      const url = publicMediaUrl(b.hero_image_key);
      return url && b.hero_image_key
        ? [{ label: `Bundle: ${b.title}`, key: b.hero_image_key, url }]
        : [];
    }),
  ];

  return <PlansEditor plans={plans} r2Images={r2Images} />;
}
