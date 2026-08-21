import { describe, expect, it } from "vitest";
import {
  createInitialProgress,
  createLightweightScheduler,
} from "./lightweight.js";

const NOW = new Date("2026-08-20T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("createInitialProgress", () => {
  it("creates due, unreviewed progress for a path", () => {
    expect(createInitialProgress("c0:e2e4", NOW)).toMatchObject({
      pathKey: "c0:e2e4",
      attempts: 0,
      correctCount: 0,
      streak: 0,
      mastery: 0,
      lastReviewedAt: null,
      nextReviewAt: NOW.toISOString(),
      fsrsStability: 0,
      fsrsDifficulty: 0,
      fsrsElapsedDays: 0,
      fsrsScheduledDays: 0,
      fsrsReps: 0,
      fsrsLapses: 0,
      fsrsState: 0,
      fsrsLastReview: null,
    });
  });
});

describe("createLightweightScheduler", () => {
  it("increases mastery and schedules correct answers by mastery band", () => {
    const scheduler = createLightweightScheduler();
    const progress = {
      ...createInitialProgress("c0:e2e4", NOW),
      mastery: 20,
    };

    const updated = scheduler.onCorrect(progress, NOW);

    expect(updated).toMatchObject({
      attempts: 1,
      correctCount: 1,
      streak: 1,
      mastery: 28,
      lastReviewedAt: NOW.toISOString(),
      nextReviewAt: new Date(NOW.getTime() + 3 * DAY_MS).toISOString(),
    });
    expect(progress.mastery).toBe(20);
  });

  it("resets streak, lowers mastery, and schedules incorrect answers soon", () => {
    const scheduler = createLightweightScheduler();
    const progress = {
      ...createInitialProgress("c0:e2e4", NOW),
      attempts: 4,
      correctCount: 3,
      streak: 3,
      mastery: 40,
    };

    expect(scheduler.onIncorrect(progress, NOW)).toMatchObject({
      attempts: 5,
      correctCount: 3,
      streak: 0,
      mastery: 25,
      lastReviewedAt: NOW.toISOString(),
      nextReviewAt: new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(),
    });
  });

  it("clamps mastery to its 0-100 range", () => {
    const scheduler = createLightweightScheduler();
    const progress = createInitialProgress("c0:e2e4", NOW);

    expect(scheduler.onIncorrect(progress, NOW).mastery).toBe(0);
    expect(
      scheduler.onCorrect({ ...progress, mastery: 99 }, NOW).mastery,
    ).toBe(100);
  });

  it("accepts scheduling overrides through one config object", () => {
    const scheduler = createLightweightScheduler({
      correctMasteryDelta: 5,
      incorrectMasteryDelta: 7,
      intervalsMsByBand: [10, 20, 30, 40, 50],
      incorrectDelayMs: 6,
    });
    const progress = {
      ...createInitialProgress("c0:e2e4", NOW),
      mastery: 20,
    };

    expect(scheduler.onCorrect(progress, NOW)).toMatchObject({
      mastery: 25,
      nextReviewAt: new Date(NOW.getTime() + 20).toISOString(),
    });
    expect(scheduler.onIncorrect(progress, NOW)).toMatchObject({
      mastery: 13,
      nextReviewAt: new Date(NOW.getTime() + 6).toISOString(),
    });
  });

  it("orders earlier reviews first, then lower mastery", () => {
    const scheduler = createLightweightScheduler();
    const first = createInitialProgress("c0:e2e4", NOW);
    const later = {
      ...createInitialProgress("c0:d2d4", NOW),
      nextReviewAt: new Date(NOW.getTime() + DAY_MS).toISOString(),
      mastery: 0,
    };
    const sameTimeHigherMastery = { ...first, mastery: 50 };

    expect(scheduler.compareDue(first, later)).toBeLessThan(0);
    expect(scheduler.compareDue(first, sameTimeHigherMastery)).toBeLessThan(0);
    expect(scheduler.compareDue(first, { ...first })).toBe(0);
  });
});
