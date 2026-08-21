"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
};

const invalidCredentialsMessage = "Enter a valid email address and password.";

function credentialsFrom(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return null;
  }

  return { email: email.trim(), password };
}

async function callbackUrl(next: string, event: string) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;

  if (!siteUrl) {
    throw new Error("Unable to determine the application URL.");
  }

  const url = new URL("/auth/callback", siteUrl);
  url.searchParams.set("next", next);
  url.searchParams.set("event", event);

  return url.toString();
}

export async function login(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = credentialsFrom(formData);

  if (!credentials) {
    return { error: invalidCredentialsMessage };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard?auth=login");
}

export async function signup(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = credentialsFrom(formData);

  if (!credentials) {
    return { error: invalidCredentialsMessage };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      emailRedirectTo: await callbackUrl("/dashboard", "confirmed"),
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect("/dashboard?auth=signup");
  }

  return {
    success: "Check your email to confirm your account.",
  };
}

export async function requestPasswordReset(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: await callbackUrl("/reset-password", "recovery"),
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "If an account exists, a password reset link is on its way.",
  };
}

export async function signInWithGoogle(
  _previousState: AuthActionState,
  _formData: FormData,
): Promise<AuthActionState> {
  void _formData;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: await callbackUrl("/dashboard", "oauth"),
    },
  });

  if (error || !data.url) {
    return { error: error?.message ?? "Google sign-in could not be started." };
  }

  redirect(data.url);
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length < 8) {
    return { error: "Use a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard?auth=password-updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?auth=signed-out");
}
