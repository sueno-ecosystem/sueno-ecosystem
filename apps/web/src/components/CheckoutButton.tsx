"use client";

import { useState } from "react";
import { getDistinctId, getOrSaveFirstTouch, track } from "@/lib/analytics";

export function CheckoutButton({
  children,
  location = "hero",
  className = "",
}: {
  children: React.ReactNode;
  location?: "hero" | "founding" | "header";
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    track("cta_click", { location });
    track("checkout_start", { location });
    setLoading(true);
    setError(null);
    try {
      const { utm } = getOrSaveFirstTouch();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utm, distinct_id: getDistinctId() }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong. Try again.");
      window.location.href = data.url;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong. Try again.";
      track("checkout_error", { message });
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:items-start">
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className={`rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-[#1a1408] transition hover:brightness-110 disabled:opacity-60 ${className}`}
      >
        {loading ? "Opening checkout…" : children}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
