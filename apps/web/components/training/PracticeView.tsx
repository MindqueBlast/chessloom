"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  parsePracticeCheckpoint,
  type PracticeState,
} from "@chessloom/chess-core";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import {
  revealPracticeExpectedAction,
  submitPracticeMoveAction,
} from "@/lib/actions/training";
import { applyResolvedMoveCheckpoint } from "@/lib/training/session";
import { SESSION_SIDE_MODES, trainingPath } from "@/lib/training/start";
import { shortcutForKey } from "@/lib/training/ui";
import { toastCopy } from "@/lib/toasts";

import { FeedbackBanner, type FeedbackKind } from "./FeedbackBanner";

export function PracticeView({
  studyId,
  sessionId,
  initialCheckpoint,
}: {
  studyId: string;
  sessionId: string;
  initialCheckpoint: PracticeState;
}) {
  const [checkpoint, setCheckpoint] = useState(initialCheckpoint);
  const [pendingCheckpoint, setPendingCheckpoint] =
    useState<PracticeState | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: FeedbackKind;
    animate: boolean;
  } | null>(null);
  const [expected, setExpected] = useState<string[]>([]);
  const [viewedIndex, setViewedIndex] = useState(checkpoint.index);
  const [pending, startTransition] = useTransition();

  const currentCard = checkpoint.queue[checkpoint.index];
  const viewedCard = checkpoint.queue[viewedIndex] ?? currentCard;
  const isCurrentPosition = viewedIndex === checkpoint.index;
  const announcedComplete = useRef(initialCheckpoint.status === "complete");

  useEffect(() => {
    const complete =
      checkpoint.status === "complete" ||
      pendingCheckpoint?.status === "complete";
    if (!complete || announcedComplete.current) {
      return;
    }
    announcedComplete.current = true;
    toast.success(toastCopy.reviewCompleted);
  }, [checkpoint.status, pendingCheckpoint]);

  function retry() {
    setFeedback(null);
    setExpected([]);
  }

  function continueTraining() {
    if (!pendingCheckpoint) return;
    setCheckpoint(pendingCheckpoint);
    setViewedIndex(pendingCheckpoint.index);
    setPendingCheckpoint(null);
    setFeedback(null);
    setExpected([]);
  }

  function submitMove(uci: string, animate = true) {
    if (!currentCard || pending || pendingCheckpoint || !isCurrentPosition) {
      return;
    }
    setFeedback(null);
    setExpected([]);
    startTransition(async () => {
      try {
        const result = await submitPracticeMoveAction({
          sessionId,
          pathKey: currentCard.pathKey,
          uci,
        });
        if (result.ok) {
          setPendingCheckpoint(
            applyResolvedMoveCheckpoint(
              result.checkpoint,
              parsePracticeCheckpoint,
            ),
          );
          setFeedback({ kind: "correct", animate });
        } else {
          setFeedback({ kind: "incorrect", animate });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : toastCopy.serverError;
        toast.error(message);
        setFeedback({ kind: "error", animate });
        setExpected([message]);
      }
    });
  }

  function revealExpected(animate = true) {
    if (!currentCard || pending || feedback?.kind !== "incorrect") return;
    startTransition(async () => {
      try {
        const result = await revealPracticeExpectedAction(
          sessionId,
          currentCard.pathKey,
        );
        setExpected(result.sans);
        setFeedback({ kind: "incorrect", animate });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : toastCopy.serverError;
        toast.error(message);
        setFeedback({ kind: "error", animate });
        setExpected([message]);
      }
    });
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcutForKey(event.key, event.repeat);
      if (!shortcut) return;
      event.preventDefault();
      if (shortcut === "back") {
        setViewedIndex((index) => Math.max(0, index - 1));
      } else if (shortcut === "forward") {
        setViewedIndex((index) => Math.min(checkpoint.index, index + 1));
      } else if (shortcut === "retry") {
        retry();
      } else if (pendingCheckpoint) {
        continueTraining();
      } else if (feedback?.kind === "incorrect" && expected.length === 0) {
        revealExpected(false);
      } else if (feedback) {
        retry();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const errorDescription =
    feedback?.kind === "error" ? expected[0] : undefined;
  const incorrectDescription =
    feedback?.kind === "incorrect" && expected.length > 0
      ? `Expected: ${expected.join(" or ")}`
      : undefined;

  if (checkpoint.status === "complete" && !pendingCheckpoint) {
    return (
      <div className="mx-auto max-w-xl py-20">
        <FeedbackBanner
          kind="info"
          title="Practice complete."
          description={`You reviewed ${checkpoint.queue.length} positions.`}
        />
      </div>
    );
  }

  if (!currentCard || !viewedCard) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {SESSION_SIDE_MODES.map((option) => (
            <Button key={option.value} asChild size="sm" variant="outline">
              <Link
                href={trainingPath(studyId, "practice", {
                  sideMode: option.value,
                  fresh: true,
                })}
              >
                {option.label}
              </Link>
            </Button>
          ))}
        </div>
        <FeedbackBanner
          kind="info"
          title="Nothing due yet."
          description="This study has no positions for your selected side."
          animate={false}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <ChessBoard
        fen={viewedCard.fen}
        orientation={checkpoint.side}
        disabled={
          pending || Boolean(pendingCheckpoint) || !isCurrentPosition
        }
        onMove={submitMove}
      />

      <div className="space-y-4">
        <div>
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Position {checkpoint.index + 1} of {checkpoint.queue.length}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Practice
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Find a move from your repertoire.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {SESSION_SIDE_MODES.map((option) => (
            <Button
              key={option.value}
              asChild
              size="sm"
              variant={
                option.value === checkpoint.side ? "default" : "outline"
              }
            >
              <Link
                href={trainingPath(studyId, "practice", {
                  sideMode: option.value,
                  fresh: true,
                })}
              >
                {option.label}
              </Link>
            </Button>
          ))}
        </div>

        <FeedbackBanner
          kind={feedback?.kind ?? null}
          description={errorDescription ?? incorrectDescription}
          animate={feedback?.animate}
        />

        <div className="flex flex-wrap gap-2">
          {pending ? (
            <Button type="button" disabled>
              <LoaderCircle className="animate-spin" />
              Checking…
            </Button>
          ) : pendingCheckpoint ? (
            <Button type="button" onClick={continueTraining}>
              Continue
              <ArrowRight />
            </Button>
          ) : feedback?.kind === "incorrect" ? (
            <>
              {expected.length === 0 ? (
                <Button type="button" onClick={() => revealExpected()}>
                  <Eye />
                  Show expected move(s)
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={retry}>
                <RotateCcw />
                Retry
              </Button>
            </>
          ) : feedback ? (
            <Button type="button" variant="outline" onClick={retry}>
              <RotateCcw />
              Retry
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous position"
            disabled={viewedIndex === 0}
            onClick={() => setViewedIndex((index) => Math.max(0, index - 1))}
          >
            <ArrowLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next position"
            disabled={viewedIndex >= checkpoint.index}
            onClick={() =>
              setViewedIndex((index) => Math.min(checkpoint.index, index + 1))
            }
          >
            <ArrowRight />
          </Button>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          ←/→ review · R retry · Space/Enter continue or reveal
        </p>
      </div>
    </div>
  );
}
