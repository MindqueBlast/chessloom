import type { StudyTree, TreeNode } from "@chessloom/chess-core";

export const INLINE_PGN_LIMIT = 200_000;

export type ImportNode = {
  path_key: string;
  parent_path_key: string | null;
  ply: number;
  san: string | null;
  uci: string | null;
  fen: string;
  comment: string | null;
  nags: number[];
};

export type ImportChapter = {
  chapter_index: number;
  name: string;
  initial_fen: string;
  headers: Record<string, string>;
  nodes: ImportNode[];
};

function flattenNode(
  node: TreeNode,
  parentPathKey: string | null,
  output: ImportNode[],
) {
  output.push({
    path_key: node.pathKey,
    parent_path_key: parentPathKey,
    ply: node.ply,
    san: node.san,
    uci: node.uci,
    fen: node.fen,
    comment: node.comment,
    nags: node.nags,
  });

  for (const child of node.children) {
    flattenNode(child, node.pathKey, output);
  }
}

export function flattenStudyTree(study: StudyTree): ImportChapter[] {
  return study.chapters.map((chapter) => {
    const nodes: ImportNode[] = [];
    flattenNode(chapter.root, null, nodes);

    return {
      chapter_index: chapter.index,
      name: chapter.title,
      initial_fen: chapter.startingFen,
      headers: chapter.headers,
      nodes,
    };
  });
}

export function importSource(pgnLength: number) {
  const useStorage = pgnLength > INLINE_PGN_LIMIT;
  return {
    sourceType: useStorage ? "pgn_upload" : "pgn_paste",
    useStorage,
  } as const;
}
