import type { Metadata } from "next";

import { AppHeader } from "@/components/app/AppHeader";
import { ImportForm } from "@/components/import/ImportForm";
import { PageTransition } from "@/components/motion/PageTransition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Import PGN | Chessloom",
};

export default function ImportPage() {
  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <PageTransition>
        <section className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-8">
          <div className="mb-8 space-y-2">
            <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
              New study
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Import a PGN</h1>
            <p className="text-muted-foreground">
              Games become chapters, with every variation preserved for training.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Study source</CardTitle>
              <CardDescription>
                Paste PGN text or upload a .pgn file. Parsing happens securely on
                the server.
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
