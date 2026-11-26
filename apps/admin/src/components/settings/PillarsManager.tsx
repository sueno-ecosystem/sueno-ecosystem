"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { Database } from "@galene/shared";
import { createClient } from "@/lib/supabase/client";

type PillarRow = Database["public"]["Tables"]["pillars"]["Row"];

export function PillarsManager({
  initialPillars,
  canEdit,
}: {
  initialPillars: PillarRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pillars, setPillars] = useState<PillarRow[]>(initialPillars);
  const [selectedSlug, setSelectedSlug] = useState<string>(initialPillars[0]?.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const selected = pillars.find((p) => p.slug === selectedSlug) ?? null;

  async function move(index: number, dir: -1 | 1) {
    if (!canEdit) return;
    const target = index + dir;
    if (target < 0 || target >= pillars.length) return;
    const next = [...pillars];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    const reordered = next.map((p, i) => ({ ...p, sort: i + 1 }));
    setPillars(reordered);

    const supabase = createClient();
    await Promise.all(
      reordered.map((p) => supabase.from("pillars").update({ sort: p.sort }).eq("slug", p.slug))
    );
    router.refresh();
  }

  async function savePillar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit || !selected) return;
    setSaving(true);
    setToast(null);
    const fd = new FormData(e.currentTarget);
    const patch = {
      title: String(fd.get("title") ?? "").trim(),
      title_es: String(fd.get("title_es") ?? "").trim() || null,
      description: String(fd.get("description") ?? "").trim() || null,
      description_es: String(fd.get("description_es") ?? "").trim() || null,
      icon: String(fd.get("icon") ?? "").trim() || null,
    };

    const supabase = createClient();
    const { data, error } = await supabase
      .from("pillars")
      .update(patch)
      .eq("slug", selected.slug)
      .select("*")
      .single();

    setSaving(false);
    if (error) {
      setToast(error.message);
      return;
    }
    setPillars(pillars.map((p) => (p.slug === data.slug ? data : p)));
    setToast("Pillar saved.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Pillars</h1>
        <p className="text-sm text-fg-muted">
          Ordered sleep recovery pillars (EN / ES) and icon keys.
        </p>
      </div>

      {toast && (
        <div className="rounded-md border border-border bg-bg-subtle px-4 py-2 text-xs text-fg">
          {toast}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <ul className="divide-y divide-border self-start rounded-lg border border-border bg-bg-subtle">
          {pillars.map((p, idx) => (
            <li
              key={p.slug}
              className={`flex items-center justify-between gap-2 px-3.5 py-2.5 ${
                p.slug === selectedSlug ? "bg-bg-muted" : "hover:bg-bg-muted/50"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedSlug(p.slug)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium text-fg">{p.title}</p>
                <p className="font-mono text-[11px] text-fg-muted">{p.slug}</p>
              </button>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => void move(idx, -1)}
                    className="rounded border border-border p-1 text-fg-muted hover:text-fg disabled:opacity-40"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === pillars.length - 1}
                    onClick={() => void move(idx, 1)}
                    className="rounded border border-border p-1 text-fg-muted hover:text-fg disabled:opacity-40"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {selected && (
          <form
            key={selected.slug}
            onSubmit={savePillar}
            className="space-y-5 rounded-lg border border-border bg-bg-subtle p-6 sm:p-8"
          >
            <div className="border-b border-border pb-4">
              <h2 className="text-sm font-semibold text-fg">{selected.title}</h2>
              <p className="font-mono text-xs text-fg-muted">{selected.slug}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Title (EN)</label>
                <input
                  name="title"
                  required
                  disabled={!canEdit}
                  defaultValue={selected.title}
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Title (ES)</label>
                <input
                  name="title_es"
                  disabled={!canEdit}
                  defaultValue={selected.title_es ?? ""}
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-fg">Icon name</label>
              <input
                name="icon"
                disabled={!canEdit}
                defaultValue={selected.icon ?? ""}
                placeholder="thermometer / moon / shirt"
                className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-fg">Description (EN)</label>
              <textarea
                name="description"
                rows={3}
                disabled={!canEdit}
                defaultValue={selected.description ?? ""}
                className="w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-fg">Description (ES)</label>
              <textarea
                name="description_es"
                rows={3}
                disabled={!canEdit}
                defaultValue={selected.description_es ?? ""}
                className="w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-60"
              />
            </div>

            {canEdit && (
              <div className="flex justify-end border-t border-border pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save pillar"}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
