"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { EvalBar } from "@/components/engine/EvalBar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  hasEvalData,
  pvToDisplayLine,
} from "@/lib/engine/eval-display";
import { DEFAULT_ENGINE_DEPTH } from "@/lib/engine/stockfish-client";
import { useEngineAnalysis } from "@/hooks/useEngineAnalysis";
import { cn } from "@/lib/utils";

const DEPTH_OPTIONS = [10, 15, 18] as const;

export function AnalysisPanel({ fen }: { fen: string }) {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [depth, setDepth] = useState<number>(DEFAULT_ENGINE_DEPTH);

  const { eval: evalResult, analyzing, error } = useEngineAnalysis(
    fen,
    enabled,
    depth,
  );

  const pvLine =
    evalResult && evalResult.pv.length > 0
      ? pvToDisplayLine(fen, evalResult.pv)
      : "";

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Analysis</CardTitle>
        <CardDescription>
          Engine eval — optional reference, not part of training feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="analysis-toggle" className="text-sm font-normal">
            Show engine eval
          </Label>
          <Button
            id="analysis-toggle"
            type="button"
            size="sm"
            variant={enabled ? "default" : "outline"}
            aria-pressed={enabled}
            onClick={() => setEnabled((current) => !current)}
          >
            {enabled ? "On" : "Off"}
          </Button>
        </div>

        {enabled ? (
          <>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Search depth
              </p>
              <div className="flex flex-wrap gap-2">
                {DEPTH_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={option === depth ? "default" : "outline"}
                    onClick={() => setDepth(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            {hasEvalData(evalResult) ? (
              <EvalBar cp={evalResult!.cp} mate={evalResult!.mate} />
            ) : analyzing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle
                  className={cn("size-4", !reduceMotion && "animate-spin")}
                />
                Analyzing…
              </div>
            ) : null}

            {pvLine ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Principal variation
                </p>
                <p className="font-mono text-sm leading-6 break-words text-foreground/90">
                  {pvLine}
                </p>
              </div>
            ) : null}

            {evalResult && evalResult.depth > 0 ? (
              <p className="text-xs text-muted-foreground">
                Depth {evalResult.depth}
                {analyzing ? " · updating…" : null}
              </p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
