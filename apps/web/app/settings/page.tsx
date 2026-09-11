import type { Metadata } from "next";
import Link from "next/link";

import { deleteAccountAction, signOut } from "@/lib/actions/auth";
import { AppHeader } from "@/components/app/AppHeader";
import { PageTransition } from "@/components/motion/PageTransition";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { normalizeDefaultSideMode } from "@/lib/settings/preferences";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings | Chessloom",
};

function profileSideMode(value: unknown) {
  try {
    return normalizeDefaultSideMode(value);
  } catch {
    return "both" as const;
  }
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("default_side_mode, display_name, email_reminders_enabled")
    .maybeSingle();

  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <PageTransition>
        <section className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-8">
          <div className="mb-8 space-y-2">
            <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
              Account
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Theme, training defaults, reminders, and session.
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  These apply on this device for theme, and to new sessions for
                  side.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SettingsForm
                  defaultSideMode={profileSideMode(profile?.default_side_mode)}
                  displayName={profile?.display_name ?? ""}
                  emailRemindersEnabled={
                    profile?.email_reminders_enabled !== false
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Manage your Chessloom session or permanently delete your
                  account.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <form action={signOut}>
                  <Button type="submit" variant="outline">
                    Sign out
                  </Button>
                </form>
                <form action={deleteAccountAction}>
                  <Button type="submit" variant="destructive">
                    Delete account
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Need help?{" "}
              <Link className="underline underline-offset-4" href="/docs">
                Learn vs Practice vs Test
              </Link>
              {" · "}
              <a
                className="underline underline-offset-4"
                href="https://github.com/MindqueBlast/chessloom/issues"
                rel="noreferrer"
                target="_blank"
              >
                Feedback on GitHub
              </a>
              {" · "}
              <Link className="underline underline-offset-4" href="/privacy">
                Privacy
              </Link>
              {" · "}
              <Link className="underline underline-offset-4" href="/terms">
                Terms
              </Link>
            </p>
          </div>
        </section>
      </PageTransition>
    </main>
  );
}
