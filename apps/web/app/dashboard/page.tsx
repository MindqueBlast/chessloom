import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FileUp } from "lucide-react";

import { AppHeader } from "@/components/app/AppHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard | Chessloom",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: studies } = await supabase
    .from("studies")
    .select("id,title,source_type,created_at")
    .order("updated_at", { ascending: false });

  const studyIds = studies?.map((study) => study.id) ?? [];
  const [{ data: chapters }, { data: nodes }, { data: progress }] =
    studyIds.length > 0
      ? await Promise.all([
          supabase.from("chapters").select("study_id").in("study_id", studyIds),
          supabase.from("nodes").select("study_id").in("study_id", studyIds),
          supabase
            .from("position_progress")
            .select("study_id,mastery")
            .in("study_id", studyIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <section className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
              Repertoire library
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Your studies
            </h1>
          </div>
          <Button asChild size="lg">
            <Link href="/import">
              <FileUp />
              Import PGN
            </Link>
          </Button>
        </div>

        {studies?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {studies.map((study) => {
              const chapterCount =
                chapters?.filter((chapter) => chapter.study_id === study.id)
                  .length ?? 0;
              const nodeCount =
                nodes?.filter((node) => node.study_id === study.id).length ?? 0;
              const masteryValues =
                progress
                  ?.filter((item) => item.study_id === study.id)
                  .map((item) => item.mastery) ?? [];
              const mastery =
                masteryValues.length > 0
                  ? Math.round(
                      masteryValues.reduce((sum, value) => sum + value, 0) /
                        masteryValues.length,
                    )
                  : 0;

              return (
                <Link key={study.id} href={`/studies/${study.id}`}>
                  <Card className="h-full transition-colors hover:ring-primary/40">
                    <CardHeader>
                      <CardTitle>{study.title}</CardTitle>
                      <CardDescription>
                        {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}{" "}
                        · {Math.max(0, nodeCount - chapterCount)} moves
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Mastery</span>
                        <span>{mastery}%</span>
                      </div>
                      <Progress value={mastery} />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty className="min-h-72 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen />
              </EmptyMedia>
              <EmptyTitle>No studies yet</EmptyTitle>
              <EmptyDescription>
                Import a PGN to preserve its games and variations as a study.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/import">Import your first PGN</Link>
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </section>
    </main>
  );
}
