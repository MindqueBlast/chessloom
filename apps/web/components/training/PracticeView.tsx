"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  formatPathSan,
  parsePracticeCheckpoint,
  type PracticeState,
} from "@chessloom/chess-core";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  LoaderCircle,
  RotateCcw,
  Target,
} from "lucide-react";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { LazyAnalysisPanel } from "@/components/engine/LazyAnalysisPanel";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  revealPracticeExpectedAction,
  submitPracticeMoveAction,
} from "@/lib/actions/training";
import { useSound } from "@/lib/sound/useSound";
import { applyResolvedMoveCheckpoint } from "@/lib/training/session";
import { SESSION_SIDE_MODES, trainingPath } from "@/lib/training/start";
import { applyUciToFen, shortcutForKey } from "@/lib/training/ui";
import { toastCopy } from "@/lib/toasts";

import { FeedbackBanner, type FeedbackKind } from "./FeedbackBanner";

export function PracticeView({
  studyId,
  sessionId,
  initialCheckpoint,
  sessionNotice,
}: {
  studyId: string;
  sessionId: string;
  initialCheckpoint: PracticeState;
  sessionNotice?: "fresh" | "resumed";
}) {
  const { play } = useSound();
  const [checkpoint, setCheckpoint] = useState(initialCheckpoint);
  const [pendingCheckpoint, setPendingCheckpoint] =
    useState<PracticeState | null>(null);
  const [boardFen, setBoardFen] = useState<string | null>(null);
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
  const noticed = useRef(false);
  const displayFen =
    isCurrentPosition && boardFen
      ? boardFen
      : (viewedCard?.fen ?? currentCard?.fen ?? "");

  useEffect(() => {
    if (noticed.current || !sessionNotice) return;
    noticed.current = true;
    toast.message(
      sessionNotice === "resumed" ? "Resumed your session" : "Started fresh",
    );
  }, [sessionNotice]);

  useEffect(() => {
    const complete =
      checkpoint.status === "complete" ||
      pendingCheckpoint?.status === "complete";
    if (!complete || announcedComplete.current) {
      return;
    }
    announcedComplete.current = true;
    play("sessionComplete");
    toast.success(toastCopy.reviewCompleted);
  }, [checkpoint.status, pendingCheckpoint, play]);

  function retry() {
    setFeedback(null);
    setExpected([]);
    setBoardFen(null);
  }

  function continueTraining() {
    if (!pendingCheckpoint) return;
    setCheckpoint(pendingCheckpoint);
    setViewedIndex(pendingCheckpoint.index);
    setPendingCheckpoint(null);
    setBoardFen(null);
    setFeedback(null);
    setExpected([]);
  }

  function submitMove(uci: string, animate = true) {
    if (!currentCard || pending || pendingCheckpoint || !isCurrentPosition) {
      return;
    }
    setFeedback(null);
    setExpected([]);
    const movedFen = applyUciToFen(currentCard.fen, uci);
    if (movedFen) setBoardFen(movedFen);
    play("move");

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
          play("correct");
          setFeedback({ kind: "correct", animate });
        } else {
          play("incorrect");
          setFeedback({ kind: "incorrect", animate });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : toastCopy.serverError;
        toast.error(message);
        setBoardFen(null);
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
        play("reveal");
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
    if (checkpoint.queue.length === 0) {
      return (
        <Empty className="mx-auto max-w-lg border border-dashed py-16">
          <EmptyHeader>
            <EmptyTitle>Nothing due yet</EmptyTitle>
            <EmptyDescription>
              Your due queue is clear. Study ahead on weak or new positions, or
              switch side.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link
                  href={trainingPath(studyId, "practice", {
                    sideMode: checkpoint.sideMode,
                    fresh: true,
                    queueMode: "study_ahead",
                  })}
                >
                  <Target />
                  Study ahead (weak/new)
                </Link>
              </Button>
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
          </EmptyContent>
        </Empty>
      );
    }

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
      <Empty className="mx-auto max-w-lg border border-dashed py-16">
        <EmptyHeader>
          <EmptyTitle>Nothing to practice</EmptyTitle>
          <EmptyDescription>
            This study has no positions for your selected side.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap justify-center gap-2">
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
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <ChessBoard
        fen={displayFen}
        orientation={checkpoint.side}
        disabled={
          pending ||
          Boolean(pendingCheckpoint) ||
          !isCurrentPosition ||
          feedback?.kind === "incorrect"
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
            {formatPathSan(currentCard.pathKey)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {SESSION_SIDE_MODES.map((option) => (
            <Button
              key={option.value}
              asChild
              size="sm"
              variant={
                option.value === checkpoint.sideMode ? "default" : "outline"
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

        {displayFen ? (
          <LazyAnalysisPanel fen={displayFen} color={checkpoint.side} />
        ) : null}

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
