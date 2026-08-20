"use client";

import { useMemo } from "react";
import { Chess, type Square } from "chess.js";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { Chessboard } from "react-chessboard";

import { boardAnimationOptions, toUci } from "@/lib/training/ui";

import { BoardFrame } from "./BoardFrame";

export function ChessBoard({
  fen,
  orientation = "white",
  disabled = false,
  onMove,
}: {
  fen: string;
  orientation?: "white" | "black";
  disabled?: boolean;
  onMove: (uci: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const isDark = resolvedTheme !== "light";
  const game = useMemo(() => new Chess(fen), [fen]);

  return (
    <BoardFrame>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: !disabled,
          ...boardAnimationOptions(Boolean(reduceMotion)),
          darkSquareStyle: {
            backgroundColor: isDark ? "#285b5d" : "#4f8583",
          },
          lightSquareStyle: {
            backgroundColor: isDark ? "#a9c7bd" : "#dce9e2",
          },
          boardStyle: {
            borderRadius: "0.75rem",
          },
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (disabled || !sourceSquare || !targetSquare) return false;
            const piece = game.get(sourceSquare as Square);
            onMove(
              toUci(
                sourceSquare,
                targetSquare,
                piece?.type === "p" ? "p" : undefined,
              ),
            );
            return true;
          },
        }}
      />
    </BoardFrame>
  );
}
