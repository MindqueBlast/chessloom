import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/app/AppHeader";
import { StudyOverview } from "@/components/studies/StudyOverview";
import { Button } from "@/components/ui/button";
import { normalizeDefaultSideMode } from "@/lib/settings/preferences";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Study | Chessloom",
};

function profileSideMode(value: unknown) {
  try {
    return normalizeDefaultSideMode(value);
  } catch {
    return "both" as const;
  }
}

export default async function StudyPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;
  const supabase = await createClient();
  const [{ data: study }, { data: chapters }, { data: nodes }, { data: profile }] =
    await Promise.all([
      supabase
        .from("studies")
        .select("id,title,source_type,lichess_study_url,created_at")
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
      supabase.from("profiles").select("default_side_mode").maybeSingle(),
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

        <StudyOverview
          studyId={study.id}
          title={study.title}
          sourceType={study.source_type}
          lichessStudyUrl={study.lichess_study_url}
          createdAt={study.created_at}
          defaultSideMode={profileSideMode(profile?.default_side_mode)}
          chapterCount={chapters?.length ?? 0}
          moveCount={Math.max(
            0,
            (nodes?.length ?? 0) - (chapters?.length ?? 0),
          )}
          chapters={(chapters ?? []).map((chapter) => {
            const chapterNodes =
              nodes?.filter((node) => node.chapter_id === chapter.id) ?? [];
            const event =
              typeof chapter.headers?.Event === "string"
                ? chapter.headers.Event
                : null;
            return {
              id: chapter.id,
              index: chapter.chapter_index,
              name: chapter.name,
              event,
              moveCount: Math.max(0, chapterNodes.length - 1),
              trainableCount: chapterNodes.filter((node) => node.ply > 0)
                .length,
            };
          })}
        />
      </section>
    </main>
  );
}
