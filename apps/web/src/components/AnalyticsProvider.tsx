"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { initAnalytics, track } from "@/lib/analytics";

const TRACKED_VITALS = new Set(["LCP", "INP", "CLS"]);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  useReportWebVitals((metric) => {
    if (TRACKED_VITALS.has(metric.name)) {
      track("web_vitals", { name: metric.name, value: metric.value });
    }
  });

  return <>{children}</>;
}
