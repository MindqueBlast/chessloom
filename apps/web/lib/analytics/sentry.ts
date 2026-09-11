type SentryClient = {
  init: (options: { dsn: string; tracesSampleRate?: number }) => void;
  captureException: (error: unknown) => void;
};

declare global {
  interface Window {
    Sentry?: SentryClient;
  }
}

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Optional browser Sentry loader. No-ops unless NEXT_PUBLIC_SENTRY_DSN is set.
 */
export function loadSentryBrowser() {
  if (typeof window === "undefined" || !dsn || window.Sentry) {
    return;
  }

  const script = document.createElement("script");
  script.src =
    "https://browser.sentry-cdn.com/8.55.0/bundle.tracing.min.js";
  script.crossOrigin = "anonymous";
  script.onload = () => {
    window.Sentry?.init({
      dsn,
      tracesSampleRate: 0.1,
    });
  };
  document.head.appendChild(script);
}

export function captureException(error: unknown) {
  console.error(error);
  try {
    if (typeof window !== "undefined") {
      window.Sentry?.captureException(error);
    }
  } catch {
    // Ignore reporter failures.
  }
}
