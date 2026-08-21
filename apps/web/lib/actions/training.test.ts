import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createServiceClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient }));

import {
  advanceTestAction,
  resumeSessionAction,
  revealPracticeExpectedAction,
  revealTestExpectedAction,
  saveCheckpointAction,
  startTrainingSessionAction,
  submitPracticeMoveAction,
  submitTestMoveAction,
} from "./training";

type Row = Record<string, unknown>;

function query(result: () => { data: unknown; error: unknown }) {
  const builder = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    select: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result()),
    then(
      resolve: (value: { data: unknown; error: unknown }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result()).then(resolve, reject);
    },
  };
  return builder;
}

function clientFixture() {
  const checkpoint = {
    queue: [{ pathKey: "c0:", fen: "root-fen" }],
    index: 0,
    revealed: false,
    side: "white",
    status: "active",
  };
  const session: Row = {
    id: "session-1",
    user_id: "user-1",
    study_id: "study-1",
    mode: "practice",
    checkpoint,
    status: "active",
    updated_at: "2026-08-20T12:00:00.000Z",
  };
  let savedCheckpoint: unknown = checkpoint;
  let rpcPayload: Row | null = null;
  let abandoned = false;

  const userClient = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "training_sessions") {
        return {
          select: vi.fn(() => query(() => ({ data: session, error: null }))),
        };
      }
      if (table === "chapters") {
        return {
          select: vi.fn(() =>
            query(() => ({
              data: [
                {
                  id: "chapter-1",
                  chapter_index: 0,
                  name: "Line",
                  initial_fen: "root-fen",
                  headers: {},
                },
              ],
              error: null,
            })),
          ),
        };
      }
      if (table === "nodes") {
        return {
          select: vi.fn(() =>
            query(() => ({
              data: [
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
                {
                  id: "e4",
                  chapter_id: "chapter-1",
                  parent_id: "root",
                  path_key: "c0:e2e4",
                  fen: "after-e4",
                  san: "e4",
                  uci: "e2e4",
                  ply: 1,
                  comment: null,
                  nags: [],
                },
              ],
              error: null,
            })),
          ),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  const serviceClient = {
    rpc: vi.fn(async (name: string, values: Row) => {
      if (name !== "apply_training_result_and_checkpoint") {
        throw new Error(`Unexpected RPC ${name}`);
      }
      rpcPayload = values;
      savedCheckpoint = values.p_checkpoint;
      const progress = values.p_progress as Row;
      return {
        data: progress,
        error: null,
      };
    }),
    from: vi.fn((table: string) => {
      if (table === "position_progress") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                })),
              })),
            })),
          })),
        };
      }
      if (table !== "training_sessions") {
        throw new Error(`Unexpected service table ${table}`);
      }
      return {
        update: vi.fn((values: Row) => {
          if (values.status === "abandoned") abandoned = true;
          if ("checkpoint" in values) savedCheckpoint = values.checkpoint;
          return query(() => ({ data: { id: "session-1" }, error: null }));
        }),
      };
    }),
  };

  return {
    userClient,
    serviceClient,
    getSavedCheckpoint: () => savedCheckpoint,
    getRpcPayload: () => rpcPayload,
    wasAbandoned: () => abandoned,
    session,
  };
}

describe("authoritative practice actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:30:00.000Z"));
  });

  it("scores an incorrect move without returning expected SAN or UCI", async () => {
    const fixture = clientFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    const result = await submitPracticeMoveAction({
      sessionId: "session-1",
      pathKey: "c0:",
      uci: "d2d4",
    });

    expect(result).toMatchObject({
      ok: false,
      expectedCount: 1,
      progress: {
        attempts: 1,
        correctCount: 0,
        streak: 0,
      },
    });
    expect(JSON.stringify(result)).not.toContain("e4");
    const payload = fixture.getRpcPayload();
    expect(payload).toEqual({
      p_user_id: "user-1",
      p_session_id: "session-1",
      p_study_id: "study-1",
      p_path_key: "c0:",
      p_correct: false,
      p_progress: expect.objectContaining({
        attempts: 1,
        correct_count: 0,
        streak: 0,
        due_at: expect.any(String),
        fsrs_stability: expect.any(Number),
        fsrs_difficulty: expect.any(Number),
        fsrs_elapsed_days: expect.any(Number),
        fsrs_scheduled_days: expect.any(Number),
        fsrs_reps: expect.any(Number),
        fsrs_lapses: expect.any(Number),
        fsrs_state: expect.any(Number),
        fsrs_learning_steps: expect.any(Number),
        last_reviewed_at: "2026-08-20T12:30:00.000Z",
        fsrs_last_review: "2026-08-20T12:30:00.000Z",
      }),
      p_checkpoint: expect.objectContaining({
        index: 0,
        status: "active",
      }),
      p_expected_updated_at: "2026-08-20T12:00:00.000Z",
    });
    expect(payload).not.toHaveProperty("p_mastery");
  });

  it("rejects a path that is not the current checkpoint card", async () => {
    const fixture = clientFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    await expect(
      submitPracticeMoveAction({
        sessionId: "session-1",
        pathKey: "c0:e2e4",
        uci: "e7e5",
      }),
    ).rejects.toThrow("current practice position");
    expect(fixture.getRpcPayload()).toBeNull();
  });

  it("reveals expected moves only through the reveal action", async () => {
    const fixture = clientFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    await expect(
      revealPracticeExpectedAction("session-1", "c0:"),
    ).resolves.toEqual({ sans: ["e4"], ucis: ["e2e4"] });
    expect(fixture.getSavedCheckpoint()).toMatchObject({ revealed: true });
  });

  it("rejects client-authored checkpoint completion", async () => {
    const fixture = clientFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    await expect(
      saveCheckpointAction("session-1", {
        queue: [{ pathKey: "c0:", fen: "root-fen" }],
        index: 1,
        revealed: false,
        side: "white",
        status: "complete",
      }),
    ).rejects.toThrow("complete");
  });

  it("resumes an active practice checkpoint newer than 14 days", async () => {
    const fixture = clientFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    await expect(
      resumeSessionAction("study-1", "practice"),
    ).resolves.toEqual({
      sessionId: "session-1",
      checkpoint: {
        queue: [{ pathKey: "c0:", fen: "root-fen" }],
        index: 0,
        revealed: false,
        side: "white",
        status: "active",
      },
    });
    expect(fixture.wasAbandoned()).toBe(false);
  });

  it("abandons expired checkpoints so a later start can be fresh", async () => {
    const fixture = clientFixture();
    fixture.session.updated_at = "2026-08-01T12:00:00.000Z";
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    await expect(resumeSessionAction("study-1", "practice")).resolves.toBeNull();
    expect(fixture.wasAbandoned()).toBe(true);
  });

  it("abandons unrestorable checkpoints whose positions no longer match", async () => {
    const fixture = clientFixture();
    fixture.session.checkpoint = {
      queue: [{ pathKey: "c0:", fen: "stale-fen" }],
      index: 0,
      revealed: false,
      side: "white",
      status: "active",
    };
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    await expect(resumeSessionAction("study-1", "practice")).resolves.toBeNull();
    expect(fixture.wasAbandoned()).toBe(true);
  });
});

function testClientFixture() {
  const checkpoint = {
    mode: "random_test",
    queue: [{ pathKey: "c0:", fen: "root-fen" }],
    index: 0,
    revealed: false,
    pendingAdvance: false,
    side: "white",
    sideMode: "both",
    status: "active",
    targetCount: 20,
    correctCount: 0,
    incorrectCount: 0,
    weakPathKeys: [],
  };
  const session: Row = {
    id: "session-test",
    user_id: "user-1",
    study_id: "study-1",
    mode: "random_test",
    checkpoint,
    status: "active",
    updated_at: "2026-08-20T12:00:00.000Z",
  };
  let savedCheckpoint: unknown = checkpoint;
  let rpcPayload: Row | null = null;

  const userClient = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "training_sessions") {
        return {
          select: vi.fn(() => query(() => ({ data: session, error: null }))),
        };
      }
      if (table === "chapters") {
        return {
          select: vi.fn(() =>
            query(() => ({
              data: [
                {
                  id: "chapter-1",
                  chapter_index: 0,
                  name: "Line",
                  initial_fen: "root-fen",
                  headers: {},
                },
              ],
              error: null,
            })),
          ),
        };
      }
      if (table === "nodes") {
        return {
          select: vi.fn(() =>
            query(() => ({
              data: [
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
                {
                  id: "e4",
                  chapter_id: "chapter-1",
                  parent_id: "root",
                  path_key: "c0:e2e4",
                  fen: "after-e4",
                  san: "e4",
                  uci: "e2e4",
                  ply: 1,
                  comment: null,
                  nags: [],
                },
              ],
              error: null,
            })),
          ),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  const serviceClient = {
    rpc: vi.fn(async (name: string, values: Row) => {
      if (name !== "apply_training_result_and_checkpoint") {
        throw new Error(`Unexpected RPC ${name}`);
      }
      rpcPayload = values;
      savedCheckpoint = values.p_checkpoint;
      session.checkpoint = values.p_checkpoint;
      const progress = values.p_progress as Row;
      return {
        data: progress,
        error: null,
      };
    }),
    from: vi.fn((table: string) => {
      if (table === "position_progress") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                })),
              })),
            })),
          })),
        };
      }
      if (table !== "training_sessions") {
        throw new Error(`Unexpected service table ${table}`);
      }
      return {
        update: vi.fn((values: Row) => {
          if ("checkpoint" in values) {
            savedCheckpoint = values.checkpoint;
            session.checkpoint = values.checkpoint;
          }
          return query(() => ({ data: { id: "session-test" }, error: null }));
        }),
      };
    }),
  };

  return {
    userClient,
    serviceClient,
    getSavedCheckpoint: () => savedCheckpoint,
    getRpcPayload: () => rpcPayload,
    session,
  };
}

describe("authoritative test actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:30:00.000Z"));
  });

  it("scores an incorrect test move with FSRS and tracks weak positions", async () => {
    const fixture = testClientFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    const result = await submitTestMoveAction({
      sessionId: "session-test",
      pathKey: "c0:",
      uci: "d2d4",
    });

    expect(result).toMatchObject({
      ok: false,
      expectedCount: 1,
      progress: {
        attempts: 1,
        correctCount: 0,
        streak: 0,
      },
    });
    expect(result.summary).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("e4");
    expect(fixture.getRpcPayload()).toMatchObject({
      p_correct: false,
      p_checkpoint: expect.objectContaining({
        index: 0,
        incorrectCount: 1,
        weakPathKeys: ["c0:"],
        status: "active",
      }),
    });
  });

  it("completes a test session with summary after the final correct move", async () => {
    const fixture = testClientFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    const result = await submitTestMoveAction({
      sessionId: "session-test",
      pathKey: "c0:",
      uci: "e2e4",
    });

    expect(result).toMatchObject({
      ok: true,
      expectedCount: 0,
      summary: {
        accuracy: 1,
        correctCount: 1,
        incorrectCount: 0,
        weakPathKeys: [],
      },
    });
    expect(fixture.getRpcPayload()?.p_checkpoint).toMatchObject({
      index: 1,
      correctCount: 1,
      status: "complete",
    });
  });

  it("reveals expected moves and advances after an incorrect answer", async () => {
    const fixture = testClientFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    await submitTestMoveAction({
      sessionId: "session-test",
      pathKey: "c0:",
      uci: "d2d4",
    });

    await expect(
      revealTestExpectedAction("session-test", "c0:"),
    ).resolves.toEqual({ sans: ["e4"], ucis: ["e2e4"] });
    expect(fixture.getSavedCheckpoint()).toMatchObject({
      revealed: true,
      pendingAdvance: true,
    });

    const advanced = await advanceTestAction("session-test", "c0:");
    expect(advanced.summary).toEqual({
      accuracy: 0,
      correctCount: 0,
      incorrectCount: 1,
      weakPathKeys: ["c0:"],
    });
    expect(fixture.getSavedCheckpoint()).toMatchObject({
      index: 1,
      status: "complete",
    });
  });

  it("rejects advancing before the current card is resolved", async () => {
    const fixture = testClientFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    await submitTestMoveAction({
      sessionId: "session-test",
      pathKey: "c0:",
      uci: "d2d4",
    });

    await expect(advanceTestAction("session-test", "c0:")).rejects.toThrow(
      "Cannot advance until the current card is resolved",
    );
    expect(fixture.getSavedCheckpoint()).toMatchObject({
      index: 0,
      pendingAdvance: false,
    });
  });

  it("rejects a path that is not the current test card", async () => {
    const fixture = testClientFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    await expect(
      submitTestMoveAction({
        sessionId: "session-test",
        pathKey: "c0:e2e4",
        uci: "e7e5",
      }),
    ).rejects.toThrow("current test position");
    expect(fixture.getRpcPayload()).toBeNull();
  });
});

function startSessionFixture() {
  let insertedMode: string | null = null;
  let insertedCheckpoint: unknown = null;

  const userClient = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "studies") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { id: "study-1" }, error: null })),
            })),
          })),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { default_side_mode: "both" },
                error: null,
              })),
            })),
          })),
        };
      }
      if (table === "chapters") {
        return {
          select: vi.fn(() =>
            query(() => ({
              data: [
                {
                  id: "chapter-1",
                  chapter_index: 0,
                  name: "Line",
                  initial_fen:
                    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                  headers: {},
                },
              ],
              error: null,
            })),
          ),
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: [
                {
                  id: "chapter-1",
                  chapter_index: 0,
                  name: "Line",
                  initial_fen:
                    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                  headers: {},
                },
              ],
              error: null,
            })),
          })),
        };
      }
      if (table === "nodes") {
        return {
          select: vi.fn(() =>
            query(() => ({
              data: [
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
              error: null,
            })),
          ),
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: [
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
              error: null,
            })),
          })),
        };
      }
      if (table === "position_progress") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: [
                {
                  path_key: "c0:e2e4",
                  attempts: 1,
                  correct_count: 0,
                  streak: 0,
                  mastery: 12,
                  last_reviewed_at: "2026-08-20T10:00:00.000Z",
                  due_at: "2026-08-20T10:00:00.000Z",
                  fsrs_stability: 0,
                  fsrs_difficulty: 0,
                  fsrs_elapsed_days: 0,
                  fsrs_scheduled_days: 0,
                  fsrs_reps: 0,
                  fsrs_lapses: 0,
                  fsrs_state: 0,
                  fsrs_learning_steps: 0,
                  fsrs_last_review: null,
                },
              ],
              error: null,
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  };

  const serviceClient = {
    from: vi.fn((table: string) => {
      if (table !== "training_sessions") {
        throw new Error(`Unexpected service table ${table}`);
      }
      return {
        insert: vi.fn((values: Row) => {
          insertedMode = values.mode as string;
          insertedCheckpoint = values.checkpoint;
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: "session-test" }, error: null })),
            })),
          };
        }),
      };
    }),
  };

  return {
    userClient,
    serviceClient,
    getInsertedMode: () => insertedMode,
    getInsertedCheckpoint: () => insertedCheckpoint,
  };
}

describe("startTrainingSessionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:30:00.000Z"));
  });

  it("starts a random test session with progress-aware queue and mode", async () => {
    const fixture = startSessionFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    const result = await startTrainingSessionAction("study-1", "random_test", {
      n: 10,
      sideMode: "both",
    });

    expect(result.sessionId).toBe("session-test");
    expect(fixture.getInsertedMode()).toBe("random_test");
    expect(fixture.getInsertedCheckpoint()).toMatchObject({
      mode: "random_test",
      targetCount: 10,
      queue: [{ pathKey: "c0:" }, { pathKey: "c0:e2e4" }],
      correctCount: 0,
      incorrectCount: 0,
      weakPathKeys: [],
      status: "active",
    });
  });

  it("starts a full test session with every trainable position", async () => {
    const fixture = startSessionFixture();
    createClient.mockResolvedValue(fixture.userClient);
    createServiceClient.mockReturnValue(fixture.serviceClient);

    const result = await startTrainingSessionAction("study-1", "full_test", {
      sideMode: "both",
    });

    expect(result.sessionId).toBe("session-test");
    expect(fixture.getInsertedMode()).toBe("full_test");
    expect(fixture.getInsertedCheckpoint()).toMatchObject({
      mode: "full_test",
      queue: [{ pathKey: "c0:" }, { pathKey: "c0:e2e4" }],
      status: "active",
    });
    expect(fixture.getInsertedCheckpoint()).not.toHaveProperty("targetCount");
  });
});
