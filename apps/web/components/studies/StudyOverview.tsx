"use client";

import { useState } from "react";
import Link from "next/link";
import type { SideMode } from "@chessloom/chess-core";
import { BookOpen, GitBranch, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SESSION_SIDE_MODES, trainingPath } from "@/lib/training/start";
import type { DefaultSideMode } from "@/lib/settings/preferences";
import { StudyActions } from "@/components/studies/StudyActions";

type ChapterSummary = {
  id: string;
  index: number;
  name: string;
  event: string | null;
  moveCount: number;
  trainableCount: number;
};

export function StudyOverview({
  studyId,
  title,
  sourceType,
  createdAt,
  defaultSideMode,
  chapterCount,
  moveCount,
  chapters,
}: {
  studyId: string;
  title: string;
  sourceType: string;
  createdAt: string;
  defaultSideMode: DefaultSideMode;
  chapterCount: number;
  moveCount: number;
  chapters: ChapterSummary[];
}) {
  const [sideMode, setSideMode] = useState<SideMode>(defaultSideMode);
  // DefaultSideMode never includes "random", so equality alone decides the query.
  const sideQuery = sideMode === defaultSideMode ? undefined : sideMode;
  const forceFresh = sideMode === "random" || sideMode !== defaultSideMode;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="secondary">
              {sourceType === "pgn_upload" ? "Stored PGN" : "Imported PGN"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
              }).format(new Date(createdAt))}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted-foreground">
            {chapterCount} chapters · {moveCount} moves
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Session side
            </p>
            <div className="flex flex-wrap gap-2">
              {SESSION_SIDE_MODES.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={sideMode === option.value ? "default" : "outline"}
                  aria-pressed={sideMode === option.value}
                  onClick={() => setSideMode(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground">
              Random flips once for this session and is not saved to settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link
                href={trainingPath(studyId, "learn", {
                  sideMode: sideQuery,
                  fresh: forceFresh,
                })}
              >
                <BookOpen />
                Learn
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={trainingPath(studyId, "practice", {
                  sideMode: sideQuery,
                  fresh: forceFresh,
                })}
              >
                <Target />
                Practice
              </Link>
            </Button>
          </div>
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
          <StudyActions studyId={studyId} initialTitle={title} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Chapters</h2>
        {chapters.map((chapter) => (
          <Card key={chapter.id} size="sm">
            <CardHeader>
              <CardTitle>
                {chapter.index + 1}. {chapter.name}
              </CardTitle>
              <CardDescription>
                {chapter.event && chapter.event !== chapter.name
                  ? `${chapter.event} · `
                  : ""}
                {chapter.moveCount} moves
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <GitBranch />
                {chapter.trainableCount} trainable positions
              </span>
              <Button asChild size="sm" variant="outline">
                <Link
                  href={trainingPath(studyId, "learn", {
                    chapterIndex: chapter.index,
                    sideMode: sideQuery,
                    fresh: forceFresh,
                  })}
                >
                  <BookOpen />
                  Learn
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
