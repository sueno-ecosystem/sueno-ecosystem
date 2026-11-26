import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";

export default async function RevenueOverviewPage() {
  const [supabase, session] = await Promise.all([createClient(), getAdminSession()]);
  if (session.status !== "ok" || session.role !== "owner") {
    redirect("/");
  }

  const [{ data: subscriptions }, { data: presales }, { data: events }] = await Promise.all([
    supabase.from("subscriptions").select("user_id, status, provider, cancel_at_period_end, updated_at"),
    supabase.from("presales").select("stripe_session_id, amount_cents, claimed_at"),
    supabase.from("stripe_events").select("id").limit(1),
  ]);

  const subs = subscriptions ?? [];
  const sales = presales ?? [];
  const webhookActive = (events ?? []).length > 0;

  const activeMembers = subs.filter((s) => s.status === "active" || s.status === "trialing").length;
  const failedPayments = subs.filter((s) => s.status === "past_due" || s.status === "unpaid").length;
  const canceledCount = subs.filter((s) => s.status === "canceled" || s.cancel_at_period_end).length;
  const mrrDollars = activeMembers * 19;

  const presaleTotalDollars = sales.reduce((acc, p) => acc + p.amount_cents, 0) / 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Revenue</h1>
          <p className="text-sm text-fg-muted">
            Read-only subscription and pre-sale metrics from Supabase.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/revenue/members"
            className="rounded-md border border-border bg-bg-subtle px-3 py-1.5 font-medium text-fg hover:bg-bg-muted"
          >
            Members
          </Link>
          <Link
            href="/revenue/presales"
            className="rounded-md border border-border bg-bg-subtle px-3 py-1.5 font-medium text-fg hover:bg-bg-muted"
          >
            Pre-sales
          </Link>
        </div>
      </div>

      {!webhookActive && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          Waiting for Stripe webhook — no Stripe events have been recorded in{" "}
          <code className="font-mono">stripe_events</code> yet.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-xs text-fg-muted">Active members</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{activeMembers}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-xs text-fg-muted">Estimated MRR</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">${mrrDollars}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-xs text-fg-muted">Pre-sales</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {sales.length}{" "}
            <span className="font-mono text-sm font-normal text-fg-muted">
              (${presaleTotalDollars.toFixed(0)})
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-xs text-fg-muted">Canceling / Canceled</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{canceledCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-xs text-fg-muted">Failed payments</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{failedPayments}</p>
        </div>
      </div>
    </div>
  );
}
