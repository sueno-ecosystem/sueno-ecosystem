"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { Database } from "@sueno/shared";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatDuration, slugify } from "@/lib/format";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";

type VideoRow = Database["public"]["Tables"]["videos"]["Row"];
type PillarRow = Database["public"]["Tables"]["pillars"]["Row"];

const STATUS_FILTERS = ["all", "draft", "review", "published", "archived"] as const;
const ACCESS_FILTERS = ["all", "free", "members"] as const;

export function VideosTable({
  initialVideos,
  pillars,
  canEdit,
  openNewOnMount = false,
}: {
  initialVideos: VideoRow[];
  pillars: PillarRow[];
  canEdit: boolean;
  openNewOnMount?: boolean;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [pillarFilter, setPillarFilter] = useState<string>("all");
  const [accessFilter, setAccessFilter] = useState<(typeof ACCESS_FILTERS)[number]>("all");

  const [newOpen, setNewOpen] = useState(openNewOnMount && canEdit);
  const [newTitle, setNewTitle] = useState("");
  const [newPillar, setNewPillar] = useState(pillars[0]?.slug ?? "environment");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const pillarMap = useMemo(() => new Map(pillars.map((p) => [p.slug, p.title])), [pillars]);

  const filtered = useMemo(() => {
    return initialVideos.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (pillarFilter !== "all" && v.pillar !== pillarFilter) return false;
      if (accessFilter !== "all" && v.access !== accessFilter) return false;
      return true;
    });
  }, [initialVideos, statusFilter, pillarFilter, accessFilter]);

  const columns = useMemo<ColumnDef<VideoRow, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <p className="font-medium text-fg">{row.original.title}</p>
            <p className="font-mono text-[11px] text-fg-muted">{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: "pillar",
        header: "Pillar",
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted">
            {pillarMap.get(row.original.pillar) ?? row.original.pillar}
          </span>
        ),
      },
      {
        accessorKey: "access",
        header: "Access",
        cell: ({ row }) => (
          <span className="rounded border border-border bg-bg-subtle px-1.5 py-0.5 text-[11px] capitalize text-fg-muted">
            {row.original.access}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "duration_seconds",
        header: "Duration",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg-muted">
            {formatDuration(row.original.duration_seconds)}
          </span>
        ),
      },
      {
        id: "review",
        header: "Review",
        accessorFn: (r) => (r.needs_medical_review ? (r.reviewed_at ? "Approved" : "Required") : "—"),
        cell: ({ row }) => {
          if (!row.original.needs_medical_review) {
            return <span className="text-xs text-fg-muted">—</span>;
          }
          return row.original.reviewed_at ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Approved</span>
          ) : (
            <span className="text-xs text-amber-600 dark:text-amber-400">Needs review</span>
          );
        },
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted">{formatDateTime(row.original.updated_at)}</span>
        ),
      },
    ],
    [pillarMap]
  );

  async function createVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError(null);

    try {
      const supabase = createClient();
      const baseSlug = slugify(newTitle) || "video";
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("videos")
        .insert({
          title: newTitle.trim(),
          slug,
          pillar: newPillar,
        })
        .select("id")
        .single();

      if (error) throw error;
      setNewOpen(false);
      router.push(`/videos/${data.id}`);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create video.");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Videos</h1>
          <p className="text-sm text-fg-muted">
            Learn tab lessons, R2 media assets, and medical review.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New video</span>
          </button>
        )}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search videos…"
        onRowClick={(v) => router.push(`/videos/${v.id}`)}
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

            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value as (typeof ACCESS_FILTERS)[number])}
              aria-label="Filter by access"
              className="h-8 rounded-md border border-border bg-bg-subtle px-2 text-xs text-fg focus:border-accent focus:outline-none"
            >
              <option value="all">All access</option>
              <option value="free">Free</option>
              <option value="members">Members</option>
            </select>
          </div>
        }
        emptyState={
          <div className="space-y-3 py-4">
            <p className="text-sm text-fg-muted">No videos match the current filters.</p>
            {canEdit && initialVideos.length === 0 && (
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create first video</span>
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
            onSubmit={createVideo}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-border bg-bg p-6 sm:p-7 shadow-lg"
          >
            <h2 className="text-base font-semibold text-fg">New video</h2>
            <p className="mt-1.5 text-xs text-fg-muted">Creates a draft record in Supabase.</p>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Title</label>
                <input
                  autoFocus
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Why you wake up at 4 AM"
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
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
