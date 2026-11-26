"use client";

import { useMemo, useState } from "react";
import type { Database } from "@galene/shared";
import { formatDateTime } from "@/lib/format";

type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];

export function GlobalAuditTable({ rows }: { rows: AuditRow[] }) {
  const [tableFilter, setTableFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const tables = useMemo(
    () => Array.from(new Set(rows.map((r) => r.table_name))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const actorQ = actorFilter.trim().toLowerCase();
    return rows.filter((r) => {
      if (tableFilter !== "all" && r.table_name !== tableFilter) return false;
      if (actorQ && !(r.actor ?? "system").toLowerCase().includes(actorQ)) return false;
      return true;
    });
  }, [rows, tableFilter, actorFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-fg-muted">
            Global history of content, commerce, Stripe product, and team changes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-bg-subtle px-2.5 text-xs text-fg"
          >
            <option value="all">All tables</option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder="Filter by actor UUID…"
            className="h-8 w-48 rounded-md border border-border bg-bg px-2.5 font-mono text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-bg">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-bg-subtle text-xs text-fg-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Table</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Row ID</th>
              <th className="px-4 py-2.5 font-medium">Actor</th>
              <th className="px-4 py-2.5 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-fg-muted">
                  No audit entries match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const open = expandedId === r.id;
                return (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => setExpandedId(open ? null : r.id)}
                      className="cursor-pointer hover:bg-bg-subtle"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-fg">{r.table_name}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded border border-border bg-bg-subtle px-1.5 py-0.5 font-mono text-[11px]">
                          {r.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-fg-muted">
                        {r.row_id ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-fg-muted">
                        {r.actor ? r.actor.slice(0, 8) : "system"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-fg-muted">
                        {formatDateTime(r.changed_at)}
                      </td>
                    </tr>
                    {open && (
                      <tr key={`${r.id}-diff`} className="bg-bg-subtle">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid gap-3 font-mono text-[11px] sm:grid-cols-2">
                            <div>
                              <p className="mb-1 text-fg-muted">old_data</p>
                              <pre className="max-h-48 overflow-auto rounded border border-border bg-bg p-2 text-fg">
                                {JSON.stringify(r.old_data, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 text-fg-muted">new_data</p>
                              <pre className="max-h-48 overflow-auto rounded border border-border bg-bg p-2 text-fg">
                                {JSON.stringify(r.new_data, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
