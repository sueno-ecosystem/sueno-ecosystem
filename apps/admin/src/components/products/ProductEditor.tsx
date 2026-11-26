"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Check, Circle, ExternalLink } from "lucide-react";
import type { Database } from "@sueno/shared";
import type { AdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, publicMediaUrl, slugify } from "@/lib/format";
import { AuditHistoryTab } from "@/components/AuditHistoryTab";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MediaUploadField } from "@/components/MediaUploadField";
import { StatusBadge } from "@/components/StatusBadge";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type PartnerRow = Database["public"]["Tables"]["partners"]["Row"];
type PillarRow = Database["public"]["Tables"]["pillars"]["Row"];

const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string().min(1, "Slug is required").max(100),
  description: z.string().max(2000).nullable().optional(),
  partner_id: z.string().min(1),
  pillar: z.string().nullable().optional(),
  price_dollars: z.string().optional(),
  sort: z.coerce.number().int().min(0),
  claims_reviewed: z.boolean(),
  name_es: z.string().max(200).nullable().optional(),
  description_es: z.string().max(2000).nullable().optional(),
  url: z.string().max(1000).nullable().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const TABS = ["Details", "Spanish", "Media", "Link", "History"] as const;
type Tab = (typeof TABS)[number];

export function ProductEditor({
  initialProduct,
  partners,
  pillars,
  role,
}: {
  initialProduct: ProductRow;
  partners: PartnerRow[];
  pillars: PillarRow[];
  role: AdminRole;
}) {
  const router = useRouter();
  const canEdit = role === "owner" || role === "editor";
  const [product, setProduct] = useState<ProductRow>(initialProduct);
  const [tab, setTab] = useState<Tab>("Details");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [toast, setToast] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      name: initialProduct.name,
      slug: initialProduct.slug,
      description: initialProduct.description ?? "",
      partner_id: initialProduct.partner_id,
      pillar: initialProduct.pillar ?? "",
      price_dollars:
        initialProduct.price_cents !== null
          ? (initialProduct.price_cents / 100).toFixed(2)
          : "",
      sort: initialProduct.sort,
      claims_reviewed: initialProduct.claims_reviewed,
      name_es: initialProduct.name_es ?? "",
      description_es: initialProduct.description_es ?? "",
      url: initialProduct.url ?? "",
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

  const hasLink = Boolean(product.url);
  const hasImage = Boolean(product.image_key);
  const claimsReviewed = product.claims_reviewed;
  const publishReady = hasLink && hasImage && claimsReviewed;
  const imageUrl = publicMediaUrl(product.image_key);
  const watchedUrl = form.watch("url");

  async function saveFields(patch: Partial<ProductRow>) {
    if (!canEdit) return;
    setSaveState("saving");
    setToast(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", product.id)
      .select("*")
      .single();

    if (error) {
      setSaveState("error");
      setToast(error.message);
      return;
    }
    setProduct(data);
    setSaveState("saved");
    router.refresh();
  }

  async function onSubmitForm(values: ProductFormValues) {
    if (!canEdit) return;
    const priceNum =
      values.price_dollars && values.price_dollars.trim() !== ""
        ? Math.round(Number(values.price_dollars) * 100)
        : null;

    await saveFields({
      name: values.name.trim(),
      slug: slugify(values.slug) || values.slug.trim(),
      description: values.description?.trim() || null,
      partner_id: values.partner_id,
      pillar: values.pillar || null,
      price_cents: priceNum !== null && Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : null,
      sort: values.sort,
      claims_reviewed: values.claims_reviewed,
      name_es: values.name_es?.trim() || null,
      description_es: values.description_es?.trim() || null,
      url: values.url?.trim() || null,
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Products</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight">{product.name}</h1>
            <StatusBadge status={product.status} />
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
            {product.slug} · Updated {formatDateTime(product.updated_at)}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {product.status !== "published" && (
              <button
                type="button"
                disabled={busyAction || !publishReady}
                onClick={() => void changeStatus("published")}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Publish
              </button>
            )}
            {product.status !== "archived" && (
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
          {hasLink ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-fg-muted" />
          )}
          Affiliate link
        </span>
        <span className="inline-flex items-center gap-1.5">
          {hasImage ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-fg-muted" />
          )}
          Product image
        </span>
        <span className="inline-flex items-center gap-1.5">
          {claimsReviewed ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-amber-500" />
          )}
          Claims reviewed
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

      {(tab === "Details" || tab === "Spanish" || tab === "Link") && (
        <form
          onSubmit={form.handleSubmit(onSubmitForm)}
          className="space-y-6 rounded-lg border border-border bg-bg-subtle p-6 sm:p-8"
        >
          {tab === "Details" && (
            <>
              <div className="border-b border-border pb-4">
                <h2 className="text-sm font-semibold text-fg">Product details</h2>
                <p className="mt-1 text-xs text-fg-muted">
                  Catalog metadata, partner assignment, and compliance review.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Name</label>
                  <input
                    {...form.register("name")}
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
                          form.setValue("slug", slugify(form.getValues("name")), { shouldDirty: true })
                        }
                        className="text-[11px] font-medium text-accent hover:underline"
                      >
                        Auto from name
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
                <label className="block text-xs font-medium text-fg">Description</label>
                <textarea
                  rows={4}
                  {...form.register("description")}
                  disabled={!canEdit}
                  className="min-h-[104px] w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-sm leading-relaxed text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-4">
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-xs font-medium text-fg">Partner</label>
                  <select
                    {...form.register("partner_id")}
                    disabled={!canEdit}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
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
                  <label className="block text-xs font-medium text-fg">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("price_dollars")}
                    disabled={!canEdit}
                    placeholder="79.00"
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                </div>
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
                <p className="mt-1 text-xs text-fg-muted">
                  Optional Spanish name and description.
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Name (ES)</label>
                <input
                  {...form.register("name_es")}
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

          {tab === "Link" && (
            <>
              <div className="border-b border-border pb-4">
                <h2 className="text-sm font-semibold text-fg">Affiliate destination</h2>
                <p className="mt-1 text-xs text-fg-muted">
                  Partner product URL opened when members tap this product.
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Affiliate URL</label>
                <div className="flex gap-2.5">
                  <input
                    type="url"
                    {...form.register("url")}
                    disabled={!canEdit}
                    placeholder="https://partner.com/product?ref=sueno"
                    className="h-10 flex-1 rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                  {watchedUrl && (
                    <a
                      href={watchedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-border bg-bg px-3.5 text-xs font-medium text-fg hover:bg-bg-muted"
                    >
                      <span>Test link</span>
                      <ExternalLink className="h-3.5 w-3.5 text-fg-muted" />
                    </a>
                  )}
                </div>
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

      {tab === "Media" && (
        <div className="space-y-6 rounded-lg border border-border bg-bg-subtle p-6 sm:p-8">
          <MediaUploadField
            kind="product"
            entityId={product.id}
            accept="image/jpeg,image/png,image/webp"
            label="Product image"
            hint="JPG, PNG, or WebP · max 5 MB"
            currentKey={product.image_key}
            disabled={!canEdit}
            onUploaded={async (res) => {
              await saveFields({ image_key: res.key });
            }}
          />
          {imageUrl && (
            <div>
              <p className="mb-2 text-xs font-medium text-fg-muted">Preview</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={product.name}
                className="h-44 rounded-md border border-border object-cover"
              />
            </div>
          )}
        </div>
      )}

      {tab === "History" && <AuditHistoryTab tableName="products" rowId={product.id} />}

      <ConfirmDialog
        open={archiveOpen}
        title="Archive product?"
        description="This hides the product from the app without deleting its R2 image."
        confirmLabel="Archive"
        destructive
        loading={busyAction}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => void changeStatus("archived")}
      />
    </div>
  );
}
