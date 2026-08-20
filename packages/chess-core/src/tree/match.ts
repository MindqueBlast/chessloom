import type { ChapterTree, PathKey, TreeNode } from "../types.js";

export type MatchResult =
  | { ok: true; child: TreeNode }
  | { ok: false; expected: TreeNode[] };

function normalizeSan(san: string): string {
  return san.trim().replace(/0/g, "O").replace(/[+#?!]+$/, "");
}

function normalizeUci(uci: string): string {
  return uci.trim().toLowerCase();
}

export function isRepertoireMove(
  node: TreeNode,
  move: { san?: string; uci?: string },
): MatchResult {
  const san = move.san === undefined ? null : normalizeSan(move.san);
  const uci = move.uci === undefined ? null : normalizeUci(move.uci);

  const child = node.children.find(
    (candidate) =>
      (san !== null &&
        candidate.san !== null &&
        normalizeSan(candidate.san) === san) ||
      (uci !== null &&
        candidate.uci !== null &&
        normalizeUci(candidate.uci) === uci),
  );

  return child
    ? { ok: true, child }
    : { ok: false, expected: [...node.children] };
}

export function findNodeByPathKey(
  chapter: ChapterTree,
  pathKey: PathKey,
): TreeNode | null {
  const pending = [chapter.root];

  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.pathKey === pathKey) {
      return node;
    }
    pending.push(...node.children);
  }

  return null;
}
