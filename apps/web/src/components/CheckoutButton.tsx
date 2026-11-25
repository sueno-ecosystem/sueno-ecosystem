"use client";

import { useState } from "react";
import { getUtm } from "@/lib/utm";

export function CheckoutButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utm: getUtm() }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong. Try again.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
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
