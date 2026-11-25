"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";

export default function LoginPage() {
  const { mode, cycle } = useTheme();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setStatus("loading");
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send magic link.");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <button
        type="button"
        onClick={cycle}
        title={`Theme: ${mode}`}
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-md border border-border bg-bg-subtle px-2.5 py-1 text-xs text-fg-muted hover:bg-bg-muted hover:text-fg"
      >
        {mode === "light" && <Sun className="h-3.5 w-3.5" />}
        {mode === "dark" && <Moon className="h-3.5 w-3.5" />}
        {mode === "system" && <Monitor className="h-3.5 w-3.5" />}
        <span className="capitalize">{mode}</span>
      </button>

      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-subtle p-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <h1 className="text-base font-semibold tracking-tight">Sueño Admin</h1>
        </div>
        <p className="mt-1.5 text-sm text-fg-muted">
          Sign in with a magic link. Admin access is required.
        </p>

        {!configured ? (
          <div className="mt-5 rounded-md border border-border bg-bg p-3 text-xs text-fg-muted">
            Supabase not configured. Set{" "}
            <code className="font-mono text-fg">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono text-fg">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
            <code className="font-mono text-fg">apps/admin/.env.local</code>.
          </div>
        ) : status === "sent" ? (
          <div className="mt-5 rounded-md border border-border bg-bg p-3 text-sm text-fg">
            Check <span className="font-medium">{email}</span> for your sign-in link.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-fg-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@sueno.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              />
            </div>

            {status === "error" && error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "loading" ? "Sending link…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
