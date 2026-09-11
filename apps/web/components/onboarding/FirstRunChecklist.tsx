"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "chessloom-onboarding-v1";

type OnboardingState = {
  dismissed: boolean;
  learnedFiveMoves: boolean;
};

function readState(): OnboardingState {
  if (typeof window === "undefined") {
    return { dismissed: false, learnedFiveMoves: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dismissed: false, learnedFiveMoves: false };
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      dismissed: Boolean(parsed.dismissed),
      learnedFiveMoves: Boolean(parsed.learnedFiveMoves),
    };
  } catch {
    return { dismissed: false, learnedFiveMoves: false };
  }
}

function writeState(next: OnboardingState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore.
  }
}

/** Call from Learn when the user completes ~5 plies. */
export function markOnboardingLearnedFiveMoves() {
  const current = readState();
  if (current.learnedFiveMoves) return;
  const next = { ...current, learnedFiveMoves: true };
  writeState(next);
  trackEvent("first_train_started", { source: "learn_five_moves" });
}

export function FirstRunChecklist({
  hasStudies,
  hasCompletedSession,
  firstStudyId,
}: {
  hasStudies: boolean;
  hasCompletedSession: boolean;
  firstStudyId?: string | null;
}) {
  const [state, setState] = useState<OnboardingState>({
    dismissed: false,
    learnedFiveMoves: false,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(readState());
    setMounted(true);
  }, []);

  const steps = useMemo(
    () => [
      {
        id: "pick",
        label: "Pick a starter opening or import a study",
        done: hasStudies,
        href: hasStudies ? undefined : "/import",
      },
      {
        id: "learn",
        label: "Start Learn and play about 5 moves",
        done: state.learnedFiveMoves || hasCompletedSession,
        href:
          hasStudies && firstStudyId
            ? `/studies/${firstStudyId}/learn`
            : "/import",
      },
      {
        id: "return",
        label: "Come back for due Practice cards",
        done: hasCompletedSession,
        href: hasStudies && firstStudyId
          ? `/studies/${firstStudyId}/practice`
          : "/dashboard",
      },
    ],
    [firstStudyId, hasCompletedSession, hasStudies, state.learnedFiveMoves],
  );

  const allDone = steps.every((step) => step.done);

  if (!mounted || state.dismissed || allDone) {
    return null;
  }

  return (
    <Card className="mb-8 border-primary/25 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg">Your first session</CardTitle>
          <CardDescription>
            Three quick steps to turn a repertoire into instinct.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const next = { ...state, dismissed: true };
            writeState(next);
            setState(next);
          }}
        >
          Dismiss
        </Button>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 text-sm">
                {step.done ? (
                  <CheckCircle2 className="size-5 text-primary" />
                ) : (
                  <Circle className="size-5 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    step.done && "text-muted-foreground line-through",
                  )}
                >
                  <span className="mr-2 font-mono text-xs text-muted-foreground">
                    {index + 1}.
                  </span>
                  {step.label}
                </span>
              </div>
              {!step.done && step.href ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={step.href}>Go</Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
