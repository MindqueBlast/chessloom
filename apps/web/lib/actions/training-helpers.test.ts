import { describe, expect, it } from "vitest";

import {
  assertSessionUsable,
  buildChapterTrees,
  createInitialTrainingCheckpoint,
  normalizeTrainingSideMode,
  parseClientCheckpointUpdate,
  progressFromRow,
  progressToRow,
  trainingResultRpcPayload,
} from "./training-helpers";

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
    const progress = progressFromRow("c0:", {
      attempts: 3,
      correct_count: 2,
      streak: 1,
      mastery: 24,
      last_reviewed_at: "2026-08-20T10:00:00.000Z",
      due_at: "2026-08-21T10:00:00.000Z",
    });

    expect(progress).toEqual({
      pathKey: "c0:",
      attempts: 3,
      correctCount: 2,
      streak: 1,
      mastery: 24,
      lastReviewedAt: "2026-08-20T10:00:00.000Z",
      nextReviewAt: "2026-08-21T10:00:00.000Z",
    });
    expect(progressToRow(progress)).toEqual({
      attempts: 3,
      correct_count: 2,
      streak: 1,
      mastery: 24,
      last_reviewed_at: "2026-08-20T10:00:00.000Z",
      due_at: "2026-08-21T10:00:00.000Z",
    });
  });
});

describe("trainingResultRpcPayload", () => {
  it("sends only server-derived result and checkpoint fields", () => {
    const checkpoint = { pathKey: "c0:e2e4", status: "active" };
    const payload = trainingResultRpcPayload(
      "user-1",
      "session-1",
      "study-1",
      "c0:e2e4",
      true,
      checkpoint,
      "2026-08-20T12:00:00.000Z",
    );

    expect(payload).toEqual({
      p_user_id: "user-1",
      p_session_id: "session-1",
      p_study_id: "study-1",
      p_path_key: "c0:e2e4",
      p_correct: true,
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
