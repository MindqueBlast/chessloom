import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarClock, FileUp, Flame, Target } from "lucide-react";
import { formatPathSan } from "@chessloom/chess-core";

import { AppHeader } from "@/components/app/AppHeader";
import { FirstRunChecklist } from "@/components/onboarding/FirstRunChecklist";
import { StarterOpeningPicker } from "@/components/openings/StarterOpeningPicker";
import { PageTransition } from "@/components/motion/PageTransition";
import { StaggerItem } from "@/components/motion/StaggerItem";
import { StudyCard } from "@/components/studies/StudyCard";
import { ShareProgressCard } from "@/components/growth/ShareProgressCard";
import { ReturnTracker } from "@/components/analytics/ReturnTracker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  buildDashboardSummary,
  calculateTrainingStreak,
  type DashboardChapter,
  type DashboardNode,
  type DashboardProgress,
  type DashboardStudy,
} from "@/lib/dashboard/summary";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard | Chessloom",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const studiesResult = await supabase
    .from("studies")
    .select("id,title,source_type,created_at")
    .order("updated_at", { ascending: false });

  if (studiesResult.error) {
    throw new Error(studiesResult.error.message);
  }

  const studies = (studiesResult.data ?? []) as DashboardStudy[];
  const studyIds = studies.map((study) => study.id);
  const [chaptersResult, nodesResult, progressResult, sessionsResult] =
    await Promise.all([
      studyIds.length > 0
        ? supabase.from("chapters").select("study_id").in("study_id", studyIds)
        : Promise.resolve({ data: [], error: null }),
      studyIds.length > 0
        ? supabase
            .from("nodes")
            .select("id,parent_id,study_id,path_key")
            .in("study_id", studyIds)
        : Promise.resolve({ data: [], error: null }),
      studyIds.length > 0
        ? supabase
            .from("position_progress")
            .select("study_id,path_key,mastery,due_at")
            .in("study_id", studyIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("training_sessions")
        .select("updated_at")
        .eq("status", "completed")
        .order("updated_at", { ascending: false }),
    ]);

  const queryError = [
    chaptersResult.error,
    nodesResult.error,
    progressResult.error,
    sessionsResult.error,
  ].find(Boolean);
  if (queryError) {
    throw new Error(queryError.message);
  }

  const summary = buildDashboardSummary(
    studies,
    (chaptersResult.data ?? []) as DashboardChapter[],
    (nodesResult.data ?? []) as DashboardNode[],
    (progressResult.data ?? []) as DashboardProgress[],
  );
  const completedSessions = sessionsResult.data ?? [];
  const streak = calculateTrainingStreak(
    completedSessions.map((session) => session.updated_at),
  );
  const practiceStudy = summary.studies.reduce<
    (typeof summary.studies)[number] | null
  >(
    (best, study) =>
      study.dueCount > 0 && (!best || study.dueCount > best.dueCount)
        ? study
        : best,
    null,
  );
  const firstStudyId = summary.studies[0]?.id ?? null;

  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <ReturnTracker />
      <PageTransition>
        <section className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
                Training overview
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Your repertoire
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Review what is due, reinforce weak paths, then keep building.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {practiceStudy ? (
                <Button asChild size="lg">
                  <Link href={`/studies/${practiceStudy.id}/practice`}>
                    <Target />
                    Practice {practiceStudy.dueCount} due
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="lg" variant="outline">
                <Link href="/import">
                  <FileUp />
                  Import study
                </Link>
              </Button>
            </div>
          </div>

          <FirstRunChecklist
            hasStudies={summary.studies.length > 0}
            hasCompletedSession={completedSessions.length > 0}
            firstStudyId={firstStudyId}
          />

          {summary.studies.length > 0 ? (
            <ShareProgressCard
              className="mb-8"
              dueCount={summary.dueCount}
              streak={streak}
              studyCount={summary.studies.length}
              weakCount={summary.weakPositions.length}
            />
          ) : null}

          <div className="mb-10 grid gap-4 md:grid-cols-3">
            <StaggerItem index={0}>
              <Card>
                <CardHeader>
                  <CalendarClock className="mb-3 size-5 text-primary" />
                  <CardTitle>Due now</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums">
                    {summary.dueCount}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.dueCount === 0
                      ? "Queue clear for now"
                      : "Positions ready to review"}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem index={1}>
              <Card>
                <CardHeader>
                  <Target className="mb-3 size-5 text-primary" />
                  <CardTitle>Weak paths</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums">
                    {summary.weakPositions.length}
                  </p>
                  {summary.weakPositions.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {summary.weakPositions.slice(0, 3).map((entry) => (
                        <li key={`${entry.studyId}:${entry.pathKey}`}>
                          <Link
                            href={`/studies/${entry.studyId}/learn?path=${encodeURIComponent(entry.pathKey)}`}
                            className="text-foreground/80 underline-offset-2 hover:underline"
                          >
                            {formatPathSan(entry.pathKey)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No paths below 40% mastery
                    </p>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem index={2}>
              <Card>
                <CardHeader>
                  <Flame className="mb-3 size-5 text-primary" />
                  <CardTitle>Training streak</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums">
                    {streak}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {streak === 1 ? "day in a row" : "days in a row"}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Studies</h2>
          </div>
          {summary.studies.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summary.studies.map((study, index) => (
                <StudyCard key={study.id} study={study} index={index} />
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              <Empty className="min-h-56 border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BookOpen />
                  </EmptyMedia>
                  <EmptyTitle>No studies yet</EmptyTitle>
                  <EmptyDescription>
                    Pick a curated opening below, or import your own Lichess
                    study / PGN.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild variant="outline">
                    <Link href="/import">Import your own study</Link>
                  </Button>
                </EmptyContent>
              </Empty>
              <Suspense fallback={null}>
                <StarterOpeningPicker />
              </Suspense>
            </div>
          )}
        </section>
      </PageTransition>
    </main>
  );
}
