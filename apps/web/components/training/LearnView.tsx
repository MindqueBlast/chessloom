"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  formatPathLabel,
  parseLearnCheckpoint,
  sideToMove,
  type ChapterTree,
  type LearnState,
  type TreeNode,
} from "@chessloom/chess-core";
import { ArrowLeft, ArrowRight, LoaderCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { LazyAnalysisPanel } from "@/components/engine/LazyAnalysisPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  selectLearnBranchAction,
  submitLearnMoveAction,
} from "@/lib/actions/training";
import {
  LEARN_AUTO_CONTINUE_KEY,
  normalizeLearnAutoContinue,
} from "@/lib/settings/preferences";
import { useSound } from "@/lib/sound/useSound";
import { applyResolvedMoveCheckpoint } from "@/lib/training/session";
import {
  OPPONENT_FOLLOW_MS,
  applyUciToFen,
  shortcutForKey,
} from "@/lib/training/ui";
import { SESSION_SIDE_MODES, trainingPath } from "@/lib/training/start";
import { toastCopy } from "@/lib/toasts";

import { FeedbackBanner, type FeedbackKind } from "./FeedbackBanner";

function findNode(node: TreeNode, pathKey: string): TreeNode | null {
  if (node.pathKey === pathKey) return node;
  for (const child of node.children) {
    const found = findNode(child, pathKey);
    if (found) return found;
  }
  return null;
}

export function LearnView({
  studyId,
  sessionId,
  chapters,
  initialCheckpoint,
}: {
  studyId: string;
  sessionId: string;
  chapters: ChapterTree[];
  initialCheckpoint: LearnState;
}) {
  const reduceMotion = useReducedMotion();
  const { play } = useSound();
  const [checkpoint, setCheckpoint] = useState(initialCheckpoint);
  const [pendingCheckpoint, setPendingCheckpoint] = useState<LearnState | null>(
    null,
  );
  const [boardFen, setBoardFen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: FeedbackKind;
    description?: string;
    animate: boolean;
  } | null>(null);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [autoContinue, setAutoContinue] = useState(false);
  const announcedComplete = useRef(initialCheckpoint.status === "complete");
  const opponentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoContinueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chapter = chapters.find(
    (candidate) => candidate.index === checkpoint.chapterIndex,
  );
  const history = [...checkpoint.stack, checkpoint.pathKey];
  const viewedIndex = historyIndex ?? history.length - 1;
  const viewedPath = history[viewedIndex] ?? checkpoint.pathKey;
  const node = chapter ? findNode(chapter.root, viewedPath) : null;
  const isCurrentPosition = viewedPath === checkpoint.pathKey;
  const displayFen =
    isCurrentPosition && boardFen ? boardFen : (node?.fen ?? "");
  const userToMove =
    !node ||
    checkpoint.sideMode === "both" ||
    sideToMove(node.fen) === checkpoint.side;

  useEffect(() => {
    setAutoContinue(
      normalizeLearnAutoContinue(
        window.localStorage.getItem(LEARN_AUTO_CONTINUE_KEY),
      ),
    );
    return () => {
      if (opponentTimer.current) clearTimeout(opponentTimer.current);
      if (autoContinueTimer.current) clearTimeout(autoContinueTimer.current);
    };
  }, []);

  function clearOpponentTimer() {
    if (opponentTimer.current) {
      clearTimeout(opponentTimer.current);
      opponentTimer.current = null;
    }
  }

  function retry() {
    clearOpponentTimer();
    setFeedback(null);
    setPendingCheckpoint(null);
    setBoardFen(null);
  }

  function continueTraining() {
    clearOpponentTimer();
    if (autoContinueTimer.current) {
      clearTimeout(autoContinueTimer.current);
      autoContinueTimer.current = null;
    }
    if (pendingCheckpoint) {
      setCheckpoint(pendingCheckpoint);
      setPendingCheckpoint(null);
      setHistoryIndex(null);
    }
    setBoardFen(null);
    setFeedback(null);
  }

  function selectBranch(uci: string) {
    if (pending || pendingCheckpoint || !isCurrentPosition || !node) return;
    clearOpponentTimer();
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await selectLearnBranchAction({
          sessionId,
          pathKey: checkpoint.pathKey,
          uci,
        });
        const next = applyResolvedMoveCheckpoint(
          result.checkpoint,
          parseLearnCheckpoint,
        );
        play("move");
        setCheckpoint(next);
        setHistoryIndex(null);
        setBoardFen(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : toastCopy.serverError;
        toast.error(message);
        setFeedback({
          kind: "error",
          description: message,
          animate: true,
        });
      }
    });
  }

  function submitMove(uci: string, animate = true) {
    if (pending || pendingCheckpoint || !isCurrentPosition || !node) return;
    if (!userToMove) {
      selectBranch(uci);
      return;
    }
    clearOpponentTimer();
    setFeedback(null);
    const movedFen = applyUciToFen(node.fen, uci);
    if (movedFen) setBoardFen(movedFen);
    play("move");

    startTransition(async () => {
      try {
        const result = await submitLearnMoveAction({
          sessionId,
          pathKey: checkpoint.pathKey,
          uci,
        });
        if (result.ok) {
          const next = applyResolvedMoveCheckpoint(
            result.checkpoint,
            parseLearnCheckpoint,
          );
          setPendingCheckpoint(next);
          play("correct");
          setFeedback({ kind: "correct", animate });

          const resolvedChapter = chapters.find(
            (candidate) => candidate.index === next.chapterIndex,
          );
          const resolvedNode = resolvedChapter
            ? findNode(resolvedChapter.root, next.pathKey)
            : null;
          if (resolvedNode && movedFen && resolvedNode.fen !== movedFen) {
            const delay = reduceMotion ? 0 : OPPONENT_FOLLOW_MS;
            opponentTimer.current = setTimeout(() => {
              setBoardFen(resolvedNode.fen);
            }, delay);
          } else if (resolvedNode) {
            setBoardFen(resolvedNode.fen);
          }

          if (autoContinue) {
            const continueDelay = reduceMotion ? 0 : 450;
            autoContinueTimer.current = setTimeout(() => {
              setCheckpoint(next);
              setPendingCheckpoint(null);
              setHistoryIndex(null);
              setBoardFen(null);
              setFeedback(null);
            }, continueDelay);
          }
        } else {
          play("incorrect");
          setFeedback({
            kind: "incorrect",
            description: "Try another branch from this position.",
            animate,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : toastCopy.serverError;
        toast.error(message);
        setBoardFen(null);
        setFeedback({
          kind: "error",
          description: message,
          animate,
        });
      }
    });
  }

  useEffect(() => {
    const complete =
      checkpoint.status === "complete" ||
      pendingCheckpoint?.status === "complete";
    if (!complete || announcedComplete.current) {
      return;
    }
    announcedComplete.current = true;
    toast.success(toastCopy.sessionCompleted);
  }, [checkpoint.status, pendingCheckpoint]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcutForKey(event.key, event.repeat);
      if (!shortcut) return;
      event.preventDefault();
      if (shortcut === "back") {
        setHistoryIndex((current) =>
          Math.max(0, (current ?? history.length - 1) - 1),
        );
      } else if (shortcut === "forward") {
        setHistoryIndex((current) =>
          Math.min(history.length - 1, (current ?? history.length - 1) + 1),
        );
      } else if (shortcut === "retry") {
        retry();
      } else if (pendingCheckpoint) {
        continueTraining();
      } else if (feedback) {
        retry();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const progressLabel = useMemo(() => {
    return formatPathLabel(checkpoint.pathKey, {
      chapterTitle: chapter?.title,
      chapter,
    });
  }, [checkpoint.pathKey, chapter]);

  if (!chapter || !node) {
    return (
      <FeedbackBanner
        kind="error"
        description="The saved training position is no longer in this study."
        animate={false}
      />
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
          checkpoint.status === "complete" ||
          feedback?.kind === "incorrect"
        }
        onMove={submitMove}
      />

      <div className="space-y-4">
        <div>
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {progressLabel}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Learn · {chapter.title}
          </h1>
        </div>

        {chapters.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {chapters.map((candidate) => (
              <Button
                key={candidate.index}
                asChild
                size="sm"
                variant={
                  candidate.index === checkpoint.chapterIndex
                    ? "default"
                    : "outline"
                }
              >
                <Link
                  href={trainingPath(studyId, "learn", {
                    chapterIndex: candidate.index,
                    sideMode: checkpoint.sideMode,
                  })}
                >
                  Ch. {candidate.index + 1}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}

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
                href={trainingPath(studyId, "learn", {
                  chapterIndex: checkpoint.chapterIndex,
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
          description={feedback?.description}
          animate={feedback?.animate}
        />

        {checkpoint.status === "complete" && !pendingCheckpoint ? (
          <FeedbackBanner
            kind="info"
            title="Chapter complete."
            description="You reached the end of this line."
          />
        ) : null}

        {node.comment ? (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Position note</CardTitle>
            </CardHeader>
            <CardContent className="leading-6 text-muted-foreground">
              {node.comment}
            </CardContent>
          </Card>
        ) : null}

        {isCurrentPosition &&
        node.children.length > 1 &&
        !pendingCheckpoint &&
        !feedback ? (
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                {userToMove ? "Choose a branch" : "Opponent replies"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {node.children.map((child) =>
                child.uci && child.san ? (
                  <Button
                    key={child.pathKey}
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      userToMove
                        ? submitMove(child.uci!)
                        : selectBranch(child.uci!)
                    }
                  >
                    {child.san}
                  </Button>
                ) : null,
              )}
            </CardContent>
          </Card>
        ) : null}

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
          ) : feedback ? (
            <Button type="button" variant="outline" onClick={retry}>
              <RotateCcw />
              Retry
            </Button>
          ) : null}
          <Button
            type="button"
            variant={autoContinue ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={autoContinue}
            onClick={() => {
              const next = !autoContinue;
              setAutoContinue(next);
              try {
                window.localStorage.setItem(
                  LEARN_AUTO_CONTINUE_KEY,
                  next ? "true" : "false",
                );
              } catch {
                // ignore
              }
            }}
          >
            Auto-continue {autoContinue ? "on" : "off"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous position"
            disabled={viewedIndex === 0}
            onClick={() => setHistoryIndex(Math.max(0, viewedIndex - 1))}
          >
            <ArrowLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next position"
            disabled={viewedIndex >= history.length - 1}
            onClick={() =>
              setHistoryIndex(Math.min(history.length - 1, viewedIndex + 1))
            }
          >
            <ArrowRight />
          </Button>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          ←/→ review · R retry · Space/Enter continue
        </p>
      </div>
    </div>
  );
}
