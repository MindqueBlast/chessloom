import type { PathKey } from "./types.js";

export function buildPathKey(
  chapterIndex: number,
  uciPath: string[],
): PathKey {
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0) {
    throw new Error(`Invalid chapterIndex: ${chapterIndex}`);
  }
  return `c${chapterIndex}:${uciPath.join("/")}`;
}
