"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import type { Database, Json } from "@galene/shared";
import { formatDateTime } from "@/lib/format";
import { DataTable } from "@/components/DataTable";

type PresaleRow = Database["public"]["Tables"]["presales"]["Row"];

function readUtm(utm: Json | null, key: string): string {
  if (!utm || typeof utm !== "object" || Array.isArray(utm)) return "";
  const v = (utm as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

export function PresalesTable({
  presales,
  hasWebhookEvents,
}: {
  presales: PresaleRow[];
  hasWebhookEvents: boolean;
}) {
  const [claimFilter, setClaimFilter] = useState<"all" | "claimed" | "unclaimed">("all");

  const filtered = useMemo(() => {
    return presales.filter((p) => {
      if (claimFilter === "claimed") return Boolean(p.claimed_at);
      if (claimFilter === "unclaimed") return !p.claimed_at;
      return true;
    });
  }, [presales, claimFilter]);

  const columns = useMemo<ColumnDef<PresaleRow, unknown>[]>(
    () => [
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <span className="text-sm text-fg">{row.original.email}</span>,
      },
      {
        accessorKey: "amount_cents",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg">
            ${(row.original.amount_cents / 100).toFixed(2)}
          </span>
        ),
      },
      {
        id: "status",
        header: "State",
        cell: ({ row }) =>
          row.original.claimed_at ? (
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              Claimed
            </span>
          ) : (
            <span className="rounded border border-border bg-bg-subtle px-1.5 py-0.5 text-[11px] text-fg-muted">
              Unclaimed
            </span>
          ),
      },
      {
        id: "utm",
        header: "UTM",
        cell: ({ row }) => {
          const src = readUtm(row.original.utm, "utm_source");
          const content = readUtm(row.original.utm, "utm_content");
          return (
            <span className="font-mono text-xs text-fg-muted">
              {src || content ? `${src || "—"} / ${content || "—"}` : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Purchased",
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted">{formatDateTime(row.original.created_at)}</span>
        ),
      },
    ],
    []
  );

  function exportCsv() {
    const header = ["stripe_session_id", "email", "amount_cents", "claimed_at", "utm_source", "utm_content", "created_at"];
    const lines = [
      header.join(","),
      ...filtered.map((p) =>
        [
          p.stripe_session_id,
          JSON.stringify(p.email),
          p.amount_cents,
          p.claimed_at ?? "",
          JSON.stringify(readUtm(p.utm, "utm_source")),
          JSON.stringify(readUtm(p.utm, "utm_content")),
          p.created_at,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "galene-presales.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Pre-sales</h1>
          <p className="text-sm text-fg-muted">Founding-member $29 pre-sales.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-bg-subtle px-3 text-xs font-medium text-fg hover:bg-bg-muted disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {!hasWebhookEvents && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          Waiting for Stripe webhook — pre-sales will appear here once Stripe webhooks arrive.
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search email…"
        toolbarExtra={
          <div className="flex items-center gap-1.5">
            {(["all", "claimed", "unclaimed"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setClaimFilter(f)}
                className={`h-8 rounded-md border px-2.5 text-xs capitalize transition-colors ${
                  claimFilter === f
                    ? "border-accent bg-accent/10 font-medium text-fg"
                    : "border-border bg-bg-subtle text-fg-muted hover:text-fg"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
        emptyState={<p className="text-sm text-fg-muted">No pre-sales recorded yet.</p>}
      />
    </div>
  );
}
