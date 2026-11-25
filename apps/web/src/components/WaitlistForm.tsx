"use client";

import { useState } from "react";
import { getUtm } from "@/lib/utm";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, utm: getUtm() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't save your email. Try again.");
      setState("done");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Couldn't save your email. Try again.");
    }
  }

  if (state === "done") {
    return <p className="text-accent">You&apos;re on the list. We&apos;ll email you when Sueño opens.</p>;
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <label htmlFor="waitlist-email" className="sr-only">Email</label>
      <input
        id="waitlist-email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-full border border-line bg-card px-5 py-3 text-foreground placeholder:text-muted focus:border-accent-2 focus:outline-none"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="rounded-full border border-accent-2 px-6 py-3 font-semibold text-foreground transition hover:bg-accent-2/15 disabled:opacity-60"
      >
        {state === "loading" ? "Saving…" : "Join the waitlist"}
      </button>
      {state === "error" && <p className="text-sm text-red-300 sm:basis-full">{message}</p>}
    </form>
  );
}
