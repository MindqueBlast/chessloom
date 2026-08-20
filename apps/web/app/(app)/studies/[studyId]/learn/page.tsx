import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { parseLearnCheckpoint, serializeCheckpoint } from "@chessloom/chess-core";

import { AppHeader } from "@/components/app/AppHeader";
import { LearnView } from "@/components/training/LearnView";
import { Button } from "@/components/ui/button";
import {
  resumeSessionAction,
  startTrainingSessionAction,
} from "@/lib/actions/training";
import {
  buildChapterTrees,
  type ChapterRow,
  type NodeRow,
} from "@/lib/actions/training-helpers";
import { createClient } from "@/lib/supabase/server";
import { loadTrainingSession } from "@/lib/training/session";

export const metadata: Metadata = {
  title: "Learn | Chessloom",
};

export default async function LearnPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;
  const supabase = await createClient();
  const [{ data: study }, { data: chapters }, { data: nodes }] =
    await Promise.all([
      supabase.from("studies").select("id,title").eq("id", studyId).maybeSingle(),
      supabase
        .from("chapters")
        .select("id,chapter_index,name,initial_fen,headers")
        .eq("study_id", studyId)
        .order("chapter_index"),
      supabase
        .from("nodes")
        .select("id,chapter_id,parent_id,path_key,fen,san,uci,ply,comment,nags")
        .eq("study_id", studyId)
        .order("created_at"),
    ]);

  if (!study) notFound();

  const trees = buildChapterTrees(
    (chapters ?? []) as ChapterRow[],
    (nodes ?? []) as NodeRow[],
  );
  const { session } = await loadTrainingSession(
    () => resumeSessionAction(studyId, "learn"),
    () => startTrainingSessionAction(studyId, "learn"),
  );
  const checkpoint = parseLearnCheckpoint(
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
        <LearnView
          sessionId={session.sessionId}
          chapters={trees}
          initialCheckpoint={checkpoint}
        />
      </section>
    </main>
  );
}
