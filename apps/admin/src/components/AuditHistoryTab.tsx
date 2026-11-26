"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { Database } from "@galene/shared";

type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];

function computeDiff(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): { field: string; before: string; after: string }[] {
  const keys = new Set([
    ...Object.keys(oldData ?? {}),
    ...Object.keys(newData ?? {}),
  ]);
  const diffs: { field: string; before: string; after: string }[] = [];
  for (const key of keys) {
    if (key === "updated_at") continue;
    const beforeVal = oldData?.[key];
    const afterVal = newData?.[key];
    const beforeStr = beforeVal === undefined ? "—" : JSON.stringify(beforeVal);
    const afterStr = afterVal === undefined ? "—" : JSON.stringify(afterVal);
    if (beforeStr !== afterStr) {
      diffs.push({ field: key, before: beforeStr, after: afterStr });
    }
  }
  return diffs;
}

export function AuditHistoryTab({
  tableName,
  rowId,
}: {
  tableName: string;
  rowId: string;
}) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .eq("table_name", tableName)
        .eq("row_id", rowId)
        .order("changed_at", { ascending: false })
        .limit(50);
      if (active) {
        setRows(data ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [tableName, rowId]);

  if (loading) {
    return <p className="text-sm text-fg-muted">Loading history…</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-fg-muted">No history recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const oldObj =
          row.old_data && typeof row.old_data === "object" && !Array.isArray(row.old_data)
            ? (row.old_data as Record<string, unknown>)
            : null;
        const newObj =
          row.new_data && typeof row.new_data === "object" && !Array.isArray(row.new_data)
            ? (row.new_data as Record<string, unknown>)
            : null;
        const diffs = computeDiff(oldObj, newObj);

        return (
          <div key={row.id} className="rounded-lg border border-border bg-bg-subtle p-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-[11px] font-medium">
                  {row.action}
                </span>
                <span className="font-mono text-fg-muted">
                  {row.actor ? row.actor.slice(0, 8) : "system"}
                </span>
              </div>
              <span className="text-fg-muted">{formatDateTime(row.changed_at)}</span>
            </div>

            {diffs.length > 0 && (
              <div className="mt-2.5 space-y-1 border-t border-border pt-2">
                {diffs.map((d) => (
                  <div key={d.field} className="grid grid-cols-[140px_1fr] gap-2 font-mono text-[11px]">
                    <span className="truncate text-fg-muted">{d.field}</span>
                    <span className="break-all text-fg">
                      <span className="text-fg-muted line-through">{d.before}</span>{" "}
                      <span>→ {d.after}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
