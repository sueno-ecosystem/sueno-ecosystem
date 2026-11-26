"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { Database } from "@galene/shared";
import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";

type PartnerRow = Database["public"]["Tables"]["partners"]["Row"];
type PartnerDealRow = Database["public"]["Tables"]["partner_deals"]["Row"];

export interface PartnerListItem extends PartnerRow {
  productCount: number;
  deal: PartnerDealRow | null;
}

const STATUS_FILTERS = ["all", "prospect", "active", "paused", "ended"] as const;

function formatCommission(deal: PartnerDealRow | null): string {
  if (!deal || deal.commission_type === "none" || deal.commission_value === null) return "—";
  if (deal.commission_type === "percent") return `${deal.commission_value}%`;
  return `$${Number(deal.commission_value).toFixed(2)}`;
}

export function PartnersTable({
  initialPartners,
  canEdit,
}: {
  initialPartners: PartnerListItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return initialPartners.filter((p) => statusFilter === "all" || p.status === statusFilter);
  }, [initialPartners, statusFilter]);

  const columns = useMemo<ColumnDef<PartnerListItem, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-fg">{row.original.name}</p>
            {row.original.website && (
              <p className="font-mono text-[11px] text-fg-muted">{row.original.website}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "productCount",
        header: "# Products",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg-muted">{row.original.productCount}</span>
        ),
      },
      {
        id: "commission",
        header: "Commission",
        accessorFn: (r) => formatCommission(r.deal),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg-muted">
            {formatCommission(row.original.deal)}
          </span>
        ),
      },
    ],
    []
  );

  async function createPartner(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("partners")
        .insert({
          name: newName.trim(),
          website: newWebsite.trim() || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      setNewOpen(false);
      router.push(`/partners/${data.id}`);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create partner.");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Partners</h1>
          <p className="text-sm text-fg-muted">Brand profiles and private affiliate deal terms.</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New partner</span>
          </button>
        )}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search partners…"
        onRowClick={(p) => router.push(`/partners/${p.id}`)}
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
                {s}
              </button>
            ))}
          </div>
        }
        emptyState={
          <div className="space-y-3 py-4">
            <p className="text-sm text-fg-muted">No partners found.</p>
            {canEdit && initialPartners.length === 0 && (
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add first partner</span>
              </button>
            )}
          </div>
        }
      />

      {newOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setNewOpen(false)}
        >
          <form
            onSubmit={createPartner}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-border bg-bg p-6 sm:p-7 shadow-lg"
          >
            <h2 className="text-base font-semibold text-fg">New partner</h2>
            <p className="mt-1.5 text-xs text-fg-muted">Creates a prospect partner record.</p>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Brand name</label>
                <input
                  autoFocus
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Eight Sleep"
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Website</label>
                <input
                  type="url"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://eightsleep.com"
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {createError && <p className="text-xs text-red-500">{createError}</p>}
            </div>

            <div className="mt-7 flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="h-9 rounded-md border border-border px-4 text-xs font-medium text-fg hover:bg-bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create partner"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
