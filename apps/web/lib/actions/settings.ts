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
