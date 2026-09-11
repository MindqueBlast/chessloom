"use server";

import { revalidatePath } from "next/cache";

import {
  normalizeDefaultSideMode,
  type DefaultSideMode,
} from "../settings/preferences";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionResult = { ok: true } | { ok: false; error: string };

export async function updateDefaultSideModeAction(
  value: unknown,
): Promise<SettingsActionResult> {
  let defaultSideMode: DefaultSideMode;
  try {
    defaultSideMode = normalizeDefaultSideMode(value);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Choose a supported default side",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sign in before updating settings." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ default_side_mode: defaultSideMode })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Your profile could not be updated." };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateDisplayNameAction(
  value: unknown,
): Promise<SettingsActionResult> {
  if (typeof value !== "string") {
    return { ok: false, error: "Enter a display name." };
  }

  const displayName = value.trim();
  if (displayName.length < 1 || displayName.length > 48) {
    return {
      ok: false,
      error: "Use a display name between 1 and 48 characters.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sign in before updating settings." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Your profile could not be updated." };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateEmailRemindersAction(
  enabled: boolean,
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sign in before updating settings." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ email_reminders_enabled: enabled })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Your profile could not be updated." };
  }

  revalidatePath("/settings");
  return { ok: true };
}
