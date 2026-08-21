import {
  createFsrsScheduler,
  createInitialFsrsProgress,
  learnAutoOpponentIfNeeded,
  migrateLightweightToFsrs,
  parseLearnCheckpoint,
  parsePracticeCheckpoint,
  serializeCheckpoint,
  startLearn,
  startPractice,
  type LearnState,
  type PracticeState,
  type ChapterTree,
  type PositionProgress,
  type SideMode,
  type SessionMode,
  type TreeNode,
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
  fsrs_stability: number;
  fsrs_difficulty: number;
  fsrs_elapsed_days: number;
  fsrs_scheduled_days: number;
  fsrs_reps: number;
  fsrs_lapses: number;
  fsrs_state: number;
  fsrs_learning_steps: number;
  fsrs_last_review: string | null;
};

export const PROGRESS_ROW_SELECT =
  "attempts,correct_count,streak,mastery,last_reviewed_at,due_at,fsrs_stability,fsrs_difficulty,fsrs_elapsed_days,fsrs_scheduled_days,fsrs_reps,fsrs_lapses,fsrs_state,fsrs_learning_steps,fsrs_last_review";

export type PracticeProgressRow = ProgressRow & {
  path_key: string;
};

export function normalizeTrainingSideMode(value: unknown): SideMode {
  return value === "white" ||
    value === "black" ||
    value === "both" ||
    value === "random"
    ? value
    : "both";
}

function hasExactKeys(value: unknown, keys: readonly string[]): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function samePracticeState(a: PracticeState, b: PracticeState): boolean {
  return (
    a.index === b.index &&
    a.revealed === b.revealed &&
    a.side === b.side &&
    a.status === b.status &&
    a.queue.length === b.queue.length &&
    a.queue.every(
      (card, index) =>
        card.pathKey === b.queue[index]?.pathKey &&
        card.fen === b.queue[index]?.fen,
    )
  );
}

function sameLearnState(a: LearnState, b: LearnState): boolean {
  return (
    a.chapterIndex === b.chapterIndex &&
    a.pathKey === b.pathKey &&
    a.side === b.side &&
    a.sideMode === b.sideMode &&
    a.status === b.status &&
    a.stack.length === b.stack.length &&
    a.stack.every((pathKey, index) => pathKey === b.stack[index])
  );
}

export function parseClientCheckpointUpdate(
  mode: "learn",
  checkpoint: unknown,
  currentCheckpoint: unknown,
): LearnState;
export function parseClientCheckpointUpdate(
  mode: "practice",
  checkpoint: unknown,
  currentCheckpoint: unknown,
): PracticeState;
export function parseClientCheckpointUpdate(
  mode: SessionMode,
  checkpoint: unknown,
  currentCheckpoint: unknown,
): LearnState | PracticeState {
  if (mode === "learn") {
    if (
      !hasExactKeys(checkpoint, [
        "chapterIndex",
        "pathKey",
        "side",
        "sideMode",
        "stack",
        "status",
      ])
    ) {
      throw new Error("Learn checkpoint schema is invalid");
    }
    const state = parseLearnCheckpoint(serializeCheckpoint(checkpoint));
    const current = parseLearnCheckpoint(serializeCheckpoint(currentCheckpoint));
    if (!state.pathKey.trim() || state.stack.some((pathKey) => !pathKey.trim())) {
      throw new Error("Learn checkpoint path cannot be empty");
    }
    if (state.status === "complete") {
      throw new Error("Client checkpoints cannot complete a session");
    }
    if (!sameLearnState(state, current)) {
      throw new Error("Checkpoint does not match the current server checkpoint");
    }
    return state;
  }

  if (
    !hasExactKeys(checkpoint, [
      "queue",
      "index",
      "revealed",
      "side",
      "status",
    ]) ||
    !(checkpoint as { queue?: unknown }).queue ||
    !Array.isArray((checkpoint as { queue: unknown }).queue) ||
    !(checkpoint as { queue: unknown[] }).queue.every((card) =>
      hasExactKeys(card, ["pathKey", "fen"]),
    )
  ) {
    throw new Error("Practice checkpoint schema is invalid");
  }
  const state = parsePracticeCheckpoint(serializeCheckpoint(checkpoint));
  const current = parsePracticeCheckpoint(serializeCheckpoint(currentCheckpoint));
  if (state.queue.some((card) => !card.pathKey.trim())) {
    throw new Error("Practice checkpoint path cannot be empty");
  }
  if (state.status === "complete") {
    throw new Error("Client checkpoints cannot complete a session");
  }
  if (state.index >= state.queue.length) {
    throw new Error("Practice checkpoint index must be within the queue");
  }
  if (!samePracticeState(state, current)) {
    throw new Error("Checkpoint does not match the current server checkpoint");
  }
  return state;
}

export function trainingResultRpcPayload(
  userId: string,
  sessionId: string,
  studyId: string,
  pathKey: string,
  correct: boolean,
  progress: ProgressRow,
  checkpoint: unknown,
  expectedUpdatedAt: string,
): {
  p_user_id: string;
  p_session_id: string;
  p_study_id: string;
  p_path_key: string;
  p_correct: boolean;
  p_progress: ProgressRow;
  p_checkpoint: unknown;
  p_expected_updated_at: string;
} {
  if (!pathKey.trim()) {
    throw new Error("Training result path cannot be empty");
  }
  return {
    p_user_id: userId,
    p_session_id: sessionId,
    p_study_id: studyId,
    p_path_key: pathKey,
    p_correct: correct,
    p_progress: progress,
    p_checkpoint: checkpoint,
    p_expected_updated_at: expectedUpdatedAt,
  };
}

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

export function resolveLearnChapter(
  chapters: ChapterTree[],
  chapterIndex?: number,
): ChapterTree {
  if (chapters.length === 0) {
    throw new Error("This study has no chapters to train");
  }
  if (chapterIndex === undefined) {
    return chapters[0]!;
  }
  const chapter = chapters.find((candidate) => candidate.index === chapterIndex);
  if (!chapter) {
    throw new Error("That chapter is not in this study");
  }
  return chapter;
}

export function createInitialTrainingCheckpoint(
  mode: "learn",
  chapters: ChapterTree[],
  sideMode: SideMode,
  chapterIndex?: number,
): LearnState;
export function createInitialTrainingCheckpoint(
  mode: "practice",
  chapters: ChapterTree[],
  sideMode: SideMode,
  progressRows?: PracticeProgressRow[],
  now?: Date,
): PracticeState;
export function createInitialTrainingCheckpoint(
  mode: SessionMode,
  chapters: ChapterTree[],
  sideMode: SideMode,
  progressRows?: PracticeProgressRow[],
  now?: Date,
): LearnState | PracticeState;
export function createInitialTrainingCheckpoint(
  mode: SessionMode,
  chapters: ChapterTree[],
  sideMode: SideMode,
  progressRowsOrChapterIndex: PracticeProgressRow[] | number = [],
  now = new Date(),
): LearnState | PracticeState {
  const chapterIndex =
    typeof progressRowsOrChapterIndex === "number"
      ? progressRowsOrChapterIndex
      : undefined;
  const progressRows =
    typeof progressRowsOrChapterIndex === "number"
      ? []
      : progressRowsOrChapterIndex;

  if (mode === "learn") {
    const chapter = resolveLearnChapter(chapters, chapterIndex);
    return learnAutoOpponentIfNeeded(
      startLearn(chapter, sideMode),
      chapter,
    );
  }

  if (chapters.length === 0) {
    throw new Error("This study has no chapters to train");
  }

  const cards: Array<{ pathKey: string; fen: string }> = [];
  const collect = (node: TreeNode) => {
    if (node.children.length > 0) {
      cards.push({ pathKey: node.pathKey, fen: node.fen });
    }
    node.children.forEach(collect);
  };
  chapters.forEach((chapter) => collect(chapter.root));
  return startPractice(buildPracticeQueue(cards, progressRows, now), sideMode);
}

export function buildPracticeQueue(
  cards: Array<{ pathKey: string; fen: string }>,
  progressRows: PracticeProgressRow[] = [],
  now = new Date(),
): Array<{ pathKey: string; fen: string }> {
  const progressByPath = new Map(
    progressRows.map((row) => [
      row.path_key,
      progressFromRowMigrating(row.path_key, row, now),
    ]),
  );
  const scheduler = createFsrsScheduler();
  const nowIso = now.toISOString();

  return cards
    .map((card) => ({
      card,
      progress:
        progressByPath.get(card.pathKey) ??
        createInitialFsrsProgress(card.pathKey, now),
    }))
    .filter(({ progress }) => progress.nextReviewAt <= nowIso)
    .sort((a, b) => scheduler.compareDue(a.progress, b.progress))
    .map(({ card }) => card);
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

function needsFsrsMigration(row: ProgressRow): boolean {
  const isDefaultNewFsrs = row.fsrs_stability === 0 && row.fsrs_state === 0;
  const hasLegacyActivity = row.mastery > 0 || row.last_reviewed_at !== null;
  return isDefaultNewFsrs && hasLegacyActivity;
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
    fsrsStability: row.fsrs_stability,
    fsrsDifficulty: row.fsrs_difficulty,
    fsrsElapsedDays: row.fsrs_elapsed_days,
    fsrsScheduledDays: row.fsrs_scheduled_days,
    fsrsReps: row.fsrs_reps,
    fsrsLapses: row.fsrs_lapses,
    fsrsState: row.fsrs_state,
    fsrsLearningSteps: row.fsrs_learning_steps,
    fsrsLastReview: row.fsrs_last_review,
  };
}

export function progressFromRowMigrating(
  pathKey: string,
  row: ProgressRow,
  now = new Date(),
): PositionProgress {
  const progress = progressFromRow(pathKey, row);
  if (needsFsrsMigration(row)) {
    return migrateLightweightToFsrs(progress, now);
  }
  return progress;
}

export function progressToRow(progress: PositionProgress): ProgressRow {
  return {
    attempts: progress.attempts,
    correct_count: progress.correctCount,
    streak: progress.streak,
    mastery: progress.mastery,
    last_reviewed_at: progress.lastReviewedAt,
    due_at: progress.nextReviewAt,
    fsrs_stability: progress.fsrsStability,
    fsrs_difficulty: progress.fsrsDifficulty,
    fsrs_elapsed_days: progress.fsrsElapsedDays,
    fsrs_scheduled_days: progress.fsrsScheduledDays,
    fsrs_reps: progress.fsrsReps,
    fsrs_lapses: progress.fsrsLapses,
    fsrs_state: progress.fsrsState,
    fsrs_learning_steps: progress.fsrsLearningSteps,
    fsrs_last_review: progress.fsrsLastReview,
  };
}
