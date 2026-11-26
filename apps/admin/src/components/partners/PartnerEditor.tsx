"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import type { Database } from "@galene/shared";
import type { AdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, publicMediaUrl } from "@/lib/format";
import { AuditHistoryTab } from "@/components/AuditHistoryTab";
import { MediaUploadField } from "@/components/MediaUploadField";
import { StatusBadge } from "@/components/StatusBadge";

type PartnerRow = Database["public"]["Tables"]["partners"]["Row"];
type PartnerDealRow = Database["public"]["Tables"]["partner_deals"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];

const overviewSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  website: z.string().max(500).nullable().optional(),
  status: z.enum(["prospect", "active", "paused", "ended"]),
});

const dealSchema = z.object({
  contact_name: z.string().max(160).nullable().optional(),
  contact_email: z.string().max(254).nullable().optional(),
  commission_type: z.enum(["percent", "flat", "none"]),
  commission_value: z.string().optional(),
  affiliate_network: z.string().max(120).nullable().optional(),
  affiliate_base_url: z.string().max(500).nullable().optional(),
  contract_url: z.string().max(500).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

const TABS = ["Overview", "Deal", "Products", "History"] as const;
type Tab = (typeof TABS)[number];

export function PartnerEditor({
  initialPartner,
  initialDeal,
  products,
  role,
}: {
  initialPartner: PartnerRow;
  initialDeal: PartnerDealRow | null;
  products: ProductRow[];
  role: AdminRole;
}) {
  const router = useRouter();
  const canEdit = role === "owner" || role === "editor";
  const [partner, setPartner] = useState<PartnerRow>(initialPartner);
  const [tab, setTab] = useState<Tab>("Overview");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [toast, setToast] = useState<string | null>(null);

  const overviewForm = useForm<z.infer<typeof overviewSchema>>({
    resolver: zodResolver(overviewSchema) as never,
    defaultValues: {
      name: initialPartner.name,
      website: initialPartner.website ?? "",
      status: (["prospect", "active", "paused", "ended"].includes(initialPartner.status)
        ? initialPartner.status
        : "prospect") as "prospect" | "active" | "paused" | "ended",
    },
  });

  const dealForm = useForm<z.infer<typeof dealSchema>>({
    resolver: zodResolver(dealSchema) as never,
    defaultValues: {
      contact_name: initialDeal?.contact_name ?? "",
      contact_email: initialDeal?.contact_email ?? "",
      commission_type: (["percent", "flat", "none"].includes(
        initialDeal?.commission_type ?? "percent"
      )
        ? initialDeal?.commission_type ?? "percent"
        : "percent") as "percent" | "flat" | "none",
      commission_value:
        initialDeal?.commission_value !== null && initialDeal?.commission_value !== undefined
          ? String(initialDeal.commission_value)
          : "",
      affiliate_network: initialDeal?.affiliate_network ?? "",
      affiliate_base_url: initialDeal?.affiliate_base_url ?? "",
      contract_url: initialDeal?.contract_url ?? "",
      notes: initialDeal?.notes ?? "",
    },
  });

  const logoUrl = publicMediaUrl(partner.logo_key);

  async function saveOverview(values: z.infer<typeof overviewSchema>) {
    if (!canEdit) return;
    setSaveState("saving");
    setToast(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("partners")
      .update({
        name: values.name.trim(),
        website: values.website?.trim() || null,
        status: values.status,
      })
      .eq("id", partner.id)
      .select("*")
      .single();

    if (error) {
      setSaveState("error");
      setToast(error.message);
      return;
    }
    setPartner(data);
    setSaveState("saved");
    overviewForm.reset(values);
    router.refresh();
  }

  async function saveDeal(values: z.infer<typeof dealSchema>) {
    if (!canEdit) return;
    setSaveState("saving");
    setToast(null);
    const parsedVal =
      values.commission_value && values.commission_value.trim() !== ""
        ? Number(values.commission_value)
        : null;

    const supabase = createClient();
    const { error } = await supabase.from("partner_deals").upsert(
      {
        partner_id: partner.id,
        contact_name: values.contact_name?.trim() || null,
        contact_email: values.contact_email?.trim() || null,
        commission_type: values.commission_type,
        commission_value: Number.isFinite(parsedVal) ? parsedVal : null,
        affiliate_network: values.affiliate_network?.trim() || null,
        affiliate_base_url: values.affiliate_base_url?.trim() || null,
        contract_url: values.contract_url?.trim() || null,
        notes: values.notes?.trim() || null,
      },
      { onConflict: "partner_id" }
    );

    if (error) {
      setSaveState("error");
      setToast(error.message);
      return;
    }
    setSaveState("saved");
    dealForm.reset(values);
    setToast("Deal terms saved.");
    router.refresh();
  }

  async function updateLogoKey(key: string) {
    if (!canEdit) return;
    setSaveState("saving");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("partners")
      .update({ logo_key: key })
      .eq("id", partner.id)
      .select("*")
      .single();
    if (error) {
      setSaveState("error");
      setToast(error.message);
      return;
    }
    setPartner(data);
    setSaveState("saved");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Link
            href="/partners"
            className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Partners</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight">{partner.name}</h1>
            <StatusBadge status={partner.status} />
            <span className="text-xs text-fg-muted">
              {saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved"}
            </span>
          </div>
          <p className="text-xs text-fg-muted">Updated {formatDateTime(partner.updated_at)}</p>
        </div>
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

      {tab === "Overview" && (
        <form
          onSubmit={overviewForm.handleSubmit(saveOverview)}
          className="space-y-6 rounded-lg border border-border bg-bg-subtle p-6 sm:p-8"
        >
          <div className="border-b border-border pb-4">
            <h2 className="text-sm font-semibold text-fg">Public partner profile</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Visible in the app when status is Active.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-fg">Name</label>
              <input
                {...overviewForm.register("name")}
                disabled={!canEdit}
                className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-fg">Status</label>
              <select
                {...overviewForm.register("status")}
                disabled={!canEdit}
                className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-fg">Website</label>
            <input
              type="url"
              {...overviewForm.register("website")}
              disabled={!canEdit}
              placeholder="https://example.com"
              className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
            />
          </div>

          <div className="border-t border-border pt-6">
            <MediaUploadField
              kind="partner"
              entityId={partner.id}
              accept="image/png,image/jpeg,image/webp"
              label="Partner logo"
              hint="PNG, JPG, or WebP · max 5 MB"
              currentKey={partner.logo_key}
              disabled={!canEdit}
              onUploaded={async (res) => {
                await updateLogoKey(res.key);
              }}
            />
            {logoUrl && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={partner.name}
                  className="h-14 rounded-md border border-border bg-bg p-1.5 object-contain"
                />
              </div>
            )}
          </div>

          {canEdit && (
            <div className="flex justify-end border-t border-border pt-5">
              <button
                type="submit"
                disabled={saveState === "saving"}
                className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
              >
                Save profile
              </button>
            </div>
          )}
        </form>
      )}

      {tab === "Deal" && (
        <form
          onSubmit={dealForm.handleSubmit(saveDeal)}
          className="space-y-6 rounded-lg border border-border bg-bg-subtle p-6 sm:p-8"
        >
          <div className="border-b border-border pb-4">
            <h2 className="text-sm font-semibold text-fg">Private deal terms</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Stored in partner_deals (readable & editable by owners and editors only).
            </p>
          </div>

          {!canEdit ? (
            <p className="text-sm text-fg-muted">Only owners and editors can view or edit deal terms.</p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Contact name</label>
                  <input
                    {...dealForm.register("contact_name")}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Contact email</label>
                  <input
                    type="email"
                    {...dealForm.register("contact_email")}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Commission type</label>
                  <select
                    {...dealForm.register("commission_type")}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat ($)</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Commission value</label>
                  <input
                    type="number"
                    step="0.01"
                    {...dealForm.register("commission_value")}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Affiliate network</label>
                  <input
                    {...dealForm.register("affiliate_network")}
                    placeholder="Impact / ShareASale / Direct"
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Affiliate base URL</label>
                  <input
                    type="url"
                    {...dealForm.register("affiliate_base_url")}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Contract URL</label>
                  <input
                    type="url"
                    {...dealForm.register("contract_url")}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Notes</label>
                <textarea
                  rows={4}
                  {...dealForm.register("notes")}
                  className="min-h-[104px] w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-sm leading-relaxed text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="flex justify-end border-t border-border pt-5">
                <button
                  type="submit"
                  disabled={saveState === "saving"}
                  className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
                >
                  Save deal terms
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {tab === "Products" && (
        <div className="rounded-lg border border-border bg-bg-subtle p-6">
          <h2 className="text-sm font-semibold text-fg">Products ({products.length})</h2>
          {products.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">No products linked to this partner yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-bg">
              {products.map((prod) => (
                <li key={prod.id}>
                  <Link
                    href={`/products/${prod.id}`}
                    className="flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-subtle"
                  >
                    <div>
                      <p className="font-medium text-fg">{prod.name}</p>
                      <p className="font-mono text-[11px] text-fg-muted">{prod.slug}</p>
                    </div>
                    <StatusBadge status={prod.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "History" && <AuditHistoryTab tableName="partners" rowId={partner.id} />}
    </div>
  );
}
