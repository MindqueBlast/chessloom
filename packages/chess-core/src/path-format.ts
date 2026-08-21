import { Chess } from "chess.js";

import type { ChapterTree, Fen, PathKey, San, TreeNode } from "./types.js";

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface ParsedPathKey {
  chapterIndex: number;
  uciMoves: string[];
}

export function parsePathKey(pathKey: PathKey): ParsedPathKey {
  const match = /^c(\d+):(.*)$/.exec(pathKey);
  if (!match) {
    throw new Error(`Invalid path key: ${pathKey}`);
  }
  const chapterIndex = Number(match[1]);
  const rest = match[2] ?? "";
  const uciMoves = rest.length === 0 ? [] : rest.split("/");
  return { chapterIndex, uciMoves };
}

function formatSansAsLine(sans: San[]): string {
  if (sans.length === 0) {
    return "Starting position";
  }

  const parts: string[] = [];
  for (let index = 0; index < sans.length; index += 1) {
    const san = sans[index];
    if (index % 2 === 0) {
      parts.push(`${Math.floor(index / 2) + 1}. ${san}`);
    } else {
      parts.push(san);
    }
  }
  return parts.join(" ");
}

/** Replay UCI segments from a path key into a human SAN line. */
export function formatPathSan(
  pathKey: PathKey,
  startingFen: Fen = START_FEN,
): string {
  const { uciMoves } = parsePathKey(pathKey);
  if (uciMoves.length === 0) {
    return "Starting position";
  }

  const game = new Chess(startingFen);
  const sans: San[] = [];
  for (const uci of uciMoves) {
    if (uci.length < 4) {
      return pathKey;
    }
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      const moved = game.move({
        from,
        to,
        promotion: promotion as "q" | "r" | "b" | "n" | undefined,
      });
      if (!moved) {
        return pathKey;
      }
      sans.push(moved.san);
    } catch {
      return pathKey;
    }
  }
  return formatSansAsLine(sans);
}

/** Prefer tree SANs when a chapter is available (handles comments / accuracy). */
export function formatPathFromChapter(
  chapter: ChapterTree,
  pathKey: PathKey,
): string {
  const { chapterIndex, uciMoves } = parsePathKey(pathKey);
  if (chapterIndex !== chapter.index) {
    return formatPathSan(pathKey, chapter.startingFen);
  }

  let node: TreeNode = chapter.root;
  const sans: San[] = [];
  for (const uci of uciMoves) {
    const child = node.children.find((entry) => entry.uci === uci);
    if (!child) {
      return formatPathSan(pathKey, chapter.startingFen);
    }
    if (child.san) {
      sans.push(child.san);
    }
    node = child;
  }
  return formatSansAsLine(sans);
}

export function formatPathLabel(
  pathKey: PathKey,
  options?: {
    chapterTitle?: string | null;
    startingFen?: Fen;
    chapter?: ChapterTree;
  },
): string {
  const line = options?.chapter
    ? formatPathFromChapter(options.chapter, pathKey)
    : formatPathSan(pathKey, options?.startingFen);
  const title = options?.chapterTitle?.trim();
  if (!title) {
    return line;
  }
  return `${title} · ${line}`;
}
