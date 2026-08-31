import type { NextRequest } from "next/server";

export function oauthCallbackRedirectUrl(
  request: NextRequest,
): URL | null {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/auth/callback") {
    return null;
  }

  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (!code && !oauthError) {
    return null;
  }

  const callbackUrl = new URL("/auth/callback", request.url);

  searchParams.forEach((value, key) => {
    callbackUrl.searchParams.set(key, value);
  });

  if (!callbackUrl.searchParams.has("next")) {
    callbackUrl.searchParams.set("next", "/dashboard");
  }

  if (!callbackUrl.searchParams.has("event")) {
    callbackUrl.searchParams.set("event", "oauth");
  }

  return callbackUrl;
}
