"use client";

import { useMemo } from "react";
import { Chess, type Square } from "chess.js";
import { useReducedMotion } from "motion/react";
import { Chessboard } from "react-chessboard";

import { useBoardSquareColors } from "@/lib/theme/board-colors";
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
  const reduceMotion = useReducedMotion();
  const squareColors = useBoardSquareColors();
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
            backgroundColor: squareColors.dark,
          },
          lightSquareStyle: {
            backgroundColor: squareColors.light,
          },
          boardStyle: {
            borderRadius: "0.75rem",
          },
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (disabled || !sourceSquare || !targetSquare) return false;
            const piece = game.get(sourceSquare as Square);
            const uci = toUci(
              sourceSquare,
              targetSquare,
              piece?.type === "p" ? "p" : undefined,
            );
            try {
              const probe = new Chess(fen);
              const moved = probe.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: uci.length > 4 ? (uci[4] as "q") : undefined,
              });
              if (!moved) return false;
            } catch {
              return false;
            }
            onMove(uci);
            return true;
          },
        }}
      />
    </BoardFrame>
  );
}
