"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Database } from "@galene/shared";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/format";

type TagRow = Database["public"]["Tables"]["trigger_tags"]["Row"];
type PillarRow = Database["public"]["Tables"]["pillars"]["Row"];

export function TagsManager({
  initialTags,
  pillars,
  canEdit,
}: {
  initialTags: TagRow[];
  pillars: PillarRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [tags, setTags] = useState<TagRow[]>(initialTags);
  const [toast, setToast] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPillar, setNewPillar] = useState(pillars[0]?.slug ?? "environment");
  const [creating, setCreating] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, TagRow[]>();
    for (const p of pillars) map.set(p.slug, []);
    for (const t of tags) {
      const list = map.get(t.pillar) ?? [];
      list.push(t);
      map.set(t.pillar, list);
    }
    return map;
  }, [tags, pillars]);

  async function updateTag(slug: string, patch: Partial<TagRow>) {
    if (!canEdit) return;
    setToast(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trigger_tags")
      .update(patch)
      .eq("slug", slug)
      .select("*")
      .single();
    if (error) {
      setToast(error.message);
      return;
    }
    setTags(tags.map((t) => (t.slug === slug ? data : t)));
    router.refresh();
  }

  async function createTag(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || !newLabel.trim()) return;
    setCreating(true);
    setToast(null);
    const slug = slugify(newLabel).replace(/-/g, "_");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trigger_tags")
      .insert({
        slug,
        label: newLabel.trim(),
        pillar: newPillar,
        sort: tags.length + 1,
      })
      .select("*")
      .single();
    setCreating(false);
    if (error) {
      setToast(error.message);
      return;
    }
    setTags([...tags, data]);
    setNewLabel("");
    setNewOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Trigger tags</h1>
          <p className="text-sm text-fg-muted">
            The 4am Journal tags grouped by pillar. Used for bundle matching.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New tag</span>
          </button>
        )}
      </div>

      {toast && (
        <div className="rounded-md border border-border bg-bg-subtle px-4 py-2 text-xs text-fg">
          {toast}
        </div>
      )}

      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([pillarSlug, list]) => {
          const pillarTitle = pillars.find((p) => p.slug === pillarSlug)?.title ?? pillarSlug;
          return (
            <section key={pillarSlug} className="overflow-hidden rounded-lg border border-border bg-bg">
              <div className="border-b border-border bg-bg-subtle px-4 py-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  {pillarTitle} ({list.length})
                </h2>
              </div>
              {list.length === 0 ? (
                <p className="px-4 py-4 text-xs text-fg-muted">No tags in this pillar.</p>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-border text-xs text-fg-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">Slug</th>
                      <th className="px-4 py-2 font-medium">Label (EN)</th>
                      <th className="px-4 py-2 font-medium">Label (ES)</th>
                      <th className="px-4 py-2 font-medium">Sort</th>
                      <th className="px-4 py-2 font-medium">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {list.map((t) => (
                      <tr key={t.slug}>
                        <td className="px-4 py-2.5 font-mono text-xs text-fg-muted">{t.slug}</td>
                        <td className="px-4 py-2.5">
                          <input
                            defaultValue={t.label}
                            disabled={!canEdit}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== t.label) void updateTag(t.slug, { label: v });
                            }}
                            className="h-8 w-full rounded border border-border bg-bg px-2.5 text-xs text-fg focus:border-accent focus:outline-none disabled:opacity-60"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            defaultValue={t.label_es ?? ""}
                            disabled={!canEdit}
                            placeholder="Spanish label…"
                            onBlur={(e) => {
                              const v = e.target.value.trim() || null;
                              if (v !== t.label_es) void updateTag(t.slug, { label_es: v });
                            }}
                            className="h-8 w-full rounded border border-border bg-bg px-2.5 text-xs text-fg focus:border-accent focus:outline-none disabled:opacity-60"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            defaultValue={t.sort}
                            disabled={!canEdit}
                            onBlur={(e) => {
                              const n = Number.parseInt(e.target.value, 10) || 0;
                              if (n !== t.sort) void updateTag(t.slug, { sort: n });
                            }}
                            className="h-8 w-16 rounded border border-border bg-bg px-2 font-mono text-xs text-fg disabled:opacity-60"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={t.active}
                            disabled={!canEdit}
                            onChange={(e) => void updateTag(t.slug, { active: e.target.checked })}
                            className="accent-accent"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
      </div>

      {newOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setNewOpen(false)}
        >
          <form
            onSubmit={createTag}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-border bg-bg p-6 sm:p-7 shadow-lg"
          >
            <h2 className="text-base font-semibold text-fg">New trigger tag</h2>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Label</label>
                <input
                  autoFocus
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Too bright"
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Pillar</label>
                <select
                  value={newPillar}
                  onChange={(e) => setNewPillar(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none"
                >
                  {pillars.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
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
                {creating ? "Creating…" : "Create tag"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
