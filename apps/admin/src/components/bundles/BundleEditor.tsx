"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Circle, Plus, Search, Trash2 } from "lucide-react";
import type { Database } from "@galene/shared";
import type { AdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, publicMediaUrl, slugify } from "@/lib/format";
import { AuditHistoryTab } from "@/components/AuditHistoryTab";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MediaUploadField } from "@/components/MediaUploadField";
import { StatusBadge } from "@/components/StatusBadge";

type BundleRow = Database["public"]["Tables"]["bundles"]["Row"];
type PillarRow = Database["public"]["Tables"]["pillars"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type TriggerTagRow = Database["public"]["Tables"]["trigger_tags"]["Row"];
type BundleItemRow = Database["public"]["Tables"]["bundle_items"]["Row"];
type WeightRow = Database["public"]["Tables"]["bundle_tag_weights"]["Row"];

const bundleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(100),
  description: z.string().max(2000).nullable().optional(),
  pillar: z.string().nullable().optional(),
  price_dollars: z.string().optional(),
  discount_code: z.string().max(60).nullable().optional(),
  url: z.string().max(1000).nullable().optional(),
  sort: z.coerce.number().int().min(0),
  claims_reviewed: z.boolean(),
  title_es: z.string().max(200).nullable().optional(),
  description_es: z.string().max(2000).nullable().optional(),
});

type BundleFormValues = z.infer<typeof bundleSchema>;

const TABS = ["Details", "Spanish", "Items", "Matching", "Media", "History"] as const;
type Tab = (typeof TABS)[number];

export function BundleEditor({
  initialBundle,
  pillars,
  allProducts,
  initialItems,
  triggerTags,
  initialWeights,
  role,
}: {
  initialBundle: BundleRow;
  pillars: PillarRow[];
  allProducts: ProductRow[];
  initialItems: BundleItemRow[];
  triggerTags: TriggerTagRow[];
  initialWeights: WeightRow[];
  role: AdminRole;
}) {
  const router = useRouter();
  const canEdit = role === "owner" || role === "editor";

  const [bundle, setBundle] = useState<BundleRow>(initialBundle);
  const [items, setItems] = useState<BundleItemRow[]>(initialItems);
  const [weights, setWeights] = useState<Map<string, number>>(
    () => new Map(initialWeights.map((w) => [w.tag_slug, w.weight]))
  );
  const [tab, setTab] = useState<Tab>("Details");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [toast, setToast] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [productQuery, setProductQuery] = useState("");

  const form = useForm<BundleFormValues>({
    resolver: zodResolver(bundleSchema) as never,
    defaultValues: {
      title: initialBundle.title,
      slug: initialBundle.slug,
      description: initialBundle.description ?? "",
      pillar: initialBundle.pillar ?? "",
      price_dollars:
        initialBundle.price_cents !== null ? (initialBundle.price_cents / 100).toFixed(2) : "",
      discount_code: initialBundle.discount_code ?? "",
      url: initialBundle.url ?? "",
      sort: initialBundle.sort,
      claims_reviewed: initialBundle.claims_reviewed,
      title_es: initialBundle.title_es ?? "",
      description_es: initialBundle.description_es ?? "",
    },
  });

  const isDirty = form.formState.isDirty;
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const productMap = useMemo(() => new Map(allProducts.map((p) => [p.id, p])), [allProducts]);
  const itemProductIds = useMemo(() => new Set(items.map((i) => i.product_id)), [items]);

  const availableProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return allProducts.filter(
      (p) => !itemProductIds.has(p.id) && (!q || p.name.toLowerCase().includes(q) || p.slug.includes(q))
    );
  }, [allProducts, itemProductIds, productQuery]);

  const hasHeroImage = Boolean(bundle.hero_image_key);
  const claimsReviewed = bundle.claims_reviewed;
  const hasItems = items.length > 0;
  const publishReady = hasHeroImage && claimsReviewed && hasItems;
  const heroUrl = publicMediaUrl(bundle.hero_image_key);

  const matchingPreview = useMemo(() => {
    return triggerTags
      .map((t) => ({ tag: t, weight: weights.get(t.slug) ?? 0 }))
      .filter((x) => x.weight > 0)
      .sort((a, b) => b.weight - a.weight);
  }, [triggerTags, weights]);

  async function saveFields(patch: Partial<BundleRow>) {
    if (!canEdit) return;
    setSaveState("saving");
    setToast(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bundles")
      .update(patch)
      .eq("id", bundle.id)
      .select("*")
      .single();

    if (error) {
      setSaveState("error");
      setToast(error.message);
      return;
    }
    setBundle(data);
    setSaveState("saved");
    router.refresh();
  }

  async function onSubmitForm(values: BundleFormValues) {
    if (!canEdit) return;
    const priceNum =
      values.price_dollars && values.price_dollars.trim() !== ""
        ? Math.round(Number(values.price_dollars) * 100)
        : null;

    await saveFields({
      title: values.title.trim(),
      slug: slugify(values.slug) || values.slug.trim(),
      description: values.description?.trim() || null,
      pillar: values.pillar || null,
      price_cents: priceNum !== null && Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : null,
      discount_code: values.discount_code?.trim() || null,
      url: values.url?.trim() || null,
      sort: values.sort,
      claims_reviewed: values.claims_reviewed,
      title_es: values.title_es?.trim() || null,
      description_es: values.description_es?.trim() || null,
    });
    form.reset(values);
  }

  async function changeStatus(nextStatus: "draft" | "published" | "archived") {
    if (!canEdit) return;
    setBusyAction(true);
    await saveFields({ status: nextStatus });
    setBusyAction(false);
    setArchiveOpen(false);
  }

  async function addItem(productId: string) {
    if (!canEdit) return;
    const supabase = createClient();
    const nextSort = items.length;
    const { data, error } = await supabase
      .from("bundle_items")
      .insert({ bundle_id: bundle.id, product_id: productId, quantity: 1, sort: nextSort })
      .select("*")
      .single();
    if (error) {
      setToast(error.message);
      return;
    }
    setItems([...items, data]);
    router.refresh();
  }

  async function updateItemQuantity(productId: string, quantity: number) {
    if (!canEdit || quantity < 1) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("bundle_items")
      .update({ quantity })
      .eq("bundle_id", bundle.id)
      .eq("product_id", productId);
    if (error) {
      setToast(error.message);
      return;
    }
    setItems(items.map((i) => (i.product_id === productId ? { ...i, quantity } : i)));
  }

  async function moveItem(index: number, direction: -1 | 1) {
    if (!canEdit) return;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    const updated = reordered.map((item, idx) => ({ ...item, sort: idx }));
    setItems(updated);

    const supabase = createClient();
    await Promise.all(
      updated.map((item) =>
        supabase
          .from("bundle_items")
          .update({ sort: item.sort })
          .eq("bundle_id", bundle.id)
          .eq("product_id", item.product_id)
      )
    );
  }

  async function removeItem(productId: string) {
    if (!canEdit) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("bundle_items")
      .delete()
      .eq("bundle_id", bundle.id)
      .eq("product_id", productId);
    if (error) {
      setToast(error.message);
      return;
    }
    setItems(items.filter((i) => i.product_id !== productId));
    router.refresh();
  }

  async function setWeight(tagSlug: string, weight: number) {
    if (!canEdit) return;
    const next = new Map(weights);
    if (weight <= 0) {
      next.delete(tagSlug);
      setWeights(next);
      const supabase = createClient();
      const { error } = await supabase
        .from("bundle_tag_weights")
        .delete()
        .eq("bundle_id", bundle.id)
        .eq("tag_slug", tagSlug);
      if (error) setToast(error.message);
    } else {
      next.set(tagSlug, weight);
      setWeights(next);
      const supabase = createClient();
      const { error } = await supabase
        .from("bundle_tag_weights")
        .upsert({ bundle_id: bundle.id, tag_slug: tagSlug, weight }, { onConflict: "bundle_id,tag_slug" });
      if (error) setToast(error.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Link
            href="/bundles"
            className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Bundles</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight">{bundle.title}</h1>
            <StatusBadge status={bundle.status} />
            <span className="text-xs text-fg-muted">
              {saveState === "saving"
                ? "Saving…"
                : isDirty
                ? "Unsaved changes"
                : saveState === "error"
                ? "Save failed"
                : "Saved"}
            </span>
          </div>
          <p className="font-mono text-xs text-fg-muted">
            {bundle.slug} · Updated {formatDateTime(bundle.updated_at)}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {bundle.status !== "published" && (
              <button
                type="button"
                disabled={busyAction || !publishReady}
                onClick={() => void changeStatus("published")}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Publish
              </button>
            )}
            {bundle.status !== "archived" && (
              <button
                type="button"
                disabled={busyAction}
                onClick={() => setArchiveOpen(true)}
                className="rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-bg-muted hover:text-fg"
              >
                Archive
              </button>
            )}
          </div>
        )}
      </div>

      {/* Publish checklist */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-xs">
        <span className="font-medium text-fg-muted">Publish checklist:</span>
        <span className="inline-flex items-center gap-1.5">
          {hasHeroImage ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-fg-muted" />
          )}
          Hero image
        </span>
        <span className="inline-flex items-center gap-1.5">
          {claimsReviewed ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-amber-500" />
          )}
          Claims reviewed
        </span>
        <span className="inline-flex items-center gap-1.5">
          {hasItems ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-fg-muted" />
          )}
          At least 1 item
        </span>
      </div>

      {toast && (
        <div className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-xs text-fg">
          {toast}
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? "border-accent text-fg"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {(tab === "Details" || tab === "Spanish") && (
        <form
          onSubmit={form.handleSubmit(onSubmitForm)}
          className="space-y-6 rounded-lg border border-border bg-bg-subtle p-6 sm:p-8"
        >
          {tab === "Details" && (
            <>
              <div className="border-b border-border pb-4">
                <h2 className="text-sm font-semibold text-fg">Bundle details</h2>
                <p className="mt-1 text-xs text-fg-muted">
                  Story, pricing, discount code, and claims compliance.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Title</label>
                  <input
                    {...form.register("title")}
                    disabled={!canEdit}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-fg">Slug</label>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          form.setValue("slug", slugify(form.getValues("title")), { shouldDirty: true })
                        }
                        className="text-[11px] font-medium text-accent hover:underline"
                      >
                        Auto from title
                      </button>
                    )}
                  </div>
                  <input
                    {...form.register("slug")}
                    disabled={!canEdit}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Story / Description</label>
                <textarea
                  rows={4}
                  {...form.register("description")}
                  disabled={!canEdit}
                  className="min-h-[104px] w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-sm leading-relaxed text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Pillar</label>
                  <select
                    {...form.register("pillar")}
                    disabled={!canEdit}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  >
                    <option value="">None</option>
                    {pillars.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Bundle price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("price_dollars")}
                    disabled={!canEdit}
                    placeholder="99.00"
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Discount code</label>
                  <input
                    {...form.register("discount_code")}
                    disabled={!canEdit}
                    placeholder="GALENE15"
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Bundle URL (optional)</label>
                <input
                  type="url"
                  {...form.register("url")}
                  disabled={!canEdit}
                  placeholder="https://partner.com/bundle?ref=galene"
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
                  <input
                    type="checkbox"
                    {...form.register("claims_reviewed")}
                    disabled={!canEdit}
                    className="accent-accent"
                  />
                  <span>Marketing & health claims reviewed</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-fg-muted">Sort</label>
                  <input
                    type="number"
                    {...form.register("sort")}
                    disabled={!canEdit}
                    className="h-9 w-20 rounded-md border border-border bg-bg px-2.5 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>
            </>
          )}

          {tab === "Spanish" && (
            <>
              <div className="border-b border-border pb-4">
                <h2 className="text-sm font-semibold text-fg">Spanish localization</h2>
                <p className="mt-1 text-xs text-fg-muted">Optional Spanish bundle copy.</p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Title (ES)</label>
                <input
                  {...form.register("title_es")}
                  disabled={!canEdit}
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Description (ES)</label>
                <textarea
                  rows={4}
                  {...form.register("description_es")}
                  disabled={!canEdit}
                  className="min-h-[104px] w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-sm leading-relaxed text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>
            </>
          )}

          {canEdit && (
            <div className="flex justify-end border-t border-border pt-5">
              <button
                type="submit"
                disabled={saveState === "saving"}
                className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
              >
                Save changes
              </button>
            </div>
          )}
        </form>
      )}

      {tab === "Items" && (
        <div className="space-y-6 rounded-lg border border-border bg-bg-subtle p-6 sm:p-8">
          <div className="border-b border-border pb-4">
            <h2 className="text-sm font-semibold text-fg">Bundle items ({items.length})</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Add partner products and set display order and quantities.
            </p>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-fg-muted">No products added yet. Pick from below.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border bg-bg">
              {items.map((item, idx) => {
                const prod = productMap.get(item.product_id);
                return (
                  <li
                    key={item.product_id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">
                        {prod?.name ?? item.product_id}
                      </p>
                      <p className="font-mono text-[11px] text-fg-muted">{prod?.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-fg-muted">Qty</label>
                      <input
                        type="number"
                        min={1}
                        disabled={!canEdit}
                        value={item.quantity}
                        onChange={(e) =>
                          void updateItemQuantity(
                            item.product_id,
                            Math.max(1, Number.parseInt(e.target.value, 10) || 1)
                          )
                        }
                        className="h-8 w-16 rounded-md border border-border bg-bg px-2 text-center font-mono text-xs text-fg"
                      />
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => void moveItem(idx, -1)}
                            className="rounded border border-border p-1 text-fg-muted hover:bg-bg-muted hover:text-fg disabled:opacity-40"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === items.length - 1}
                            onClick={() => void moveItem(idx, 1)}
                            className="rounded border border-border p-1 text-fg-muted hover:bg-bg-muted hover:text-fg disabled:opacity-40"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeItem(item.product_id)}
                            className="rounded border border-border p-1 text-fg-muted hover:bg-bg-muted hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {canEdit && (
            <div className="space-y-3 border-t border-border pt-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-fg-muted" />
                <input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Search products to add…"
                  className="h-9 w-full rounded-md border border-border bg-bg pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border bg-bg">
                {availableProducts.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-fg-muted">No matching products available.</p>
                ) : (
                  availableProducts.slice(0, 15).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-4 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium text-fg">{p.name}</p>
                        <p className="font-mono text-[11px] text-fg-muted">{p.slug}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void addItem(p.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-subtle px-2.5 py-1 text-xs font-medium text-fg hover:bg-bg-muted"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "Matching" && (
        <div className="space-y-6 rounded-lg border border-border bg-bg-subtle p-6 sm:p-8">
          <div className="border-b border-border pb-4">
            <h2 className="text-sm font-semibold text-fg">Trigger tag weights (0–5)</h2>
            <p className="mt-1 text-xs text-fg-muted">
              recompute_recommendations() scores bundles over a member&apos;s last 30 days of synced tags.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {triggerTags.map((tag) => {
              const weight = weights.get(tag.slug) ?? 0;
              return (
                <div
                  key={tag.slug}
                  className="flex items-center justify-between gap-4 rounded-md border border-border bg-bg px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{tag.label}</p>
                    <p className="text-[11px] uppercase tracking-wider text-fg-muted">
                      {tag.pillar}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={1}
                      disabled={!canEdit}
                      value={weight}
                      onChange={(e) => void setWeight(tag.slug, Number(e.target.value))}
                      className="w-24 accent-accent"
                    />
                    <span className="w-4 text-right font-mono text-xs font-medium text-fg">
                      {weight}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-md border border-border bg-bg p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Who would get this bundle
            </h3>
            {matchingPreview.length === 0 ? (
              <p className="mt-2 text-xs text-fg-muted">
                Set at least one tag weight above 0 to surface this bundle in personalized recommendations.
              </p>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-fg">
                Members who frequently tag{" "}
                {matchingPreview
                  .slice(0, 4)
                  .map((m) => `${m.tag.label} (+${m.weight})`)
                  .join(", ")}
                .
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "Media" && (
        <div className="space-y-6 rounded-lg border border-border bg-bg-subtle p-6 sm:p-8">
          <MediaUploadField
            kind="bundle"
            entityId={bundle.id}
            accept="image/jpeg,image/png,image/webp"
            label="Hero image"
            hint="JPG, PNG, or WebP · max 5 MB"
            currentKey={bundle.hero_image_key}
            disabled={!canEdit}
            onUploaded={async (res) => {
              await saveFields({ hero_image_key: res.key });
            }}
          />
          {heroUrl && (
            <div>
              <p className="mb-2 text-xs font-medium text-fg-muted">Preview</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroUrl}
                alt={bundle.title}
                className="h-44 rounded-md border border-border object-cover"
              />
            </div>
          )}
        </div>
      )}

      {tab === "History" && <AuditHistoryTab tableName="bundles" rowId={bundle.id} />}

      <ConfirmDialog
        open={archiveOpen}
        title="Archive bundle?"
        description="This hides the bundle from recommendations and the catalog without deleting its R2 hero image."
        confirmLabel="Archive"
        destructive
        loading={busyAction}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => void changeStatus("archived")}
      />
    </div>
  );
}
