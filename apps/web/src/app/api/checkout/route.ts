import Stripe from "stripe";
import { captureServerEvent } from "@/lib/posthog-server";
import { cleanUtm } from "@/lib/utm";

// Founding-member pre-sale (one-time payment). No login required here on purpose:
// buyers claim their membership later via a magic link sent to the purchase email.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_PRESALE;
  if (!secret || !price) {
    return Response.json({ error: "Checkout isn't set up yet." }, { status: 503 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  const parsed = body as { utm?: unknown; distinct_id?: unknown };
  const utm = cleanUtm(parsed?.utm);
  const distinctId =
    typeof parsed?.distinct_id === "string" && parsed.distinct_id.length > 0
      ? parsed.distinct_id.slice(0, 128)
      : undefined;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      customer_creation: "always",
      success_url: `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1#founding`,
      metadata: {
        kind: "presale",
        ...utm,
        ...(distinctId ? { distinct_id: distinctId } : {}),
      },
    });

    await captureServerEvent(distinctId, "checkout_session_created", {
      amount: session.amount_total ?? 2900,
      ...utm,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("checkout error", err);
    return Response.json({ error: "Couldn't start checkout. Try again." }, { status: 500 });
  }
}
