import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card,
} from "ts-fsrs";
import type { PathKey, PositionProgress } from "../types.js";
import type { MasteryScheduler } from "./types.js";

const MASTERY_MIN = 0;
const MASTERY_MAX = 100;
const STABILITY_DAYS_BY_BAND = [1, 3, 7, 14, 30] as const;

const scheduler = fsrs();

function clampMastery(mastery: number): number {
  return Math.min(MASTERY_MAX, Math.max(MASTERY_MIN, mastery));
}

function stabilityFromMastery(mastery: number): number {
  if (mastery <= 0) {
    return 0;
  }

  const bandSize = MASTERY_MAX / STABILITY_DAYS_BY_BAND.length;
  const bandIndex = Math.min(
    STABILITY_DAYS_BY_BAND.length - 1,
    Math.floor((mastery - 1) / bandSize),
  );
  return STABILITY_DAYS_BY_BAND[bandIndex]!;
}

function progressToCard(progress: PositionProgress): Card {
  return {
    due: new Date(progress.nextReviewAt),
    stability: progress.fsrsStability,
    difficulty: progress.fsrsDifficulty,
    elapsed_days: progress.fsrsElapsedDays,
    scheduled_days: progress.fsrsScheduledDays,
    reps: progress.fsrsReps,
    lapses: progress.fsrsLapses,
    learning_steps: 0,
    state: progress.fsrsState as State,
    last_review: progress.fsrsLastReview
      ? new Date(progress.fsrsLastReview)
      : undefined,
  };
}

function cardFieldsFromCard(card: Card): Pick<
  PositionProgress,
  | "nextReviewAt"
  | "fsrsStability"
  | "fsrsDifficulty"
  | "fsrsElapsedDays"
  | "fsrsScheduledDays"
  | "fsrsReps"
  | "fsrsLapses"
  | "fsrsState"
  | "fsrsLastReview"
> {
  return {
    nextReviewAt: card.due.toISOString(),
    fsrsStability: card.stability,
    fsrsDifficulty: card.difficulty,
    fsrsElapsedDays: card.elapsed_days,
    fsrsScheduledDays: card.scheduled_days,
    fsrsReps: card.reps,
    fsrsLapses: card.lapses,
    fsrsState: card.state,
    fsrsLastReview: card.last_review?.toISOString() ?? null,
  };
}

function progressFromCard(
  progress: PositionProgress,
  card: Card,
  now: Date,
): PositionProgress {
  const updated: PositionProgress = {
    ...progress,
    ...cardFieldsFromCard(card),
  };
  updated.mastery = masteryPercentFromProgress(updated, now);
  return updated;
}

export function masteryPercentFromProgress(
  progress: PositionProgress,
  now = new Date(),
): number {
  const card = progressToCard(progress);
  const retrievability = scheduler.get_retrievability(card, now, false);
  return clampMastery(Math.round(retrievability * 100));
}

export function createInitialFsrsProgress(
  pathKey: PathKey,
  now = new Date(),
): PositionProgress {
  const card = createEmptyCard(now);
  return {
    pathKey,
    attempts: 0,
    correctCount: 0,
    streak: 0,
    mastery: MASTERY_MIN,
    lastReviewedAt: null,
    ...cardFieldsFromCard(card),
  };
}

export function migrateLightweightToFsrs(
  progress: PositionProgress,
  now = new Date(),
): PositionProgress {
  let card = createEmptyCard(now);
  card.due = new Date(progress.nextReviewAt);

  if (progress.mastery > 0) {
    card = {
      ...card,
      state: State.Review,
      stability: stabilityFromMastery(progress.mastery),
      difficulty: scheduler.init_difficulty(Rating.Good),
      reps: Math.max(1, progress.correctCount),
      lapses: Math.max(0, progress.attempts - progress.correctCount),
      last_review: progress.lastReviewedAt
        ? new Date(progress.lastReviewedAt)
        : undefined,
    };
  }

  const migrated: PositionProgress = {
    ...progress,
    ...cardFieldsFromCard(card),
  };
  migrated.mastery = masteryPercentFromProgress(migrated, now);
  return migrated;
}

export function createFsrsScheduler(): MasteryScheduler {
  return {
    onCorrect(progress, now = new Date()) {
      const card = progressToCard(progress);
      const result = scheduler.next(card, now, Rating.Good);

      return progressFromCard(
        {
          ...progress,
          attempts: progress.attempts + 1,
          correctCount: progress.correctCount + 1,
          streak: progress.streak + 1,
          lastReviewedAt: now.toISOString(),
        },
        result.card,
        now,
      );
    },

    onIncorrect(progress, now = new Date()) {
      const card = progressToCard(progress);
      const result = scheduler.next(card, now, Rating.Again);

      return progressFromCard(
        {
          ...progress,
          attempts: progress.attempts + 1,
          streak: 0,
          lastReviewedAt: now.toISOString(),
        },
        result.card,
        now,
      );
    },

    compareDue(a, b) {
      const dueOrder = a.nextReviewAt.localeCompare(b.nextReviewAt);
      return dueOrder || a.mastery - b.mastery;
    },
  };
}
