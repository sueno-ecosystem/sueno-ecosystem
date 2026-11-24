# stripe-webhook (to build in week 0/1)

Spec (give this to Antigravity):
- Verify signature with `stripe.webhooks.constructEventAsync` + `STRIPE_WEBHOOK_SECRET`.
- Insert `event.id` into `stripe_events`; on conflict return 200 (idempotent).
- `checkout.session.completed`: mode=payment → upsert `presales`; mode=subscription → user from `client_reference_id`.
- `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`:
  re-fetch the subscription from Stripe and upsert `subscriptions`. Never trust event order.
- Service role key only. Set `processed_at`. 400 on bad signature, 500 on failure (Stripe retries).
- Test with `stripe listen` + `stripe trigger`.
