import type { Metadata } from "next";

import { signOut } from "@/lib/actions/auth";
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
    .select("default_side_mode")
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
              Theme, training defaults, and session.
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
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Manage your current Chessloom session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={signOut}>
                  <Button type="submit" variant="outline">
                    Sign out
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </PageTransition>
    </main>
  );
}
