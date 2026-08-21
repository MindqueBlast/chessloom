import { describe, expect, it, vi } from "vitest";
import {
  parseLearnCheckpoint,
  parsePracticeCheckpoint,
  serializeCheckpoint,
} from "@chessloom/chess-core";

import { buildChapterTrees } from "../actions/training-helpers";

import {
  applyResolvedMoveCheckpoint,
  isCheckpointWithinTtl,
  isLearnCheckpointRestorable,
  isPracticeCheckpointRestorable,
  loadTrainingSession,
  resumableLearnCheckpoint,
  resumablePracticeCheckpoint,
} from "./session";

const now = new Date("2026-08-20T12:00:00.000Z");

const trees = buildChapterTrees(
  [
    {
      id: "chapter-1",
      chapter_index: 0,
      name: "Main line",
      initial_fen: "root-fen",
      headers: {},
    },
  ],
  [
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
      id: "child",
      chapter_id: "chapter-1",
      parent_id: "root",
      path_key: "c0:e2e4",
      fen: "child-fen",
      san: "e4",
      uci: "e2e4",
      ply: 1,
      comment: null,
      nags: [],
    },
  ],
);

describe("loadTrainingSession", () => {
  it("restores an active checkpoint from resume", async () => {
    const resumed = { sessionId: "session-1", checkpoint: { pathKey: "c0:e2e4" } };
    const startFresh = vi.fn();

    await expect(
      loadTrainingSession(
        async () => resumed,
        startFresh,
      ),
    ).resolves.toEqual({ session: resumed, restored: true });
    expect(startFresh).not.toHaveBeenCalled();
  });

  it("starts a fresh session when resume finds nothing usable", async () => {
    const fresh = { sessionId: "session-2", checkpoint: { pathKey: "c0:" } };

    await expect(
      loadTrainingSession(
        async () => null,
        async () => fresh,
      ),
    ).resolves.toEqual({ session: fresh, restored: false });
  });
});

describe("checkpoint TTL", () => {
  it("restores checkpoints at the 14-day boundary and expires older ones", () => {
    expect(isCheckpointWithinTtl("2026-08-06T12:00:00.000Z", now)).toBe(true);
    expect(isCheckpointWithinTtl("2026-08-06T11:59:59.999Z", now)).toBe(false);
    expect(isCheckpointWithinTtl("not-a-date", now)).toBe(false);
  });
});

describe("restorable checkpoints", () => {
  const learn = {
    chapterIndex: 0,
    pathKey: "c0:e2e4",
    side: "white" as const,
    sideMode: "white" as const,
    stack: ["c0:"],
    status: "active" as const,
  };
  const practice = {
    queue: [{ pathKey: "c0:", fen: "root-fen" }],
    index: 0,
    revealed: true,
    side: "white" as const,
    sideMode: "white" as const,
    status: "active" as const,
  };

  it("restores learn and practice checkpoints whose positions still exist", () => {
    expect(isLearnCheckpointRestorable(learn, trees)).toBe(true);
    expect(isPracticeCheckpointRestorable(practice, trees)).toBe(true);
    expect(resumableLearnCheckpoint(learn, trees)).toEqual(learn);
    expect(resumablePracticeCheckpoint(practice, trees)).toEqual(practice);
  });

  it("rejects missing paths, fen mismatches, and corrupt checkpoints", () => {
    expect(
      isLearnCheckpointRestorable({ ...learn, pathKey: "c0:missing" }, trees),
    ).toBe(false);
    expect(
      isPracticeCheckpointRestorable(
        { ...practice, queue: [{ pathKey: "c0:", fen: "stale-fen" }] },
        trees,
      ),
    ).toBe(false);
    expect(resumableLearnCheckpoint({ forged: true }, trees)).toBeNull();
    expect(resumablePracticeCheckpoint({ queue: "nope" }, trees)).toBeNull();
  });
});

describe("applyResolvedMoveCheckpoint", () => {
  it("applies the persisted checkpoint returned after a resolved move", () => {
    const checkpoint = {
      chapterIndex: 0,
      pathKey: "c0:e2e4",
      side: "white" as const,
      sideMode: "white" as const,
      stack: ["c0:"],
      status: "active" as const,
    };

    expect(
      applyResolvedMoveCheckpoint(checkpoint, parseLearnCheckpoint),
    ).toEqual(checkpoint);
    expect(
      applyResolvedMoveCheckpoint(
        {
          queue: [{ pathKey: "c0:", fen: "root-fen" }],
          index: 0,
          revealed: false,
          side: "white",
          sideMode: "white",
          status: "active",
        },
        parsePracticeCheckpoint,
      ),
    ).toMatchObject({ index: 0, revealed: false, sideMode: "white" });
    expect(serializeCheckpoint(checkpoint)).toContain("c0:e2e4");
  });
});
