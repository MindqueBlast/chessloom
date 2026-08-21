"use client";

import { useReducedMotion } from "motion/react";

import {
  evalToWhitePercent,
  formatEvalScore,
} from "@/lib/engine/eval-display";
import { cn } from "@/lib/utils";

export function EvalBar({
  cp,
  mate,
  className,
}: {
  cp: number | null;
  mate: number | null;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const whitePercent = evalToWhitePercent(cp, mate);
  const label = formatEvalScore(cp, mate);

  return (
    <div
      className={cn("flex items-stretch gap-2", className)}
      aria-label={`Engine evaluation ${label}`}
    >
      <div
        className="relative h-28 w-3 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10"
        role="img"
        aria-hidden
      >
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-foreground/90 dark:bg-foreground/80",
            !reduceMotion && "transition-[height] duration-300 ease-out",
          )}
          style={{ height: `${whitePercent}%` }}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span className="font-mono text-sm font-medium tabular-nums">{label}</span>
        <span className="text-xs text-muted-foreground">White advantage</span>
      </div>
    </div>
  );
}
