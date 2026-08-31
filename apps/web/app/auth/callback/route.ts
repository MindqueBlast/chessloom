import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/route-handler";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/dashboard";
}

function safeAuthEvent(value: string | null): string {
  return value && ["confirmed", "oauth", "recovery"].includes(value)
    ? value
    : "confirmed";
}

function callbackErrorRedirect(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/login?auth=callback-error", request.url),
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError || !code) {
    return callbackErrorRedirect(request);
  }

  const next = safeNextPath(searchParams.get("next"));
  const event = safeAuthEvent(searchParams.get("event"));

  let destination = new URL(next, request.url);

  if (destination.origin !== request.nextUrl.origin) {
    destination = new URL("/dashboard", request.url);
  }

  destination.searchParams.set("auth", event);

  const response = NextResponse.redirect(destination);
  const supabase = createClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return callbackErrorRedirect(request);
  }

  return response;
}
