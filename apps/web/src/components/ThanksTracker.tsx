"use client";

import { useEffect } from "react";
import { initAnalytics, track } from "@/lib/analytics";

export function ThanksTracker() {
  useEffect(() => {
    initAnalytics();
    track("thanks_view");
  }, []);

  return null;
}
