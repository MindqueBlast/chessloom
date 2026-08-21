import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  parseTestCheckpoint,
  serializeCheckpoint,
} from "@chessloom/chess-core";

import { AppHeader } from "@/components/app/AppHeader";
import { PageTransition } from "@/components/motion/PageTransition";
import { TestView } from "@/components/training/TestView";
import { Button } from "@/components/ui/button";
import {
  resumeSessionAction,
  startTrainingSessionAction,
} from "@/lib/actions/training";
import { createClient } from "@/lib/supabase/server";
import { loadTrainingSession } from "@/lib/training/session";
import { parseTrainingStartQuery, testPath } from "@/lib/training/start";

export const metadata: Metadata = {
  title: "Random Test | Chessloom",
};

export default async function RandomTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ studyId: string }>;
  searchParams: Promise<{ side?: string; fresh?: string; n?: string }>;
}) {
  const { studyId } = await params;
  const start = parseTrainingStartQuery(await searchParams);
  const supabase = await createClient();
  const { data: study } = await supabase
    .from("studies")
    .select("id,title")
    .eq("id", studyId)
    .maybeSingle();

  if (!study) notFound();

  const { session } = await loadTrainingSession(
    () =>
      start.fresh || start.sideMode || start.n !== undefined
        ? Promise.resolve(null)
        : resumeSessionAction(studyId, "random_test"),
    () =>
      startTrainingSessionAction(studyId, "random_test", {
        sideMode: start.sideMode,
        n: start.n,
      }),
  );

  if (start.fresh || start.sideMode || start.n !== undefined) {
    redirect(testPath(studyId, "random", { n: start.n }));
  }

  const checkpoint = parseTestCheckpoint(
    serializeCheckpoint(session.checkpoint),
  );

  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <section className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8 lg:py-12">
        <Button asChild variant="ghost" className="mb-6">
          <Link href={`/studies/${studyId}`}>
            <ArrowLeft />
            {study.title}
          </Link>
        </Button>
        <PageTransition>
          <TestView
            studyId={studyId}
            sessionId={session.sessionId}
            initialCheckpoint={checkpoint}
          />
        </PageTransition>
      </section>
    </main>
  );
}
