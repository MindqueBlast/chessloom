"use client";

import { useEffect } from "react";

import { loadSentryBrowser } from "@/lib/analytics/sentry";

export function SentryInit() {
  useEffect(() => {
    loadSentryBrowser();
  }, []);

  return null;
}
