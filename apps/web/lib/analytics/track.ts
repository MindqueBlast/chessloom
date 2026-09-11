type AnalyticsProps = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: AnalyticsProps) => void;
      identify?: (id: string, properties?: AnalyticsProps) => void;
    };
  }
}

/**
 * Fire-and-forget product analytics. No-ops when PostHog is not configured.
 */
export function trackEvent(event: string, properties?: AnalyticsProps) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.posthog?.capture(event, properties);
  } catch {
    // Never block UX on analytics failures.
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, properties ?? {});
  }
}
