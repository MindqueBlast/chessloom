export type TrainingShortcut = "back" | "forward" | "retry" | "advance";

export const PRACTICE_INCORRECT_COPY = "Not in your repertoire.";

export function boardAnimationOptions(reduceMotion: boolean) {
  return {
    animationDurationInMs: reduceMotion ? 0 : 140,
    showAnimations: !reduceMotion,
  };
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
