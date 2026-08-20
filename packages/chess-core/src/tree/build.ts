import type { ParseTree } from "@mliebelt/pgn-parser";
import { Chess } from "chess.js";
import { buildPathKey } from "../path-key.js";
import type { ChapterTree, Nag, TreeNode } from "../types.js";

type ParsedMove = ParseTree["moves"][number];

function createRoot(
  chapterIndex: number,
  chess: Chess,
  comment: string | null,
): TreeNode {
  return {
    id: crypto.randomUUID(),
    pathKey: buildPathKey(chapterIndex, []),
    fen: chess.fen(),
    san: null,
    uci: null,
    ply: 0,
    comment,
    nags: [],
    children: [],
  };
}

function parseNags(nags: string[] | null | undefined): Nag[] {
  return (nags ?? [])
    .map((nag) => Number.parseInt(nag.replace(/^\$/, ""), 10))
    .filter(Number.isFinite);
}

function moveComment(move: ParsedMove): string | null {
  const comments = [
    ...new Set(
      [move.commentMove, move.commentDiag?.comment, move.commentAfter].filter(
        (comment): comment is string => Boolean(comment),
      ),
    ),
  ];
  return comments.length > 0 ? comments.join("\n") : null;
}

function appendLine(
  parent: TreeNode,
  moves: ParsedMove[],
  position: Chess,
  chapterIndex: number,
  parentPath: string[],
): void {
  let currentParent = parent;
  let currentPosition = position;
  let currentPath = parentPath;

  for (const parsedMove of moves) {
    for (const variation of parsedMove.variations ?? []) {
      appendLine(
        currentParent,
        variation,
        new Chess(currentPosition.fen()),
        chapterIndex,
        currentPath,
      );
    }

    const move = currentPosition.move(parsedMove.notation.notation);
    if (!move) {
      throw new Error(`Illegal PGN move: ${parsedMove.notation.notation}`);
    }

    const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
    const path = [...currentPath, uci];
    const node: TreeNode = {
      id: crypto.randomUUID(),
      pathKey: buildPathKey(chapterIndex, path),
      fen: currentPosition.fen(),
      san: move.san,
      uci,
      ply: currentParent.ply + 1,
      comment: moveComment(parsedMove),
      nags: parseNags(parsedMove.nag),
      children: [],
    };

    currentParent.children.push(node);
    currentParent = node;
    currentPath = path;
  }
}

export function buildChapter(
  game: ParseTree,
  chapterIndex: number,
  headers: Record<string, string>,
): ChapterTree {
  const startingFen = headers.FEN;
  const chess = startingFen ? new Chess(startingFen) : new Chess();
  const normalizedStartingFen = chess.fen();
  const root = createRoot(
    chapterIndex,
    chess,
    game.gameComment?.comment ?? null,
  );

  appendLine(root, game.moves, chess, chapterIndex, []);

  return {
    index: chapterIndex,
    title: headers.Event ?? `Chapter ${chapterIndex + 1}`,
    headers,
    startingFen: normalizedStartingFen,
    root,
  };
}
