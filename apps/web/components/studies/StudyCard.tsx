"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StudySummary } from "@/lib/dashboard/summary";
import { motionTokens } from "@/lib/motion/tokens";

export function StudyCard({
  study,
  index,
}: {
  study: StudySummary;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const masteryValue = useMotionValue(reduceMotion ? study.mastery : 0);
  const displayedMastery = useTransform(masteryValue, (value) =>
    Math.round(value),
  );

  useEffect(() => {
    if (reduceMotion) {
      masteryValue.set(study.mastery);
      return;
    }
    masteryValue.set(0);
    const controls = animate(masteryValue, study.mastery, {
      duration: motionTokens.durationSlow,
      ease: motionTokens.easeOut,
    });
    return () => controls.stop();
  }, [masteryValue, reduceMotion, study.mastery]);

  return (
    <Link
      href={`/studies/${study.id}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <motion.div
        initial={
          reduceMotion ? false : { opacity: 0, y: 8, filter: "blur(3px)" }
        }
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{
          duration: reduceMotion ? 0 : motionTokens.duration,
          delay: reduceMotion ? 0 : Math.min(index, 8) * motionTokens.stagger,
          ease: motionTokens.easeOut,
        }}
      >
        <Card className="h-full transition-[box-shadow] duration-(--motion-duration-fast) ease-(--motion-ease-out) hover:ring-primary/40">
          <CardHeader>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {study.source_type === "pgn_upload" ? "File" : "Pasted PGN"}
              </Badge>
              {study.dueCount > 0 ? (
                <Badge variant="outline">
                  <Clock3 />
                  {study.dueCount} due
                </Badge>
              ) : null}
            </div>
            <CardTitle>{study.title}</CardTitle>
            <CardDescription>
              {study.chapterCount}{" "}
              {study.chapterCount === 1 ? "chapter" : "chapters"} ·{" "}
              {study.moveCount} {study.moveCount === 1 ? "move" : "moves"}
            </CardDescription>
            <CardAction>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mastery</span>
              <span aria-label={`Mastery ${study.mastery} percent`}>
                <motion.span aria-hidden="true">{displayedMastery}</motion.span>
                <span aria-hidden="true">%</span>
              </span>
            </div>
            <Progress
              value={study.mastery}
              aria-label={`${study.title} mastery`}
            />
            <p className="text-xs text-muted-foreground">
              {study.weakCount === 0
                ? "No weak paths"
                : `${study.weakCount} weak ${
                    study.weakCount === 1 ? "path" : "paths"
                  }`}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
