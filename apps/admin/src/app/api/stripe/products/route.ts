import Stripe from "stripe";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: role } = await supabase.rpc("admin_role");
  if (role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    productId?: string;
    name?: string;
    description?: string;
    imageUrl?: string | null;
  } | null;

  if (!body?.productId || !body.name?.trim()) {
    return Response.json({ error: "productId and name are required" }, { status: 400 });
  }

  try {
    const stripe = new Stripe(secret);
    const prev = await stripe.products.retrieve(body.productId);
    const updated = await stripe.products.update(body.productId, {
      name: body.name.trim(),
      description: body.description?.trim() || undefined,
      ...(body.imageUrl ? { images: [body.imageUrl] } : {}),
    });

    await supabase.rpc("log_stripe_product_audit" as never, {
      p_row_id: updated.id,
      p_old: {
        name: prev.name,
        description: prev.description,
        images: prev.images,
      },
      p_new: {
        name: updated.name,
        description: updated.description,
        images: updated.images,
      },
    } as never);

    return Response.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      images: updated.images,
    });
  } catch (err) {
    console.error("stripe product update error", err);
    return Response.json({ error: "Failed to update Stripe product" }, { status: 500 });
  }
}
