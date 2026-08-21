import { Rating, State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import type { PositionProgress } from "../types.js";
import {
  createFsrsScheduler,
  createInitialFsrsProgress,
  masteryPercentFromProgress,
  migrateLightweightToFsrs,
} from "./fsrs.js";

const NOW = new Date("2026-08-20T12:00:00.000Z");
const LATER = new Date("2026-08-21T12:00:00.000Z");

function lightweightProgress(
  overrides: Partial<PositionProgress> = {},
): PositionProgress {
  return {
    pathKey: "c0:e2e4",
    attempts: 5,
    correctCount: 4,
    streak: 2,
    mastery: 40,
    lastReviewedAt: NOW.toISOString(),
    nextReviewAt: LATER.toISOString(),
    fsrsStability: 0,
    fsrsDifficulty: 0,
    fsrsElapsedDays: 0,
    fsrsScheduledDays: 0,
    fsrsReps: 0,
    fsrsLapses: 0,
    fsrsLearningSteps: 0,
    fsrsState: State.New,
    fsrsLastReview: null,
    ...overrides,
  };
}

describe("createInitialFsrsProgress", () => {
  it("creates a new FSRS card due immediately with zero mastery", () => {
    const progress = createInitialFsrsProgress("c0:e2e4", NOW);

    expect(progress).toMatchObject({
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
      fsrsLearningSteps: 0,
      fsrsState: State.New,
      fsrsLastReview: null,
    });
  });
});

describe("createFsrsScheduler", () => {
  it("graduates a new card to review after two consecutive correct answers", () => {
    const scheduler = createFsrsScheduler();
    const progress = createInitialFsrsProgress("c0:e2e4", NOW);
    const LEARNING_STEP_MS = 10 * 60 * 1000;

    const afterFirst = scheduler.onCorrect(progress, NOW);
    const afterSecond = scheduler.onCorrect(afterFirst, NOW);

    expect(afterSecond.fsrsState).toBe(State.Review);
    expect(
      new Date(afterSecond.nextReviewAt).getTime() - NOW.getTime(),
    ).toBeGreaterThan(LEARNING_STEP_MS);
    expect(afterSecond.fsrsScheduledDays).toBeGreaterThan(0);
  });

  it("schedules correct answers later and raises mastery", () => {
    const scheduler = createFsrsScheduler();
    const progress = createInitialFsrsProgress("c0:e2e4", NOW);

    const updated = scheduler.onCorrect(progress, NOW);

    expect(updated.attempts).toBe(1);
    expect(updated.correctCount).toBe(1);
    expect(updated.streak).toBe(1);
    expect(updated.lastReviewedAt).toBe(NOW.toISOString());
    expect(new Date(updated.nextReviewAt).getTime()).toBeGreaterThan(NOW.getTime());
    expect(updated.mastery).toBeGreaterThan(0);
    expect(updated.fsrsReps).toBe(1);
    expect(progress.mastery).toBe(0);
  });

  it("schedules incorrect answers for near-term relearning and resets streak", () => {
    const scheduler = createFsrsScheduler();
    const progress = scheduler.onCorrect(
      createInitialFsrsProgress("c0:e2e4", NOW),
      NOW,
    );

    const updated = scheduler.onIncorrect(progress, NOW);

    expect(updated.attempts).toBe(progress.attempts + 1);
    expect(updated.streak).toBe(0);
    expect(
      new Date(updated.nextReviewAt).getTime() - NOW.getTime(),
    ).toBeLessThan(24 * 60 * 60 * 1000);
    expect(updated.fsrsLapses).toBeGreaterThanOrEqual(progress.fsrsLapses);
  });

  it("orders earlier reviews first, then lower mastery", () => {
    const scheduler = createFsrsScheduler();
    const first = createInitialFsrsProgress("c0:e2e4", NOW);
    const later = {
      ...createInitialFsrsProgress("c0:d2d4", NOW),
      nextReviewAt: new Date(NOW.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      mastery: 0,
    };
    const sameTimeHigherMastery = { ...first, mastery: 50 };

    expect(scheduler.compareDue(first, later)).toBeLessThan(0);
    expect(scheduler.compareDue(first, sameTimeHigherMastery)).toBeLessThan(0);
    expect(scheduler.compareDue(first, { ...first })).toBe(0);
  });
});

describe("masteryPercentFromProgress", () => {
  it("returns 0 for an unreviewed card", () => {
    const progress = createInitialFsrsProgress("c0:e2e4", NOW);
    expect(masteryPercentFromProgress(progress, NOW)).toBe(0);
  });

  it("clamps derived mastery to 0-100", () => {
    const scheduler = createFsrsScheduler();
    const reviewed = scheduler.onCorrect(
      createInitialFsrsProgress("c0:e2e4", NOW),
      NOW,
    );

    const mastery = masteryPercentFromProgress(reviewed, NOW);
    expect(mastery).toBeGreaterThanOrEqual(0);
    expect(mastery).toBeLessThanOrEqual(100);
    expect(Number.isInteger(mastery)).toBe(true);
  });
});

describe("migrateLightweightToFsrs", () => {
  it("preserves stats and maps zero mastery to a new card", () => {
    const legacy = lightweightProgress({
      mastery: 0,
      attempts: 0,
      correctCount: 0,
      streak: 0,
      lastReviewedAt: null,
    });

    const migrated = migrateLightweightToFsrs(legacy, NOW);

    expect(migrated).toMatchObject({
      pathKey: legacy.pathKey,
      attempts: 0,
      correctCount: 0,
      streak: 0,
      mastery: 0,
      fsrsState: State.New,
      fsrsReps: 0,
      nextReviewAt: legacy.nextReviewAt,
    });
  });

  it("seeds review state and stability from mastery bands", () => {
    const legacy = lightweightProgress({ mastery: 45 });

    const migrated = migrateLightweightToFsrs(legacy, NOW);

    expect(migrated.fsrsState).toBe(State.Review);
    expect(migrated.fsrsStability).toBe(7);
    expect(migrated.fsrsReps).toBeGreaterThanOrEqual(1);
    expect(migrated.nextReviewAt).toBe(legacy.nextReviewAt);
    expect(migrated.mastery).toBeGreaterThan(0);
  });

  it("is deterministic for the same lightweight input", () => {
    const legacy = lightweightProgress({ mastery: 82 });

    expect(migrateLightweightToFsrs(legacy, NOW)).toEqual(
      migrateLightweightToFsrs(legacy, NOW),
    );
    expect(migrateLightweightToFsrs(legacy, NOW).fsrsStability).toBe(30);
  });
});
