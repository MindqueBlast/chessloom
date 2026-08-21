import { describe, expect, it } from "vitest";

import {
  assertSessionUsable,
  buildChapterTrees,
  createInitialTestCheckpoint,
  createInitialTrainingCheckpoint,
  normalizeTrainingSideMode,
  parseClientCheckpointUpdate,
  progressFromRow,
  progressFromRowMigrating,
  progressToRow,
  resolveLearnChapter,
  trainingResultRpcPayload,
  type ProgressRow,
} from "./training-helpers";

const defaultFsrsRow = {
  fsrs_stability: 0,
  fsrs_difficulty: 0,
  fsrs_elapsed_days: 0,
  fsrs_scheduled_days: 0,
  fsrs_reps: 0,
  fsrs_lapses: 0,
  fsrs_state: 0,
  fsrs_learning_steps: 0,
  fsrs_last_review: null,
} satisfies Pick<
  ProgressRow,
  | "fsrs_stability"
  | "fsrs_difficulty"
  | "fsrs_elapsed_days"
  | "fsrs_scheduled_days"
  | "fsrs_reps"
  | "fsrs_lapses"
  | "fsrs_state"
  | "fsrs_learning_steps"
  | "fsrs_last_review"
>;

const chapters = [
  {
    id: "chapter-1",
    chapter_index: 0,
    name: "Main line",
    initial_fen: "root-fen",
    headers: { Event: "Test" },
  },
];

describe("buildChapterTrees", () => {
  it("rebuilds parent-child adjacency regardless of row order", () => {
    const trees = buildChapterTrees(chapters, [
      {
        id: "child",
        chapter_id: "chapter-1",
        parent_id: "root",
        path_key: "c0:e2e4",
        fen: "child-fen",
        san: "e4",
        uci: "e2e4",
        ply: 1,
        comment: "King pawn",
        nags: [1],
      },
      {
        id: "root",
        chapter_id: "chapter-1",
        parent_id: null,
        path_key: "c0:",
        fen: "root-fen",
        san: null,
        uci: null,
        ply: 0,
        comment: null,
        nags: [],
      },
    ]);

    expect(trees).toHaveLength(1);
    expect(trees[0]).toMatchObject({
      index: 0,
      title: "Main line",
      startingFen: "root-fen",
      root: {
        id: "root",
        pathKey: "c0:",
        children: [{ id: "child", pathKey: "c0:e2e4" }],
      },
    });
  });

  it("rejects a node whose parent is missing", () => {
    expect(() =>
      buildChapterTrees(chapters, [
        {
          id: "child",
          chapter_id: "chapter-1",
          parent_id: "missing",
          path_key: "c0:e2e4",
          fen: "child-fen",
          san: "e4",
          uci: "e2e4",
          ply: 1,
          comment: null,
          nags: [],
        },
      ]),
    ).toThrow("missing parent");
  });

  it("rejects chapters with multiple roots", () => {
    const roots = ["root-1", "root-2"].map((id) => ({
      id,
      chapter_id: "chapter-1",
      parent_id: null,
      path_key: `c0:${id}`,
      fen: "root-fen",
      san: null,
      uci: null,
      ply: 0,
      comment: null,
      nags: [],
    }));

    expect(() => buildChapterTrees(chapters, roots)).toThrow(
      "exactly one root",
    );
  });
});

describe("assertSessionUsable", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");

  it("accepts an owned active session at the 14-day boundary", () => {
    expect(() =>
      assertSessionUsable(
        {
          user_id: "user-1",
          mode: "practice",
          status: "active",
          updated_at: "2026-08-06T12:00:00.000Z",
        },
        "user-1",
        "practice",
        now,
      ),
    ).not.toThrow();
  });

  it("rejects a session older than 14 days", () => {
    expect(() =>
      assertSessionUsable(
        {
          user_id: "user-1",
          mode: "practice",
          status: "active",
          updated_at: "2026-08-06T11:59:59.999Z",
        },
        "user-1",
        "practice",
        now,
      ),
    ).toThrow("expired");
  });
});

describe("progress row mapping", () => {
  it("maps scheduler fields without accepting client-shaped values", () => {
    const row: ProgressRow = {
      attempts: 3,
      correct_count: 2,
      streak: 1,
      mastery: 24,
      last_reviewed_at: "2026-08-20T10:00:00.000Z",
      due_at: "2026-08-21T10:00:00.000Z",
      fsrs_stability: 7,
      fsrs_difficulty: 5.2,
      fsrs_elapsed_days: 1,
      fsrs_scheduled_days: 3,
      fsrs_reps: 2,
      fsrs_lapses: 1,
      fsrs_state: 2,
      fsrs_learning_steps: 0,
      fsrs_last_review: "2026-08-20T10:00:00.000Z",
    };
    const progress = progressFromRow("c0:", row);

    expect(progress).toEqual({
      pathKey: "c0:",
      attempts: 3,
      correctCount: 2,
      streak: 1,
      mastery: 24,
      lastReviewedAt: "2026-08-20T10:00:00.000Z",
      nextReviewAt: "2026-08-21T10:00:00.000Z",
      fsrsStability: 7,
      fsrsDifficulty: 5.2,
      fsrsElapsedDays: 1,
      fsrsScheduledDays: 3,
      fsrsReps: 2,
      fsrsLapses: 1,
      fsrsState: 2,
      fsrsLearningSteps: 0,
      fsrsLastReview: "2026-08-20T10:00:00.000Z",
    });
    expect(progressToRow(progress)).toEqual(row);
  });

  it("migrates legacy lightweight rows on read", () => {
    const row: ProgressRow = {
      attempts: 5,
      correct_count: 4,
      streak: 2,
      mastery: 40,
      last_reviewed_at: "2026-08-20T10:00:00.000Z",
      due_at: "2026-08-21T10:00:00.000Z",
      ...defaultFsrsRow,
    };
    const now = new Date("2026-08-20T12:00:00.000Z");
    const migrated = progressFromRowMigrating("c0:e2e4", row, now);

    expect(migrated.fsrsStability).toBeGreaterThan(0);
    expect(migrated.fsrsState).toBe(2);
    expect(migrated.nextReviewAt).toBe(row.due_at);
  });
});

describe("trainingResultRpcPayload", () => {
  it("sends FSRS-authored progress and checkpoint fields", () => {
    const checkpoint = { pathKey: "c0:e2e4", status: "active" };
    const progress: ProgressRow = {
      attempts: 1,
      correct_count: 1,
      streak: 1,
      mastery: 90,
      last_reviewed_at: "2026-08-20T12:00:00.000Z",
      due_at: "2026-08-21T12:00:00.000Z",
      fsrs_stability: 3.5,
      fsrs_difficulty: 4.8,
      fsrs_elapsed_days: 0,
      fsrs_scheduled_days: 1,
      fsrs_reps: 1,
      fsrs_lapses: 0,
      fsrs_state: 2,
      fsrs_learning_steps: 0,
      fsrs_last_review: "2026-08-20T12:00:00.000Z",
    };
    const payload = trainingResultRpcPayload(
      "user-1",
      "session-1",
      "study-1",
      "c0:e2e4",
      true,
      progress,
      checkpoint,
      "2026-08-20T12:00:00.000Z",
    );

    expect(payload).toEqual({
      p_user_id: "user-1",
      p_session_id: "session-1",
      p_study_id: "study-1",
      p_path_key: "c0:e2e4",
      p_correct: true,
      p_progress: progress,
      p_checkpoint: checkpoint,
      p_expected_updated_at: "2026-08-20T12:00:00.000Z",
    });
    expect(payload).not.toHaveProperty("p_mastery");
    expect(payload).not.toHaveProperty("p_attempts");
  });
});

describe("parseClientCheckpointUpdate", () => {
  const practiceCheckpoint = {
    queue: [{ pathKey: "c0:", fen: "root-fen" }],
    index: 0,
    revealed: false,
    side: "white" as const,
    status: "active" as const,
  };

  it("rejects client completion and practice indices outside the queue", () => {
    expect(() =>
      parseClientCheckpointUpdate("practice", {
        ...practiceCheckpoint,
        status: "complete",
      }, practiceCheckpoint),
    ).toThrow("complete");
    expect(() =>
      parseClientCheckpointUpdate("practice", {
        ...practiceCheckpoint,
        index: practiceCheckpoint.queue.length,
      }, practiceCheckpoint),
    ).toThrow("index");
  });

  it("rejects empty paths, extra fields, and practice jumps", () => {
    expect(() =>
      parseClientCheckpointUpdate("practice", {
        ...practiceCheckpoint,
        queue: [{ pathKey: "", fen: "root-fen" }],
      }, practiceCheckpoint),
    ).toThrow("path");
    expect(() =>
      parseClientCheckpointUpdate("practice", {
        ...practiceCheckpoint,
        forged: true,
      }, practiceCheckpoint),
    ).toThrow("schema");
    expect(() =>
      parseClientCheckpointUpdate("practice", {
        ...practiceCheckpoint,
        queue: [
          ...practiceCheckpoint.queue,
          { pathKey: "c0:e2e4", fen: "after-e4" },
        ],
      }, practiceCheckpoint),
    ).toThrow("current server checkpoint");
  });

  it("rejects learn path and stack jumps", () => {
    const current = {
      chapterIndex: 0,
      pathKey: "c0:",
      side: "white" as const,
      sideMode: "white" as const,
      stack: [],
      status: "active" as const,
    };
    expect(() =>
      parseClientCheckpointUpdate("learn", {
        ...current,
        pathKey: "c0:e2e4",
        stack: ["c0:"],
      }, current),
    ).toThrow("current server checkpoint");
  });
});

describe("createInitialTrainingCheckpoint", () => {
  const tree = buildChapterTrees(
    [
      {
        id: "chapter-1",
        chapter_index: 0,
        name: "Main line",
        initial_fen:
          "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        headers: {},
      },
    ],
    [
      {
        id: "root",
        chapter_id: "chapter-1",
        parent_id: null,
        path_key: "c0:",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        san: null,
        uci: null,
        ply: 0,
        comment: null,
        nags: [],
      },
      {
        id: "child",
        chapter_id: "chapter-1",
        parent_id: "root",
        path_key: "c0:e2e4",
        fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        san: "e4",
        uci: "e2e4",
        ply: 1,
        comment: null,
        nags: [],
      },
      {
        id: "reply",
        chapter_id: "chapter-1",
        parent_id: "child",
        path_key: "c0:e2e4.e7e5",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        san: "e5",
        uci: "e7e5",
        ply: 2,
        comment: null,
        nags: [],
      },
    ],
  );

  it("advances the opening move when learning as black", () => {
    expect(createInitialTrainingCheckpoint("learn", tree, "black")).toMatchObject({
      chapterIndex: 0,
      pathKey: "c0:e2e4",
      side: "black",
      stack: ["c0:"],
    });
  });

  it("starts Learn on a chosen chapter instead of always chapter 0", () => {
    const second = {
      ...tree[0]!,
      index: 1,
      title: "Chapter 2",
      root: {
        ...tree[0]!.root,
        id: "root-2",
        pathKey: "c1:",
        children: [
          {
            ...tree[0]!.root.children[0]!,
            id: "child-2",
            pathKey: "c1:e2e4",
          },
        ],
      },
    };
    const chapters = [tree[0]!, second];

    expect(resolveLearnChapter(chapters, 1).index).toBe(1);
    expect(createInitialTrainingCheckpoint("learn", chapters, "white", 1)).toMatchObject({
      chapterIndex: 1,
      pathKey: "c1:",
    });
    expect(() => resolveLearnChapter(chapters, 9)).toThrow("chapter");
  });

  it("queues only trainable positions for practice", () => {
    expect(createInitialTrainingCheckpoint("practice", tree, "both")).toMatchObject({
      queue: [
        { pathKey: "c0:" },
        { pathKey: "c0:e2e4" },
      ],
      index: 0,
      revealed: false,
    });
  });

  it("queues only due positions in scheduler order", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");

    expect(
      createInitialTrainingCheckpoint("practice", tree, "both", [
        {
          path_key: "c0:",
          attempts: 2,
          correct_count: 2,
          streak: 2,
          mastery: 64,
          last_reviewed_at: "2026-08-19T12:00:00.000Z",
          due_at: "2026-08-20T11:00:00.000Z",
          ...defaultFsrsRow,
        },
        {
          path_key: "c0:e2e4",
          attempts: 1,
          correct_count: 0,
          streak: 0,
          mastery: 12,
          last_reviewed_at: "2026-08-20T10:00:00.000Z",
          due_at: "2026-08-20T10:00:00.000Z",
          ...defaultFsrsRow,
        },
      ], now),
    ).toMatchObject({
      queue: [
        { pathKey: "c0:e2e4" },
        { pathKey: "c0:" },
      ],
    });

    expect(
      createInitialTrainingCheckpoint("practice", tree, "both", [
        {
          path_key: "c0:",
          attempts: 2,
          correct_count: 2,
          streak: 2,
          mastery: 64,
          last_reviewed_at: "2026-08-20T12:00:00.000Z",
          due_at: "2026-08-21T12:00:00.000Z",
          ...defaultFsrsRow,
        },
      ], now),
    ).toMatchObject({
      queue: [{ pathKey: "c0:e2e4" }],
    });
  });

  it("queues weak and new positions in study_ahead mode", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    expect(
      createInitialTrainingCheckpoint(
        "practice",
        tree,
        "both",
        [
          {
            path_key: "c0:",
            attempts: 3,
            correct_count: 3,
            streak: 3,
            mastery: 80,
            last_reviewed_at: "2026-08-20T11:00:00.000Z",
            due_at: "2026-08-22T12:00:00.000Z",
            ...defaultFsrsRow,
            fsrs_stability: 5,
            fsrs_state: 2,
          },
          {
            path_key: "c0:e2e4",
            attempts: 2,
            correct_count: 0,
            streak: 0,
            mastery: 18,
            last_reviewed_at: "2026-08-19T12:00:00.000Z",
            due_at: "2026-08-22T12:00:00.000Z",
            ...defaultFsrsRow,
            fsrs_stability: 1,
            fsrs_state: 2,
          },
        ],
        now,
        "study_ahead",
      ),
    ).toMatchObject({
      queue: [{ pathKey: "c0:e2e4" }],
    });
  });
});

describe("createInitialTestCheckpoint", () => {
  const tree = buildChapterTrees(
    [
      {
        id: "chapter-1",
        chapter_index: 0,
        name: "Main line",
        initial_fen:
          "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        headers: {},
      },
    ],
    [
      {
        id: "root",
        chapter_id: "chapter-1",
        parent_id: null,
        path_key: "c0:",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        san: null,
        uci: null,
        ply: 0,
        comment: null,
        nags: [],
      },
      {
        id: "child",
        chapter_id: "chapter-1",
        parent_id: "root",
        path_key: "c0:e2e4",
        fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        san: "e4",
        uci: "e2e4",
        ply: 1,
        comment: null,
        nags: [],
      },
      {
        id: "reply",
        chapter_id: "chapter-1",
        parent_id: "child",
        path_key: "c0:e2e4.e7e5",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        san: "e5",
        uci: "e7e5",
        ply: 2,
        comment: null,
        nags: [],
      },
    ],
  );
  const now = new Date("2026-08-20T12:00:00.000Z");

  it("builds a full test queue in chapter order with side filtering", () => {
    expect(
      createInitialTestCheckpoint("full_test", tree, "both"),
    ).toMatchObject({
      mode: "full_test",
      queue: [{ pathKey: "c0:" }, { pathKey: "c0:e2e4" }],
      index: 0,
      revealed: false,
      sideMode: "both",
      status: "active",
      correctCount: 0,
      incorrectCount: 0,
      weakPathKeys: [],
    });
  });

  it("resolves random side once and clamps random test size", () => {
    expect(
      createInitialTestCheckpoint("random_test", tree, "random", [], {
        n: 99,
        now,
        rng: () => 0,
      }),
    ).toMatchObject({
      mode: "random_test",
      side: "white",
      sideMode: "white",
      targetCount: 50,
      queue: [{ pathKey: "c0:" }],
      status: "active",
    });
  });

  it("returns every trainable card when the study is smaller than N", () => {
    expect(
      createInitialTestCheckpoint(
        "random_test",
        tree,
        "both",
        [
          {
            path_key: "c0:",
            attempts: 2,
            correct_count: 2,
            streak: 2,
            mastery: 64,
            last_reviewed_at: "2026-08-20T12:00:00.000Z",
            due_at: "2026-08-21T12:00:00.000Z",
            ...defaultFsrsRow,
          },
          {
            path_key: "c0:e2e4",
            attempts: 1,
            correct_count: 0,
            streak: 0,
            mastery: 12,
            last_reviewed_at: "2026-08-20T10:00:00.000Z",
            due_at: "2026-08-20T10:00:00.000Z",
            ...defaultFsrsRow,
          },
        ],
        { n: 1, now, rng: () => 0.5 },
      ),
    ).toMatchObject({
      queue: [{ pathKey: "c0:" }, { pathKey: "c0:e2e4" }],
      targetCount: 5,
    });
  });
});

describe("normalizeTrainingSideMode", () => {
  it("preserves every supported preference and defaults unknown values", () => {
    expect(normalizeTrainingSideMode("white")).toBe("white");
    expect(normalizeTrainingSideMode("black")).toBe("black");
    expect(normalizeTrainingSideMode("both")).toBe("both");
    expect(normalizeTrainingSideMode("random")).toBe("random");
    expect(normalizeTrainingSideMode(null)).toBe("both");
  });
});
