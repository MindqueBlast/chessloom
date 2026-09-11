import { Suspense } from "react";
import type { Metadata } from "next";

import { AppHeader } from "@/components/app/AppHeader";
import { ImportForm } from "@/components/import/ImportForm";
import { StarterOpeningPicker } from "@/components/openings/StarterOpeningPicker";
import { PageTransition } from "@/components/motion/PageTransition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Import study | Chessloom",
  description:
    "Start with a curated opening from Lichess, or import your own public study or PGN.",
};

export default function ImportPage() {
  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <PageTransition>
        <section className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
          <div className="mb-8 max-w-3xl space-y-2">
            <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
              New study
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Start training
            </h1>
            <p className="text-muted-foreground">
              Beginners: pick a curated public Lichess opening. Advanced: paste
              your own study URL or PGN.
            </p>
          </div>

          <Suspense fallback={null}>
            <StarterOpeningPicker className="mb-12" />
          </Suspense>

          <Separator className="mb-12" />

          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle>Import your own study</CardTitle>
              <CardDescription>
                Prefer a public Lichess study URL. PGN paste and file upload
                work when you do not have a Lichess link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportForm />
            </CardContent>
          </Card>
        </section>
      </PageTransition>
    </main>
  );
}
