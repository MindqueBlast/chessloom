import { describe, expect, it, vi } from "vitest";
import {
  buildFullTestQueue,
  buildRandomTestQueue,
  clampRandomTestN,
  parseTestCheckpoint,
  serializeCheckpoint,
  type PositionProgress,
  type TestCard,
  type TestState,
} from "../index.js";

const fen = "8/8/8/8/8/8/8/K6k w - - 0 1";

function card(pathKey: string, cardFen = fen): TestCard {
  return { pathKey, fen: cardFen };
}

function progress(
  pathKey: string,
  mastery: number,
  nextReviewAt: string,
): PositionProgress {
  return {
    pathKey,
    attempts: 1,
    correctCount: 1,
    streak: 1,
    mastery,
    lastReviewedAt: null,
    nextReviewAt,
    fsrsStability: 1,
    fsrsDifficulty: 5,
    fsrsElapsedDays: 0,
    fsrsScheduledDays: 1,
    fsrsReps: 1,
    fsrsLapses: 0,
    fsrsLearningSteps: 0,
    fsrsState: 2,
    fsrsLastReview: null,
  };
}

describe("clampRandomTestN", () => {
  it("defaults invalid values to 20", () => {
    expect(clampRandomTestN(Number.NaN)).toBe(20);
    expect(clampRandomTestN(undefined as unknown as number)).toBe(20);
  });

  it("clamps to the 5..50 range", () => {
    expect(clampRandomTestN(1)).toBe(5);
    expect(clampRandomTestN(100)).toBe(50);
    expect(clampRandomTestN(20)).toBe(20);
  });
});

describe("buildFullTestQueue", () => {
  it("preserves caller order", () => {
    const cards = [card("a"), card("b"), card("c")];
    expect(buildFullTestQueue(cards)).toEqual(cards);
    expect(buildFullTestQueue(cards)).not.toBe(cards);
  });
});

describe("buildRandomTestQueue", () => {
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("returns all unique cards when fewer than n", () => {
    const cards = [card("a"), card("b"), card("a")];
    const queue = buildRandomTestQueue(cards, [], 20, now);

    expect(queue).toEqual([card("a"), card("b")]);
  });

  it("prefers due cards, then weakest mastery, then random fill", () => {
    const cards = [
      card("due-weak"),
      card("due-strong"),
      card("future-weak"),
      card("future-strong"),
      card("extra-1"),
      card("extra-2"),
    ];
    const progresses = [
      progress("due-weak", 0.1, "2026-01-01T00:00:00.000Z"),
      progress("due-strong", 0.9, "2026-01-10T00:00:00.000Z"),
      progress("future-weak", 0.2, "2026-02-01T00:00:00.000Z"),
      progress("future-strong", 0.8, "2026-02-01T00:00:00.000Z"),
    ];
    const rng = vi.fn(() => 0);

    const queue = buildRandomTestQueue(cards, progresses, 5, now, rng);

    expect(queue.slice(0, 4).map((item) => item.pathKey)).toEqual([
      "due-weak",
      "due-strong",
      "future-weak",
      "future-strong",
    ]);
    expect(["extra-1", "extra-2"]).toContain(queue[4]?.pathKey);
    expect(rng).toHaveBeenCalled();
  });

  it("uses deterministic rng ordering for the random fill bucket", () => {
    const cards = [card("a"), card("b"), card("c"), card("d"), card("e"), card("f")];
    const progresses = [progress("a", 0.1, "2026-02-01T00:00:00.000Z")];
    const rng = vi.fn(() => 0);

    const queue = buildRandomTestQueue(cards, progresses, 5, now, rng);

    expect(queue.map((item) => item.pathKey)).toEqual(["a", "c", "d", "e", "f"]);
    expect(rng).toHaveBeenCalled();
  });
});

describe("test checkpoints", () => {
  const state: TestState = {
    mode: "random_test",
    queue: [card("c0:e2e4")],
    index: 0,
    revealed: false,
    side: "white",
    sideMode: "both",
    status: "active",
    targetCount: 20,
    correctCount: 0,
    incorrectCount: 0,
    weakPathKeys: [],
  };

  it("round-trips a test state", () => {
    expect(parseTestCheckpoint(serializeCheckpoint(state))).toEqual(state);
  });

  it("rejects malformed test checkpoints", () => {
    expect(() => parseTestCheckpoint("{")).toThrow("Invalid test checkpoint");
    expect(() =>
      parseTestCheckpoint(
        '{"mode":"random_test","queue":[],"index":0,"revealed":false,"side":"white","sideMode":"both","status":"active","correctCount":0,"incorrectCount":0,"weakPathKeys":[]}',
      ),
    ).not.toThrow();
    expect(() =>
      parseTestCheckpoint(
        '{"mode":"practice","queue":[],"index":0,"revealed":false,"side":"white","sideMode":"both","status":"active","correctCount":0,"incorrectCount":0,"weakPathKeys":[]}',
      ),
    ).toThrow("Invalid test checkpoint");
  });
});
