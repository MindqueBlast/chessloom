import type { PathKey, PositionProgress } from "../types.js";
import type { LightweightConfig, MasteryScheduler } from "./types.js";
import { createInitialFsrsProgress } from "./fsrs.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MASTERY_MIN = 0;
const MASTERY_MAX = 100;

export const DEFAULT_LIGHTWEIGHT_CONFIG: Readonly<LightweightConfig> = {
  correctMasteryDelta: 8,
  incorrectMasteryDelta: 15,
  intervalsMsByBand: [DAY_MS, 3 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS, 30 * DAY_MS],
  incorrectDelayMs: HOUR_MS,
};

function clampMastery(mastery: number): number {
  return Math.min(MASTERY_MAX, Math.max(MASTERY_MIN, mastery));
}

function intervalForMastery(
  mastery: number,
  intervalsMsByBand: readonly number[],
): number {
  const bandSize = MASTERY_MAX / intervalsMsByBand.length;
  const band = Math.max(0, Math.ceil(mastery / bandSize) - 1);
  return intervalsMsByBand[Math.min(band, intervalsMsByBand.length - 1)]!;
}

export function createInitialProgress(
  pathKey: PathKey,
  now = new Date(),
): PositionProgress {
  return createInitialFsrsProgress(pathKey, now);
}

/** @deprecated Use `createFsrsScheduler` instead. */
export function createLightweightScheduler(
  config: Partial<LightweightConfig> = {},
): MasteryScheduler {
  const resolved: LightweightConfig = {
    ...DEFAULT_LIGHTWEIGHT_CONFIG,
    ...config,
  };

  return {
    onCorrect(progress, now = new Date()) {
      const mastery = clampMastery(
        progress.mastery + resolved.correctMasteryDelta,
      );

      return {
        ...progress,
        attempts: progress.attempts + 1,
        correctCount: progress.correctCount + 1,
        streak: progress.streak + 1,
        mastery,
        lastReviewedAt: now.toISOString(),
        nextReviewAt: new Date(
          now.getTime() +
            intervalForMastery(mastery, resolved.intervalsMsByBand),
        ).toISOString(),
      };
    },

    onIncorrect(progress, now = new Date()) {
      return {
        ...progress,
        attempts: progress.attempts + 1,
        streak: 0,
        mastery: clampMastery(
          progress.mastery - resolved.incorrectMasteryDelta,
        ),
        lastReviewedAt: now.toISOString(),
        nextReviewAt: new Date(
          now.getTime() + resolved.incorrectDelayMs,
        ).toISOString(),
      };
    },

    compareDue(a, b) {
      const dueOrder = a.nextReviewAt.localeCompare(b.nextReviewAt);
      return dueOrder || a.mastery - b.mastery;
    },
  };
}
