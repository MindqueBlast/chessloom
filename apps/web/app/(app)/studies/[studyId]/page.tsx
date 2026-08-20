import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, GitBranch, Target } from "lucide-react";

import { AppHeader } from "@/components/app/AppHeader";
import { StudyActions } from "@/components/studies/StudyActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Study | Chessloom",
};

export default async function StudyPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;
  const supabase = await createClient();
  const [{ data: study }, { data: chapters }, { data: nodes }] =
    await Promise.all([
      supabase
        .from("studies")
        .select("id,title,source_type,created_at")
        .eq("id", studyId)
        .maybeSingle(),
      supabase
        .from("chapters")
        .select("id,chapter_index,name,headers")
        .eq("study_id", studyId)
        .order("chapter_index"),
      supabase
        .from("nodes")
        .select("chapter_id,path_key,ply")
        .eq("study_id", studyId),
    ]);

  if (!study) {
    notFound();
  }

  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <section className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/dashboard">
            <ArrowLeft />
            Back to studies
          </Link>
        </Button>

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="secondary">
                {study.source_type === "pgn_upload"
                  ? "Stored PGN"
                  : "Imported PGN"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                }).format(new Date(study.created_at))}
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {study.title}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {chapters?.length ?? 0} chapters ·{" "}
              {Math.max(0, (nodes?.length ?? 0) - (chapters?.length ?? 0))} moves
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/studies/${studyId}/learn`}>
                <BookOpen />
                Learn
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/studies/${studyId}/practice`}>
                <Target />
                Practice
              </Link>
            </Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Manage study</CardTitle>
            <CardDescription>
              Rename, replace the PGN while preserving matching progress, or
              permanently remove the study.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudyActions studyId={study.id} initialTitle={study.title} />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Chapters</h2>
          {chapters?.map((chapter) => {
            const chapterNodes =
              nodes?.filter((node) => node.chapter_id === chapter.id) ?? [];
            const event =
              typeof chapter.headers?.Event === "string"
                ? chapter.headers.Event
                : null;

            return (
              <Card key={chapter.id} size="sm">
                <CardHeader>
                  <CardTitle>
                    {chapter.chapter_index + 1}. {chapter.name}
                  </CardTitle>
                  <CardDescription>
                    {event && event !== chapter.name ? `${event} · ` : ""}
                    {Math.max(0, chapterNodes.length - 1)} moves
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GitBranch />
                  {
                    chapterNodes.filter((node) => node.ply > 0).length
                  }{" "}
                  trainable positions
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
