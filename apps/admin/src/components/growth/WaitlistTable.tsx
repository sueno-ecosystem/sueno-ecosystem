"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import type { Database, Json } from "@sueno/shared";
import { formatDateTime } from "@/lib/format";
import { DataTable } from "@/components/DataTable";

type WaitlistRow = Database["public"]["Tables"]["waitlist"]["Row"];

function readUtm(utm: Json | null, key: string): string {
  if (!utm || typeof utm !== "object" || Array.isArray(utm)) return "";
  const v = (utm as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

export function WaitlistTable({ rows }: { rows: WaitlistRow[] }) {
  const [sourceFilter, setSourceFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");

  const sources = useMemo(
    () => Array.from(new Set(rows.map((r) => readUtm(r.utm, "utm_source")).filter(Boolean))),
    [rows]
  );
  const campaigns = useMemo(
    () => Array.from(new Set(rows.map((r) => readUtm(r.utm, "utm_campaign")).filter(Boolean))),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (sourceFilter !== "all" && readUtm(r.utm, "utm_source") !== sourceFilter) return false;
      if (campaignFilter !== "all" && readUtm(r.utm, "utm_campaign") !== campaignFilter) return false;
      return true;
    });
  }, [rows, sourceFilter, campaignFilter]);

  const columns = useMemo<ColumnDef<WaitlistRow, unknown>[]>(
    () => [
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <span className="text-sm text-fg">{row.original.email}</span>,
      },
      {
        id: "utm_source",
        header: "Source",
        accessorFn: (r) => readUtm(r.utm, "utm_source") || "—",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg-muted">
            {readUtm(row.original.utm, "utm_source") || "—"}
          </span>
        ),
      },
      {
        id: "utm_campaign",
        header: "Campaign",
        accessorFn: (r) => readUtm(r.utm, "utm_campaign") || "—",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg-muted">
            {readUtm(row.original.utm, "utm_campaign") || "—"}
          </span>
        ),
      },
      {
        id: "utm_content",
        header: "Video (utm_content)",
        accessorFn: (r) => readUtm(r.utm, "utm_content") || "—",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg-muted">
            {readUtm(row.original.utm, "utm_content") || "—"}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Joined",
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted">{formatDateTime(row.original.created_at)}</span>
        ),
      },
    ],
    []
  );

  function exportCsv() {
    const header = ["email", "utm_source", "utm_campaign", "utm_content", "created_at"];
    const lines = [
      header.join(","),
      ...filtered.map((r) =>
        [
          JSON.stringify(r.email),
          JSON.stringify(readUtm(r.utm, "utm_source")),
          JSON.stringify(readUtm(r.utm, "utm_campaign")),
          JSON.stringify(readUtm(r.utm, "utm_content")),
          r.created_at,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sueno-waitlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Waitlist</h1>
          <p className="text-sm text-fg-muted">Read-only waitlist signups and UTM attribution.</p>
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

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search email or UTM…"
        toolbarExtra={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-bg-subtle px-2 text-xs text-fg"
            >
              <option value="all">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-bg-subtle px-2 text-xs text-fg"
            >
              <option value="all">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        }
        emptyState={<p className="text-sm text-fg-muted">No waitlist signups yet.</p>}
      />
    </div>
  );
}
