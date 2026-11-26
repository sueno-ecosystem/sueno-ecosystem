import Stripe from "npm:stripe@17";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "distinct_id"] as const;

function pickUtm(meta: Stripe.Metadata | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!meta) return out;
  for (const k of UTM_KEYS) {
    const v = meta[k];
    if (typeof v === "string" && v.length > 0) out[k] = v.slice(0, 128);
  }
  return out;
}

async function capturePostHog(
  distinctId: string,
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  const key = Deno.env.get("POSTHOG_KEY");
  if (!key) return;
  const host = (Deno.env.get("POSTHOG_HOST") || "https://us.i.posthog.com").replace(/\/+$/, "");

  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(properties)) {
    if (k === "email" || k === "name") continue;
    safe[k] = v;
  }

  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: safe,
      }),
    });
  } catch (err) {
    console.error("[stripe-webhook] posthog error", err);
  }
}

async function upsertSubscriptionFromStripe(
  stripe: Stripe,
  supabase: SupabaseClient,
  subscriptionId: string,
  explicitUserId?: string | null
): Promise<void> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  const periodEndUnix = (sub as unknown as { current_period_end?: number }).current_period_end;
  const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

  const userId = explicitUserId ?? (sub.metadata?.user_id || null);

  if (userId) {
    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        provider: "stripe",
        status: sub.status,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: sub.cancel_at_period_end,
        provider_customer_id: customerId,
        provider_subscription_id: sub.id,
        price_id: priceId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: sub.status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      provider_customer_id: customerId,
      price_id: priceId,
      updated_at: new Date().toISOString(),
    })
    .eq("provider_subscription_id", sub.id);

  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    console.error("[stripe-webhook] missing required environment variables");
    return new Response("Server not configured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(stripeKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  console.log(`[stripe-webhook] ${event.type} ${event.id}`);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Idempotency: insert event.id first; on conflict return 200 and stop.
  const { error: insertErr } = await supabase
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return Response.json({ received: true, duplicate: true }, { status: 200 });
    }
    console.error(`[stripe-webhook] stripe_events insert failed ${event.id}`);
    return new Response("Database error", { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment" && session.metadata?.kind === "presale") {
          const email = (
            session.customer_details?.email ??
            session.customer_email ??
            ""
          )
            .trim()
            .toLowerCase();
          const utm = pickUtm(session.metadata);
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;

          const { error } = await supabase.from("presales").upsert(
            {
              stripe_session_id: session.id,
              email,
              amount_cents: session.amount_total ?? 0,
              utm,
              stripe_payment_intent_id: paymentIntentId,
            },
            { onConflict: "stripe_session_id" }
          );
          if (error) throw error;

          await capturePostHog(utm.distinct_id || session.id, "presale_paid", {
            amount_cents: session.amount_total ?? 0,
            ...utm,
          });
        } else if (session.mode === "subscription") {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;
          if (subId) {
            await upsertSubscriptionFromStripe(
              stripe,
              supabase,
              subId,
              session.client_reference_id
            );
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscriptionFromStripe(stripe, supabase, sub.id);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null;
          parent?: { subscription_details?: { subscription?: string | { id: string } } };
        };
        const rawSub =
          invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null;
        const subId = typeof rawSub === "string" ? rawSub : rawSub?.id ?? null;
        if (subId) {
          await upsertSubscriptionFromStripe(stripe, supabase, subId);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge & {
          invoice?: string | { id: string } | null;
        };
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id ?? null;

        if (piId) {
          const refundedAt = new Date().toISOString();
          const { data: updated, error } = await supabase
            .from("presales")
            .update({ refunded_at: refundedAt })
            .eq("stripe_payment_intent_id", piId)
            .select("stripe_session_id");
          if (error) throw error;

          if (!updated || updated.length === 0) {
            const sessions = await stripe.checkout.sessions.list({
              payment_intent: piId,
              limit: 1,
            });
            const sessionId = sessions.data[0]?.id;
            if (sessionId) {
              const { error: fallbackErr } = await supabase
                .from("presales")
                .update({ refunded_at: refundedAt, stripe_payment_intent_id: piId })
                .eq("stripe_session_id", sessionId);
              if (fallbackErr) throw fallbackErr;
            }
          }
        }

        const invoiceId =
          typeof charge.invoice === "string" ? charge.invoice : charge.invoice?.id ?? null;
        if (invoiceId) {
          const inv = (await stripe.invoices.retrieve(invoiceId)) as Stripe.Invoice & {
            subscription?: string | { id: string } | null;
          };
          const subId =
            typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id ?? null;
          if (subId) {
            await upsertSubscriptionFromStripe(stripe, supabase, subId);
          }
        }
        break;
      }

      default:
        break;
    }

    await supabase
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);

    return Response.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error(`[stripe-webhook] failed ${event.type} ${event.id}`, err);
    return new Response("Processing failed", { status: 500 });
  }
});
