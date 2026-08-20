import type {
  ChapterTree,
  PositionProgress,
  SessionMode,
  TreeNode,
} from "@chessloom/chess-core";

export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type ChapterRow = {
  id: string;
  chapter_index: number;
  name: string;
  initial_fen: string | null;
  headers: unknown;
};

export type NodeRow = {
  id: string;
  chapter_id: string;
  parent_id: string | null;
  path_key: string;
  fen: string;
  san: string | null;
  uci: string | null;
  ply: number;
  comment: string | null;
  nags: unknown;
};

export type SessionGuardRow = {
  user_id: string;
  mode: string;
  status: string;
  updated_at: string;
};

export type ProgressRow = {
  attempts: number;
  correct_count: number;
  streak: number;
  mastery: number;
  last_reviewed_at: string | null;
  due_at: string;
};

function stringRecord(value: unknown): Record<string, string> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.values(value).some((entry) => typeof entry !== "string")
  ) {
    throw new Error("Chapter headers are invalid");
  }
  return value as Record<string, string>;
}

function nagList(value: unknown): number[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => !Number.isInteger(entry) || entry < 0)
  ) {
    throw new Error("Node NAGs are invalid");
  }
  return [...value] as number[];
}

export function buildChapterTrees(
  chapterRows: ChapterRow[],
  nodeRows: NodeRow[],
): ChapterTree[] {
  const nodesByChapter = new Map<string, NodeRow[]>();
  for (const row of nodeRows) {
    const rows = nodesByChapter.get(row.chapter_id) ?? [];
    rows.push(row);
    nodesByChapter.set(row.chapter_id, rows);
  }

  return [...chapterRows]
    .sort((a, b) => a.chapter_index - b.chapter_index)
    .map((chapter): ChapterTree => {
      const rows = nodesByChapter.get(chapter.id) ?? [];
      const byId = new Map<string, TreeNode>();

      for (const row of rows) {
        if (byId.has(row.id)) {
          throw new Error(`Chapter ${chapter.id} contains duplicate node ${row.id}`);
        }
        byId.set(row.id, {
          id: row.id,
          pathKey: row.path_key,
          fen: row.fen,
          san: row.san,
          uci: row.uci,
          ply: row.ply,
          comment: row.comment,
          nags: nagList(row.nags),
          children: [],
        });
      }

      const roots: TreeNode[] = [];
      for (const row of rows) {
        const node = byId.get(row.id)!;
        if (row.parent_id === null) {
          roots.push(node);
          continue;
        }
        const parent = byId.get(row.parent_id);
        if (!parent) {
          throw new Error(
            `Node ${row.id} references missing parent ${row.parent_id}`,
          );
        }
        parent.children.push(node);
      }

      if (roots.length !== 1) {
        throw new Error(`Chapter ${chapter.id} must contain exactly one root`);
      }

      return {
        index: chapter.chapter_index,
        title: chapter.name,
        headers: stringRecord(chapter.headers),
        startingFen: chapter.initial_fen ?? roots[0]!.fen,
        root: roots[0]!,
      };
    });
}

export function assertSessionUsable(
  session: SessionGuardRow,
  userId: string,
  mode: SessionMode,
  now = new Date(),
): void {
  if (session.user_id !== userId) {
    throw new Error("Training session is not owned by the current user");
  }
  if (session.mode !== mode) {
    throw new Error("Training session mode does not match this action");
  }
  if (session.status !== "active") {
    throw new Error("Training session is not active");
  }

  const updatedAt = Date.parse(session.updated_at);
  if (!Number.isFinite(updatedAt) || now.getTime() - updatedAt > SESSION_TTL_MS) {
    throw new Error("Training session has expired");
  }
}

export function progressFromRow(
  pathKey: string,
  row: ProgressRow,
): PositionProgress {
  return {
    pathKey,
    attempts: row.attempts,
    correctCount: row.correct_count,
    streak: row.streak,
    mastery: row.mastery,
    lastReviewedAt: row.last_reviewed_at,
    nextReviewAt: row.due_at,
  };
}

export function progressToRow(progress: PositionProgress): ProgressRow {
  return {
    attempts: progress.attempts,
    correct_count: progress.correctCount,
    streak: progress.streak,
    mastery: progress.mastery,
    last_reviewed_at: progress.lastReviewedAt,
    due_at: progress.nextReviewAt,
  };
}
