"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import type { Database } from "@sueno/shared";
import { formatDateTime } from "@/lib/format";
import { DataTable } from "@/components/DataTable";

type SubRow = Database["public"]["Tables"]["subscriptions"]["Row"];

const STATUS_FILTERS = ["all", "active", "trialing", "past_due", "canceled"] as const;

export function MembersTable({
  subscriptions,
  hasWebhookEvents,
}: {
  subscriptions: SubRow[];
  hasWebhookEvents: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const filtered = useMemo(
    () => subscriptions.filter((s) => statusFilter === "all" || s.status === statusFilter),
    [subscriptions, statusFilter]
  );

  const columns = useMemo<ColumnDef<SubRow, unknown>[]>(
    () => [
      {
        accessorKey: "user_id",
        header: "User ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg">{row.original.user_id}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="rounded border border-border bg-bg-subtle px-1.5 py-0.5 text-[11px] capitalize text-fg">
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => (
          <span className="text-xs capitalize text-fg-muted">{row.original.provider}</span>
        ),
      },
      {
        accessorKey: "price_id",
        header: "Plan / Price",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg-muted">
            {row.original.price_id ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "current_period_end",
        header: "Period end",
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted">
            {formatDateTime(row.original.current_period_end)}
          </span>
        ),
      },
      {
        accessorKey: "cancel_at_period_end",
        header: "Auto-renew",
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted">
            {row.original.cancel_at_period_end ? "Canceling" : "Active"}
          </span>
        ),
      },
      {
        id: "stripe",
        header: "Stripe",
        cell: ({ row }) =>
          row.original.provider_customer_id ? (
            <a
              href={`https://dashboard.stripe.com/customers/${row.original.provider_customer_id}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <span>Customer</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-xs text-fg-muted">—</span>
          ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-fg-muted">
          Read-only subscription records. No card or payment details are stored.
        </p>
      </div>

      {!hasWebhookEvents && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          Waiting for Stripe webhook — subscriptions will appear here once Stripe webhooks arrive.
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search user ID or price…"
        toolbarExtra={
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`h-8 rounded-md border px-2.5 text-xs capitalize transition-colors ${
                  statusFilter === s
                    ? "border-accent bg-accent/10 font-medium text-fg"
                    : "border-border bg-bg-subtle text-fg-muted hover:text-fg"
                }`}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        }
        emptyState={<p className="text-sm text-fg-muted">No subscriptions recorded yet.</p>}
      />
    </div>
  );
}
