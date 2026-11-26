"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { Database } from "@galene/shared";
import { createClient } from "@/lib/supabase/client";
import { publicMediaUrl, slugify } from "@/lib/format";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type PartnerRow = Database["public"]["Tables"]["partners"]["Row"];
type PillarRow = Database["public"]["Tables"]["pillars"]["Row"];

const STATUS_FILTERS = ["all", "draft", "published", "archived"] as const;

export function ProductsTable({
  initialProducts,
  partners,
  pillars,
  canEdit,
  openNewOnMount = false,
}: {
  initialProducts: ProductRow[];
  partners: PartnerRow[];
  pillars: PillarRow[];
  canEdit: boolean;
  openNewOnMount?: boolean;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [pillarFilter, setPillarFilter] = useState<string>("all");

  const [newOpen, setNewOpen] = useState(openNewOnMount && canEdit);
  const [newName, setNewName] = useState("");
  const [newPartnerId, setNewPartnerId] = useState(partners[0]?.id ?? "");
  const [newPillar, setNewPillar] = useState(pillars[0]?.slug ?? "environment");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const partnerMap = useMemo(() => new Map(partners.map((p) => [p.id, p.name])), [partners]);
  const pillarMap = useMemo(() => new Map(pillars.map((p) => [p.slug, p.title])), [pillars]);

  const filtered = useMemo(() => {
    return initialProducts.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (pillarFilter !== "all" && p.pillar !== pillarFilter) return false;
      return true;
    });
  }, [initialProducts, statusFilter, pillarFilter]);

  const columns = useMemo<ColumnDef<ProductRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => {
          const thumb = publicMediaUrl(row.original.image_key);
          return (
            <div className="flex items-center gap-3">
              {thumb ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={thumb}
                  alt={row.original.name}
                  className="h-9 w-9 shrink-0 rounded border border-border object-cover"
                />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded border border-border bg-bg-muted" />
              )}
              <div>
                <p className="font-medium text-fg">{row.original.name}</p>
                <p className="font-mono text-[11px] text-fg-muted">{row.original.slug}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "partner_id",
        header: "Partner",
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted">
            {partnerMap.get(row.original.partner_id) ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "pillar",
        header: "Pillar",
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted">
            {row.original.pillar ? pillarMap.get(row.original.pillar) ?? row.original.pillar : "—"}
          </span>
        ),
      },
      {
        accessorKey: "price_cents",
        header: "Price",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg-muted">
            {row.original.price_cents !== null
              ? `$${(row.original.price_cents / 100).toFixed(2)}`
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "claims_reviewed",
        header: "Claims",
        cell: ({ row }) => (
          <span
            className={`text-xs ${
              row.original.claims_reviewed
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-fg-muted"
            }`}
          >
            {row.original.claims_reviewed ? "Reviewed" : "Pending"}
          </span>
        ),
      },
    ],
    [partnerMap, pillarMap]
  );

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newPartnerId) return;
    setCreating(true);
    setCreateError(null);

    try {
      const supabase = createClient();
      const baseSlug = slugify(newName) || "product";
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: newName.trim(),
          slug,
          partner_id: newPartnerId,
          pillar: newPillar || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      setNewOpen(false);
      router.push(`/products/${data.id}`);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create product.");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-fg-muted">
            Partner affiliate products, R2 images, and claims review.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            disabled={partners.length === 0}
            title={partners.length === 0 ? "Create a partner first" : undefined}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New product</span>
          </button>
        )}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search products…"
        onRowClick={(p) => router.push(`/products/${p.id}`)}
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

            <select
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value)}
              aria-label="Filter by pillar"
              className="h-8 rounded-md border border-border bg-bg-subtle px-2 text-xs text-fg focus:border-accent focus:outline-none"
            >
              <option value="all">All pillars</option>
              {pillars.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        }
        emptyState={
          <div className="space-y-3 py-4">
            <p className="text-sm text-fg-muted">
              {partners.length === 0
                ? "Add a partner first before creating products."
                : "No products match the current filters."}
            </p>
            {canEdit && partners.length > 0 && initialProducts.length === 0 && (
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create first product</span>
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
            onSubmit={createProduct}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-border bg-bg p-6 sm:p-7 shadow-lg"
          >
            <h2 className="text-base font-semibold text-fg">New product</h2>
            <p className="mt-1.5 text-xs text-fg-muted">Creates a draft partner product.</p>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Name</label>
                <input
                  autoFocus
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Cooling Bamboo Sheet Set"
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Partner</label>
                <select
                  required
                  value={newPartnerId}
                  onChange={(e) => setNewPartnerId(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Pillar</label>
                <select
                  value={newPillar}
                  onChange={(e) => setNewPillar(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {pillars.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </select>
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
                {creating ? "Creating…" : "Create draft"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
