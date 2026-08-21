import { Chess } from "chess.js";

export type TrainingShortcut = "back" | "forward" | "retry" | "advance";

export const PRACTICE_INCORRECT_COPY = "Not in your repertoire.";

/** Delay before animating an auto-played opponent reply on the board. */
export const OPPONENT_FOLLOW_MS = 220;

export function boardAnimationOptions(reduceMotion: boolean) {
  return {
    animationDurationInMs: reduceMotion ? 0 : 140,
    showAnimations: !reduceMotion,
  };
}

/** Apply a UCI move to a FEN for immediate board feedback. Returns null if illegal. */
export function applyUciToFen(fen: string, uci: string): string | null {
  if (uci.length < 4) return null;
  try {
    const game = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const moved = game.move({
      from,
      to,
      promotion: promotion === "q" || promotion === "r" || promotion === "b" || promotion === "n"
        ? promotion
        : undefined,
    });
    return moved ? game.fen() : null;
  } catch {
    return null;
  }
}

export function toUci(
  sourceSquare: string,
  targetSquare: string,
  piece?: string,
): string {
  const isPawn = piece?.at(-1)?.toLowerCase() === "p";
  const isPromotion = isPawn && (targetSquare[1] === "1" || targetSquare[1] === "8");
  return `${sourceSquare}${targetSquare}${isPromotion ? "q" : ""}`;
}

export function shortcutForKey(
  key: string,
  repeat: boolean,
): TrainingShortcut | null {
  if (repeat) return null;
  if (key === "ArrowLeft") return "back";
  if (key === "ArrowRight") return "forward";
  if (key.toLowerCase() === "r") return "retry";
  if (key === " " || key === "Enter") return "advance";
  return null;
}
