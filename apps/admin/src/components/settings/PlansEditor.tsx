"use client";

import { useState } from "react";
import { publicMediaUrl } from "@/lib/format";

export interface StripePlanItem {
  priceId: string;
  productId: string;
  productName: string;
  productDescription: string;
  productImage: string | null;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
  active: boolean;
}

export interface R2ImageOption {
  label: string;
  key: string;
  url: string;
}

export function PlansEditor({
  plans,
  r2Images,
}: {
  plans: StripePlanItem[];
  r2Images: R2ImageOption[];
}) {
  const [items, setItems] = useState<StripePlanItem[]>(plans);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function savePlan(plan: StripePlanItem, next: { name: string; description: string; imageUrl: string }) {
    setSavingId(plan.productId);
    setToast(null);
    try {
      const res = await fetch("/api/stripe/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: plan.productId,
          name: next.name,
          description: next.description,
          imageUrl: next.imageUrl || null,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        name?: string;
        description?: string | null;
        images?: string[];
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to update Stripe product.");

      setItems((prev) =>
        prev.map((p) =>
          p.productId === plan.productId
            ? {
                ...p,
                productName: data.name ?? next.name,
                productDescription: data.description ?? next.description,
                productImage: data.images?.[0] ?? (next.imageUrl || p.productImage),
              }
            : p
        )
      );
      setToast(`Updated ${data.name ?? next.name} in Stripe & logged to audit_log.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to update Stripe product.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Plans & Checkout</h1>
        <p className="text-sm text-fg-muted">
          Push product names, descriptions, and R2 checkout images to Stripe (one-way: admin → Stripe).
        </p>
      </div>

      {toast && (
        <div className="rounded-md border border-border bg-bg-subtle px-4 py-2.5 text-xs text-fg">
          {toast}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-subtle p-6 text-sm text-fg-muted">
          No Stripe prices found.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((plan) => (
            <PlanCard
              key={plan.priceId}
              plan={plan}
              r2Images={r2Images}
              saving={savingId === plan.productId}
              onSave={(next) => void savePlan(plan, next)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  r2Images,
  saving,
  onSave,
}: {
  plan: StripePlanItem;
  r2Images: R2ImageOption[];
  saving: boolean;
  onSave: (next: { name: string; description: string; imageUrl: string }) => void;
}) {
  const [name, setName] = useState(plan.productName);
  const [description, setDescription] = useState(plan.productDescription);
  const [imageUrl, setImageUrl] = useState(plan.productImage ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, description, imageUrl });
      }}
      className="space-y-5 rounded-lg border border-border bg-bg-subtle p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <p className="font-mono text-xs text-fg-muted">{plan.priceId}</p>
          <p className="mt-0.5 text-base font-semibold text-fg">
            {plan.unitAmount !== null ? `$${(plan.unitAmount / 100).toFixed(2)}` : "—"}{" "}
            <span className="text-xs font-normal uppercase text-fg-muted">
              {plan.currency}
              {plan.interval ? ` / ${plan.interval}` : " one-time"}
            </span>
          </p>
        </div>
        <span
          className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
            plan.active
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-border bg-bg text-fg-muted"
          }`}
        >
          {plan.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-fg">Product name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-fg">Checkout image (from R2)</label>
          {r2Images.length > 0 ? (
            <select
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none"
            >
              <option value="">Keep current / none</option>
              {r2Images.map((img) => (
                <option key={img.key} value={img.url}>
                  {img.label} ({img.key})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={publicMediaUrl("bundles/hero.jpg") ?? "https://media.<your-domain>/..."}
              className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-xs text-fg focus:border-accent focus:outline-none"
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-fg">Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3.5 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="submit"
          disabled={saving}
          className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Pushing to Stripe…" : "Push to Stripe"}
        </button>
      </div>
    </form>
  );
}
