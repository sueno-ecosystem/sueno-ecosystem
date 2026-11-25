"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Json } from "@sueno/shared";
import { slugify } from "@/lib/format";

export interface ValidationWaitlistRow {
  id: string;
  utm: Json | null;
  created_at: string;
}

export interface ValidationPresaleRow {
  stripe_session_id: string;
  amount_cents: number;
  utm: Json | null;
  created_at: string;
}

const SOURCES = ["tiktok", "instagram", "youtube", "other"] as const;
const WINDOWS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "All time", days: 0 },
] as const;

function readUtmField(utm: Json | null, key: string): string {
  if (!utm || typeof utm !== "object" || Array.isArray(utm)) return "";
  const val = (utm as Record<string, unknown>)[key];
  return typeof val === "string" ? val : "";
}

export function ValidationDashboard({
  waitlist,
  presales,
  posthogDashboardUrl,
  defaultSiteUrl,
}: {
  waitlist: ValidationWaitlistRow[];
  presales: ValidationPresaleRow[];
  posthogDashboardUrl: string | null;
  defaultSiteUrl: string;
}) {
  const [nowMs] = useState(() => Date.now());
  const [visitsInput, setVisitsInput] = useState<string>("");
  const [windowDays, setWindowDays] = useState<number>(30);
  const [source, setSource] = useState<(typeof SOURCES)[number]>("tiktok");
  const [videoSlug, setVideoSlug] = useState<string>("4am-racing-thoughts");
  const [copied, setCopied] = useState(false);

  const visits = Math.max(0, Number.parseInt(visitsInput, 10) || 0);
  const waitlistCount = waitlist.length;
  const presaleCount = presales.length;
  const waitlistRate = visits > 0 ? (waitlistCount / visits) * 100 : null;
  const presaleRate = visits > 0 ? (presaleCount / visits) * 100 : null;

  const filteredRows = useMemo(() => {
    const cutoff = windowDays > 0 ? nowMs - windowDays * 86_400_000 : 0;

    type Agg = {
      utmContent: string;
      utmSource: string;
      waitlist: number;
      presales: number;
      revenueCents: number;
    };

    const map = new Map<string, Agg>();

    for (const w of waitlist) {
      if (cutoff && new Date(w.created_at).getTime() < cutoff) continue;
      const content = readUtmField(w.utm, "utm_content") || "(direct / untagged)";
      const src = readUtmField(w.utm, "utm_source") || "—";
      const cur = map.get(content) ?? {
        utmContent: content,
        utmSource: src,
        waitlist: 0,
        presales: 0,
        revenueCents: 0,
      };
      cur.waitlist += 1;
      map.set(content, cur);
    }

    for (const p of presales) {
      if (cutoff && new Date(p.created_at).getTime() < cutoff) continue;
      const content = readUtmField(p.utm, "utm_content") || "(direct / untagged)";
      const src = readUtmField(p.utm, "utm_source") || "—";
      const cur = map.get(content) ?? {
        utmContent: content,
        utmSource: src,
        waitlist: 0,
        presales: 0,
        revenueCents: 0,
      };
      cur.presales += 1;
      cur.revenueCents += p.amount_cents;
      map.set(content, cur);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.presales - a.presales || b.waitlist - a.waitlist
    );
  }, [waitlist, presales, windowDays, nowMs]);

  const cleanSlug = slugify(videoSlug) || "video-slug";
  const baseUrl = defaultSiteUrl.replace(/\/+$/, "");
  const campaignUrl = `${baseUrl}/?utm_source=${source}&utm_medium=social&utm_campaign=launch&utm_content=${cleanSlug}`;

  async function copyUrl() {
    await navigator.clipboard.writeText(campaignUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Validation</h1>
          <p className="text-sm text-fg-muted">
            Week 0 demand validation against docs/spec.md targets (1,000+ visits · ≥3% waitlist · ≥20 pre-sales).
          </p>
        </div>

        {posthogDashboardUrl ? (
          <a
            href={posthogDashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-bg-subtle px-3.5 text-xs font-medium text-fg hover:bg-bg-muted"
          >
            <span>Open PostHog dashboard</span>
            <ExternalLink className="h-3.5 w-3.5 text-fg-muted" />
          </a>
        ) : (
          <span className="rounded-md border border-border bg-bg-subtle px-3 py-1.5 text-xs text-fg-muted">
            Set NEXT_PUBLIC_POSTHOG_DASHBOARD_URL to link PostHog
          </span>
        )}
      </div>

      {/* Success bar cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg-subtle p-5">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>Visits (from PostHog)</span>
            <span>Target: 1,000+</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={visitsInput}
              onChange={(e) => setVisitsInput(e.target.value)}
              placeholder="Enter visits…"
              className="h-9 w-full rounded-md border border-border bg-bg px-3 font-mono text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-bg-muted">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.min(100, (visits / 1000) * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-subtle p-5">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>Waitlist joins</span>
            <span>Target: ≥3% of visits</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-semibold tracking-tight">{waitlistCount}</p>
            <p className="font-mono text-xs text-fg-muted">
              {waitlistRate !== null ? `${waitlistRate.toFixed(1)}%` : "Enter visits for %"}
            </p>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-bg-muted">
            <div
              className="h-full bg-accent transition-all"
              style={{
                width: `${waitlistRate !== null ? Math.min(100, (waitlistRate / 3) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-subtle p-5">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>Founding pre-sales</span>
            <span>Target: ≥20</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-semibold tracking-tight">{presaleCount}</p>
            <p className="font-mono text-xs text-fg-muted">
              {presaleRate !== null ? `${presaleRate.toFixed(2)}% conv.` : `${presaleCount} / 20`}
            </p>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-bg-muted">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.min(100, (presaleCount / 20) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Campaign link builder */}
      <section className="rounded-lg border border-border bg-bg-subtle p-6">
        <h2 className="text-sm font-semibold text-fg">Campaign link builder</h2>
        <p className="mt-1 text-xs text-fg-muted">
          Generate UTM-tagged links for each TikTok or Instagram video.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-fg">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as (typeof SOURCES)[number])}
              className="h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg focus:border-accent focus:outline-none"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-fg">Video slug (utm_content)</label>
            <input
              value={videoSlug}
              onChange={(e) => setVideoSlug(e.target.value)}
              placeholder="4am-racing-thoughts"
              className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-bg px-3.5 py-2.5">
          <code className="break-all font-mono text-xs text-fg">{campaignUrl}</code>
          <button
            type="button"
            onClick={copyUrl}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-bg-subtle px-3 text-xs font-medium text-fg hover:bg-bg-muted"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </section>

      {/* Per-video table */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-fg">By video (utm_content)</h2>
          <div className="flex items-center gap-1.5">
            {WINDOWS.map((w) => (
              <button
                key={w.label}
                type="button"
                onClick={() => setWindowDays(w.days)}
                className={`h-8 rounded-md border px-2.5 text-xs transition-colors ${
                  windowDays === w.days
                    ? "border-accent bg-accent/10 font-medium text-fg"
                    : "border-border bg-bg-subtle text-fg-muted hover:text-fg"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-bg">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border bg-bg-subtle text-xs text-fg-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">utm_content</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium text-right">Waitlist</th>
                <th className="px-4 py-2.5 font-medium text-right">Pre-sales</th>
                <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-fg-muted">
                    No waitlist or pre-sale rows recorded for this window yet.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.utmContent} className="hover:bg-bg-subtle">
                    <td className="px-4 py-2.5 font-mono text-xs text-fg">{row.utmContent}</td>
                    <td className="px-4 py-2.5 text-xs text-fg-muted">{row.utmSource}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-fg">
                      {row.waitlist}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-fg">
                      {row.presales}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-fg">
                      ${(row.revenueCents / 100).toFixed(0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
