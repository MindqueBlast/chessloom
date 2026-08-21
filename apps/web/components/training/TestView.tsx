"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  buildTestSummary,
  formatPathSan,
  parseTestCheckpoint,
  type TestState,
} from "@chessloom/chess-core";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { LazyAnalysisPanel } from "@/components/engine/LazyAnalysisPanel";
import { Button } from "@/components/ui/button";
import {
  advanceTestAction,
  revealTestExpectedAction,
  submitTestMoveAction,
} from "@/lib/actions/training";
import { useSound } from "@/lib/sound/useSound";
import { applyResolvedMoveCheckpoint } from "@/lib/training/session";
import {
  SESSION_SIDE_MODES,
  testPath,
  type TestRouteMode,
} from "@/lib/training/start";
import { applyUciToFen, shortcutForKey } from "@/lib/training/ui";
import { toastCopy } from "@/lib/toasts";

import { FeedbackBanner, type FeedbackKind } from "./FeedbackBanner";

function testRouteMode(mode: TestState["mode"]): TestRouteMode {
  return mode === "random_test" ? "random" : "full";
}

function testTitle(mode: TestState["mode"]): string {
  return mode === "random_test" ? "Random Test" : "Full Repertoire Test";
}

function formatAccuracy(accuracy: number): string {
  return `${Math.round(accuracy * 100)}%`;
}

export function TestView({
  studyId,
  sessionId,
  initialCheckpoint,
}: {
  studyId: string;
  sessionId: string;
  initialCheckpoint: TestState;
}) {
  const { play } = useSound();
  const [checkpoint, setCheckpoint] = useState(initialCheckpoint);
  const [boardFen, setBoardFen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: FeedbackKind;
    animate: boolean;
  } | null>(null);
  const [expected, setExpected] = useState<string[]>([]);
  const [awaitingAdvance, setAwaitingAdvance] = useState(false);
  const [viewedIndex, setViewedIndex] = useState(checkpoint.index);
  const [pending, startTransition] = useTransition();

  const currentCard = checkpoint.queue[checkpoint.index];
  const viewedCard = checkpoint.queue[viewedIndex] ?? currentCard;
  const isCurrentPosition = viewedIndex === checkpoint.index;
  const announcedComplete = useRef(initialCheckpoint.status === "complete");
  const routeMode = testRouteMode(checkpoint.mode);
  const displayFen =
    isCurrentPosition && boardFen
      ? boardFen
      : (viewedCard?.fen ?? currentCard?.fen ?? "");

  useEffect(() => {
    if (checkpoint.status !== "complete" || announcedComplete.current) {
      return;
    }
    announcedComplete.current = true;
    play("sessionComplete");
    toast.success(toastCopy.sessionCompleted);
  }, [checkpoint.status, play]);

  function retry() {
    setFeedback(null);
    setExpected([]);
    setBoardFen(null);
    setAwaitingAdvance(false);
  }

  function applyCheckpoint(nextCheckpoint: unknown) {
    const next = applyResolvedMoveCheckpoint(
      nextCheckpoint,
      parseTestCheckpoint,
    );
    setCheckpoint(next);
    setViewedIndex(next.index);
    setBoardFen(null);
    setFeedback(null);
    setExpected([]);
    setAwaitingAdvance(false);
    return next;
  }

  function continueTest() {
    if (!currentCard || pending || !awaitingAdvance || expected.length === 0) {
      return;
    }
    startTransition(async () => {
      try {
        const result = await advanceTestAction(sessionId, currentCard.pathKey);
        applyCheckpoint(result.checkpoint);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : toastCopy.serverError;
        toast.error(message);
        setFeedback({ kind: "error", animate: true });
        setExpected([message]);
      }
    });
  }

  function submitMove(uci: string, animate = true) {
    if (
      !currentCard ||
      pending ||
      awaitingAdvance ||
      !isCurrentPosition ||
      feedback?.kind === "incorrect"
    ) {
      return;
    }
    setFeedback(null);
    setExpected([]);
    const movedFen = applyUciToFen(currentCard.fen, uci);
    if (movedFen) setBoardFen(movedFen);
    play("move");

    startTransition(async () => {
      try {
        const result = await submitTestMoveAction({
          sessionId,
          pathKey: currentCard.pathKey,
          uci,
        });
        if (result.ok) {
          applyCheckpoint(result.checkpoint);
          play("correct");
          setFeedback({ kind: "correct", animate });
        } else {
          setAwaitingAdvance(true);
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
        const result = await revealTestExpectedAction(
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
      } else if (awaitingAdvance && expected.length > 0) {
        continueTest();
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

  if (checkpoint.status === "complete") {
    const summary = buildTestSummary(checkpoint);
    return (
      <div className="mx-auto max-w-xl space-y-6 py-20">
        <FeedbackBanner
          kind="info"
          title={`${testTitle(checkpoint.mode)} complete.`}
          description={`Accuracy ${formatAccuracy(summary.accuracy)} · ${summary.correctCount} correct · ${summary.incorrectCount} incorrect`}
          animate={false}
        />
        {summary.weakPathKeys.length > 0 ? (
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-medium">Weak positions</h2>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {summary.weakPathKeys.map((pathKey) => (
                <li key={pathKey}>
                  <Link
                    href={`/studies/${studyId}/learn?fresh=1`}
                    className="underline-offset-2 hover:underline"
                  >
                    {formatPathSan(pathKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
                href={testPath(studyId, routeMode, {
                  sideMode: option.value,
                  fresh: true,
                  n: checkpoint.targetCount,
                })}
              >
                {option.label}
              </Link>
            </Button>
          ))}
        </div>
        <FeedbackBanner
          kind="info"
          title="Nothing to test yet."
          description="This study has no trainable positions for your selected side."
          animate={false}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <ChessBoard
        fen={displayFen}
        orientation={checkpoint.side}
        disabled={
          pending ||
          awaitingAdvance ||
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
            {testTitle(checkpoint.mode)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {currentCard ? formatPathSan(currentCard.pathKey) : "Find a move from your repertoire."}
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
                href={testPath(studyId, routeMode, {
                  sideMode: option.value,
                  fresh: true,
                  n: checkpoint.targetCount,
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
          ) : awaitingAdvance ? (
            <>
              {expected.length === 0 ? (
                <Button type="button" onClick={() => revealExpected()}>
                  <Eye />
                  Show expected move(s)
                </Button>
              ) : (
                <Button type="button" onClick={continueTest}>
                  Continue
                  <ArrowRight />
                </Button>
              )}
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
