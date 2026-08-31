import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { oauthCallbackRedirectUrl } from "./oauth-callback-redirect";

function requestFor(url: string) {
  return new NextRequest(new URL(url));
}

describe("oauthCallbackRedirectUrl", () => {
  it("redirects root OAuth codes to the auth callback route", () => {
    const redirect = oauthCallbackRedirectUrl(
      requestFor(
        "https://chessloom.vercel.app/?code=abc123&state=xyz",
      ),
    );

    expect(redirect?.pathname).toBe("/auth/callback");
    expect(redirect?.searchParams.get("code")).toBe("abc123");
    expect(redirect?.searchParams.get("state")).toBe("xyz");
    expect(redirect?.searchParams.get("next")).toBe("/dashboard");
    expect(redirect?.searchParams.get("event")).toBe("oauth");
  });

  it("leaves requests already on the callback route alone", () => {
    expect(
      oauthCallbackRedirectUrl(
        requestFor(
          "https://chessloom.vercel.app/auth/callback?code=abc123",
        ),
      ),
    ).toBeNull();
  });

  it("ignores unrelated query params", () => {
    expect(
      oauthCallbackRedirectUrl(
        requestFor("https://chessloom.vercel.app/?utm_source=newsletter"),
      ),
    ).toBeNull();
  });
});
