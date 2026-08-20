import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  parsePracticeCheckpoint,
  serializeCheckpoint,
} from "@chessloom/chess-core";

import { AppHeader } from "@/components/app/AppHeader";
import { PracticeView } from "@/components/training/PracticeView";
import { Button } from "@/components/ui/button";
import { startTrainingSessionAction } from "@/lib/actions/training";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Practice | Chessloom",
};

export default async function PracticePage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;
  const supabase = await createClient();
  const { data: study } = await supabase
    .from("studies")
    .select("id,title")
    .eq("id", studyId)
    .maybeSingle();

  if (!study) notFound();

  const session = await startTrainingSessionAction(studyId, "practice");
  const checkpoint = parsePracticeCheckpoint(
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
        <PracticeView
          sessionId={session.sessionId}
          initialCheckpoint={checkpoint}
        />
      </section>
    </main>
  );
}
