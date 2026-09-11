"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/track";

const FIRST_SEEN_KEY = "chessloom-first-seen";
const RETURN_DAY7_KEY = "chessloom-return-day7-fired";

/**
 * Fires return_day_7 once when the user revisits 7+ days after first seen.
 */
export function ReturnTracker() {
  useEffect(() => {
    try {
      const now = Date.now();
      const firstSeenRaw = window.localStorage.getItem(FIRST_SEEN_KEY);
      if (!firstSeenRaw) {
        window.localStorage.setItem(FIRST_SEEN_KEY, String(now));
        trackEvent("return_day_1", { first_visit: true });
        return;
      }

      const firstSeen = Number(firstSeenRaw);
      if (!Number.isFinite(firstSeen)) {
        window.localStorage.setItem(FIRST_SEEN_KEY, String(now));
        return;
      }

      const days = (now - firstSeen) / (1000 * 60 * 60 * 24);
      if (days >= 1 && days < 7) {
        trackEvent("return_day_1", { days_since_first: Math.floor(days) });
      }

      if (days >= 7 && !window.localStorage.getItem(RETURN_DAY7_KEY)) {
        window.localStorage.setItem(RETURN_DAY7_KEY, "1");
        trackEvent("return_day_7", { days_since_first: Math.floor(days) });
      }
    } catch {
      // Ignore storage failures.
    }
  }, []);

  return null;
}
