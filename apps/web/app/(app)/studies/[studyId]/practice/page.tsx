import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  parsePracticeCheckpoint,
  serializeCheckpoint,
} from "@chessloom/chess-core";

import { AppHeader } from "@/components/app/AppHeader";
import { PageTransition } from "@/components/motion/PageTransition";
import { PracticeView } from "@/components/training/PracticeView";
import { Button } from "@/components/ui/button";
import {
  resumeSessionAction,
  startTrainingSessionAction,
} from "@/lib/actions/training";
import { createClient } from "@/lib/supabase/server";
import { loadTrainingSession } from "@/lib/training/session";
import { parseTrainingStartQuery, trainingPath } from "@/lib/training/start";

export const metadata: Metadata = {
  title: "Practice | Chessloom",
};

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ studyId: string }>;
  searchParams: Promise<{
    side?: string;
    fresh?: string;
    queue?: string;
    ahead?: string;
    notice?: string;
  }>;
}) {
  const { studyId } = await params;
  const rawParams = await searchParams;
  const start = parseTrainingStartQuery(rawParams);
  const noticeParam =
    rawParams.notice === "fresh" || rawParams.notice === "resumed"
      ? rawParams.notice
      : undefined;
  const supabase = await createClient();
  const { data: study } = await supabase
    .from("studies")
    .select("id,title")
    .eq("id", studyId)
    .maybeSingle();

  if (!study) notFound();

  const skipResume = Boolean(
    start.fresh || start.sideMode || start.queueMode,
  );
  const { session, restored } = await loadTrainingSession(
    () =>
      skipResume
        ? Promise.resolve(null)
        : resumeSessionAction(studyId, "practice"),
    () =>
      startTrainingSessionAction(studyId, "practice", {
        sideMode: start.sideMode,
        queueMode: start.queueMode,
      }),
  );

  if (start.fresh || start.sideMode || start.queueMode) {
    redirect(`${trainingPath(studyId, "practice")}?notice=fresh`);
  }

  const checkpoint = parsePracticeCheckpoint(
    serializeCheckpoint(session.checkpoint),
  );
  const sessionNotice =
    noticeParam ?? (restored ? "resumed" : "fresh");

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
          <PracticeView
            studyId={studyId}
            sessionId={session.sessionId}
            initialCheckpoint={checkpoint}
            sessionNotice={sessionNotice}
          />
        </PageTransition>
      </section>
    </main>
  );
}
