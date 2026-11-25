"use client";

import { useEffect } from "react";
import {
  detectDevice,
  detectInAppBrowser,
  getOrSaveFirstTouch,
  initAnalytics,
  track,
} from "@/lib/analytics";

export function LandingTracker() {
  useEffect(() => {
    initAnalytics();
    const attr = getOrSaveFirstTouch();
    const ua = navigator.userAgent || "";

    track("landing_view", {
      utm: attr.utm,
      referrer: attr.referrer || undefined,
      in_app_browser: detectInAppBrowser(ua),
      device: detectDevice(ua),
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get("canceled") === "1") {
      track("checkout_canceled");
    }

    // Section visibility tracking (once per section)
    const seenSections = new Set<string>();
    const sections = document.querySelectorAll<HTMLElement>("section[data-section]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const name = entry.target.getAttribute("data-section");
          if (name && !seenSections.has(name)) {
            seenSections.add(name);
            track("section_view", { section: name });
          }
        }
      },
      { threshold: 0.3 }
    );
    sections.forEach((s) => observer.observe(s));

    // Scroll depth tracking (25 / 50 / 75 / 100 once each)
    const seenDepths = new Set<number>();
    const thresholds = [25, 50, 75, 100] as const;
    function onScroll() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / docHeight) * 100));
      for (const t of thresholds) {
        if (pct >= t && !seenDepths.has(t)) {
          seenDepths.add(t);
          track("scroll_depth", { percent: t });
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
