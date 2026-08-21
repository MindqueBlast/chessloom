"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { useReducedMotion } from "motion/react";
import { Chessboard } from "react-chessboard";

import { useBoardSquareColors } from "@/lib/theme/board-colors";
import { boardAnimationOptions } from "@/lib/training/ui";

const DEMO_START =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Compact, non-interactive board for marketing demos. */
export function ShowcaseBoard({
  fen,
  className,
}: {
  fen: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const squareColors = useBoardSquareColors();

  return (
    <div
      className={
        className ??
        "mx-auto w-full max-w-[17rem] overflow-hidden rounded-xl ring-1 ring-foreground/10"
      }
    >
      <Chessboard
        options={{
          position: fen,
          allowDragging: false,
          ...boardAnimationOptions(Boolean(reduceMotion)),
          darkSquareStyle: {
            backgroundColor: squareColors.dark,
          },
          lightSquareStyle: {
            backgroundColor: squareColors.light,
          },
          boardStyle: {
            borderRadius: "0.75rem",
          },
        }}
      />
    </div>
  );
}

const LEARN_LINE = ["e2e4", "e7e5", "g1f3", "b8c6"] as const;

export function useCyclingLearnFen() {
  const reduceMotion = useReducedMotion();
  const positions = useMemo(() => {
    const game = new Chess(DEMO_START);
    const fens = [game.fen()];
    for (const uci of LEARN_LINE) {
      game.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
      });
      fens.push(game.fen());
    }
    return fens;
  }, []);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % positions.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, [positions.length, reduceMotion]);

  return positions[reduceMotion ? positions.length - 1 : index] ?? DEMO_START;
}

export function usePracticeFlashFen() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const start = DEMO_START;
  const after = useMemo(() => {
    const game = new Chess(start);
    game.move({ from: "e2", to: "e4" });
    return game.fen();
  }, [start]);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setPhase((current) => (current + 1) % 4);
    }, 1100);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  if (reduceMotion) return { fen: after, label: "Correct." as const };
  if (phase === 0) return { fen: start, label: "Your move" as const };
  if (phase === 1 || phase === 2)
    return { fen: after, label: "Correct." as const };
  return { fen: start, label: "Next position" as const };
}
