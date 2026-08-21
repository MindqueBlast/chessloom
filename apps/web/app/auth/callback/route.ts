import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

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

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const event = safeAuthEvent(request.nextUrl.searchParams.get("event"));

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?auth=callback-error", request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?auth=callback-error", request.url),
    );
  }

  let destination = new URL(next, request.url);

  if (destination.origin !== request.nextUrl.origin) {
    destination = new URL("/dashboard", request.url);
  }

  destination.searchParams.set("auth", event);

  return NextResponse.redirect(destination);
}
