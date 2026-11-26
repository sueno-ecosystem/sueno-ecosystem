"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

export interface ClickAggregateInput {
  id: number;
  targetType: "product" | "bundle";
  targetName: string;
  source: string;
  platform: string;
  createdAt: string;
}

const WINDOWS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "All time", days: 0 },
] as const;

export function ClicksDashboard({ rows }: { rows: ClickAggregateInput[] }) {
  const [nowMs] = useState(() => Date.now());
  const [windowDays, setWindowDays] = useState<number>(30);

  const filtered = useMemo(() => {
    const cutoff = windowDays > 0 ? nowMs - windowDays * 86_400_000 : 0;
    return rows.filter((r) => !cutoff || new Date(r.createdAt).getTime() >= cutoff);
  }, [rows, windowDays, nowMs]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { targetType: string; targetName: string; source: string; platform: string; count: number }
    >();
    for (const r of filtered) {
      const key = `${r.targetType}:${r.targetName}:${r.source}:${r.platform}`;
      const cur = map.get(key) ?? {
        targetType: r.targetType,
        targetName: r.targetName,
        source: r.source,
        platform: r.platform,
        count: 0,
      };
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filtered]);

  function exportCsv() {
    const header = ["type", "name", "source", "platform", "clicks"];
    const lines = [
      header.join(","),
      ...grouped.map((g) =>
        [g.targetType, JSON.stringify(g.targetName), g.source, g.platform, g.count].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sueno-outbound-clicks.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Outbound clicks</h1>
          <p className="text-sm text-fg-muted">
            Aggregate partner link clicks for affiliate reporting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w.label}
              type="button"
              onClick={() => setWindowDays(w.days)}
              className={`h-8 rounded-md border px-2.5 text-xs transition-colors ${
                windowDays === w.days
                  ? "border-accent bg-accent/10 font-medium text-fg"
                  : "border-border bg-bg-subtle text-fg-muted hover:text-fg"
              }`}
            >
              {w.label}
            </button>
          ))}
          <button
            type="button"
            onClick={exportCsv}
            disabled={grouped.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-bg-subtle px-3 text-xs font-medium text-fg hover:bg-bg-muted disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-xs text-fg-muted">Total clicks</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{filtered.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-xs text-fg-muted">From recommendations</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {filtered.filter((r) => r.source === "recommendation").length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-xs text-fg-muted">Unique targets</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {new Set(grouped.map((g) => g.targetName)).size}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-bg">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-bg-subtle text-xs text-fg-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Product / Bundle</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Platform</th>
              <th className="px-4 py-2.5 text-right font-medium">Clicks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-fg-muted">
                  No outbound clicks recorded for this window.
                </td>
              </tr>
            ) : (
              grouped.map((g, i) => (
                <tr key={i} className="hover:bg-bg-subtle">
                  <td className="px-4 py-2.5 text-xs capitalize text-fg-muted">{g.targetType}</td>
                  <td className="px-4 py-2.5 font-medium text-fg">{g.targetName}</td>
                  <td className="px-4 py-2.5 text-xs text-fg-muted">{g.source}</td>
                  <td className="px-4 py-2.5 text-xs uppercase text-fg-muted">{g.platform}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-fg">{g.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
