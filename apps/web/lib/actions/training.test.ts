import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

import {
  revealPracticeExpectedAction,
  submitPracticeMoveAction,
} from "./training";

type Row = Record<string, unknown>;

function query(result: () => { data: unknown; error: unknown }) {
  const builder = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
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
  let savedProgress: Row | null = null;

  const client = {
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
          update: vi.fn((values: Row) => {
            if ("checkpoint" in values) savedCheckpoint = values.checkpoint;
            return query(() => ({ data: { id: "session-1" }, error: null }));
          }),
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
      if (table === "position_progress") {
        return {
          select: vi.fn(() => query(() => ({ data: null, error: null }))),
          upsert: vi.fn(async (values: Row) => {
            savedProgress = values;
            return { error: null };
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  };

  return {
    client,
    getSavedCheckpoint: () => savedCheckpoint,
    getSavedProgress: () => savedProgress,
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
    createClient.mockResolvedValue(fixture.client);

    const result = await submitPracticeMoveAction({
      sessionId: "session-1",
      pathKey: "c0:",
      uci: "d2d4",
    });

    expect(result).toMatchObject({
      ok: false,
      expectedCount: 1,
      progress: { attempts: 1, correctCount: 0, mastery: 0 },
    });
    expect(JSON.stringify(result)).not.toContain("e4");
    expect(fixture.getSavedProgress()).toMatchObject({
      user_id: "user-1",
      study_id: "study-1",
      path_key: "c0:",
      attempts: 1,
      correct_count: 0,
    });
  });

  it("rejects a path that is not the current checkpoint card", async () => {
    const fixture = clientFixture();
    createClient.mockResolvedValue(fixture.client);

    await expect(
      submitPracticeMoveAction({
        sessionId: "session-1",
        pathKey: "c0:e2e4",
        uci: "e7e5",
      }),
    ).rejects.toThrow("current practice position");
    expect(fixture.getSavedProgress()).toBeNull();
  });

  it("reveals expected moves only through the reveal action", async () => {
    const fixture = clientFixture();
    createClient.mockResolvedValue(fixture.client);

    await expect(
      revealPracticeExpectedAction("session-1", "c0:"),
    ).resolves.toEqual({ sans: ["e4"], ucis: ["e2e4"] });
    expect(fixture.getSavedCheckpoint()).toMatchObject({ revealed: true });
  });
});
