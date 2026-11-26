"use client";

import posthog from "posthog-js";
import { getUtm, type Utm } from "@/lib/utm";

const ATTR_COOKIE = "galene_attr";
const THIRTY_DAYS_SEC = 60 * 60 * 24 * 30;

export type InAppBrowser = "tiktok" | "instagram" | "facebook" | "none";
export type DeviceType = "mobile" | "tablet" | "desktop";

export interface FirstTouchAttribution {
  utm: Utm;
  referrer: string;
}

let initialized = false;

export function detectInAppBrowser(ua: string): InAppBrowser {
  if (/tiktok|bytedancewebview|musical_ly/i.test(ua)) return "tiktok";
  if (/instagram/i.test(ua)) return "instagram";
  if (/fban|fbav|fb_iab/i.test(ua)) return "facebook";
  return "none";
}

export function detectDevice(ua: string): DeviceType {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "mobile";
  return "desktop";
}

function readAttrCookie(): FirstTouchAttribution | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ATTR_COOKIE}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("="))) as FirstTouchAttribution;
  } catch {
    return null;
  }
}

export function getOrSaveFirstTouch(): FirstTouchAttribution {
  const existing = readAttrCookie();
  if (existing) return existing;

  const utm = getUtm();
  const referrer = typeof document !== "undefined" ? document.referrer || "" : "";
  const attr: FirstTouchAttribution = { utm, referrer };

  if (typeof document !== "undefined") {
    const encoded = encodeURIComponent(JSON.stringify(attr));
    document.cookie = `${ATTR_COOKIE}=${encoded}; Max-Age=${THIRTY_DAYS_SEC}; Path=/; SameSite=Lax`;
  }
  return attr;
}

export function initAnalytics(): void {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  const attr = getOrSaveFirstTouch();
  const ua = navigator.userAgent || "";
  const inAppBrowser = detectInAppBrowser(ua);
  const device = detectDevice(ua);

  posthog.init(key, {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    respect_dnt: true,
    person_profiles: "identified_only",
    capture_pageview: false,
    session_recording: {
      maskAllInputs: true,
    },
  });

  posthog.register({
    ...attr.utm,
    referrer: attr.referrer || undefined,
    in_app_browser: inAppBrowser,
    device,
  });

  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  const safe: Record<string, unknown> = {};
  if (properties) {
    for (const [k, v] of Object.entries(properties)) {
      if (k === "email" || k === "name") continue;
      safe[k] = v;
    }
  }
  posthog.capture(event, safe);
}

export function getDistinctId(): string | undefined {
  if (!initialized) return undefined;
  return posthog.get_distinct_id();
}

export function onFeatureFlagsReady(cb: (variant: string | boolean | undefined) => void): () => void {
  if (!initialized) return () => {};
  return posthog.onFeatureFlags(() => {
    cb(posthog.getFeatureFlag("landing-hook"));
  });
}
