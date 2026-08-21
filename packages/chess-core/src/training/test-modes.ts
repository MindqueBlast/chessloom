import {
  findNodeByPathKey,
  isRepertoireMove,
  type MatchResult,
} from "../tree/match.js";
import type { ChapterTree, Fen, PathKey, PositionProgress } from "../types.js";
import type { TrainingSide } from "./side.js";

export interface TestCard {
  pathKey: PathKey;
  fen: Fen;
}

export type TestMode = "random_test" | "full_test";

export interface TestState {
  mode: TestMode;
  queue: TestCard[];
  index: number;
  revealed: boolean;
  pendingAdvance: boolean;
  side: TrainingSide;
  sideMode: "white" | "black" | "both";
  status: "active" | "complete";
  targetCount?: number;
  correctCount: number;
  incorrectCount: number;
  weakPathKeys: PathKey[];
}

const RANDOM_TEST_MIN = 5;
const RANDOM_TEST_MAX = 50;
const RANDOM_TEST_DEFAULT = 20;

export function clampRandomTestN(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) {
    return RANDOM_TEST_DEFAULT;
  }
  return Math.min(RANDOM_TEST_MAX, Math.max(RANDOM_TEST_MIN, n));
}

export function buildFullTestQueue(cards: TestCard[]): TestCard[] {
  return [...cards];
}

function uniqueCards(cards: TestCard[]): TestCard[] {
  const seen = new Set<PathKey>();
  const unique: TestCard[] = [];
  for (const card of cards) {
    if (seen.has(card.pathKey)) {
      continue;
    }
    seen.add(card.pathKey);
    unique.push(card);
  }
  return unique;
}

function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}

function isDue(progress: PositionProgress, now: Date): boolean {
  return new Date(progress.nextReviewAt).getTime() <= now.getTime();
}

export function buildRandomTestQueue(
  cards: TestCard[],
  progress: PositionProgress[],
  n: number,
  now: Date = new Date(),
  rng: () => number = Math.random,
): TestCard[] {
  const targetCount = clampRandomTestN(n);
  const unique = uniqueCards(cards);
  if (unique.length <= targetCount) {
    return unique;
  }

  const progressByPathKey = new Map(progress.map((entry) => [entry.pathKey, entry]));
  const withProgress: TestCard[] = [];
  const withoutProgress: TestCard[] = [];

  for (const card of unique) {
    if (progressByPathKey.has(card.pathKey)) {
      withProgress.push(card);
    } else {
      withoutProgress.push(card);
    }
  }

  const due: TestCard[] = [];
  const notDue: TestCard[] = [];

  for (const card of withProgress) {
    const entry = progressByPathKey.get(card.pathKey);
    if (!entry) {
      continue;
    }
    if (isDue(entry, now)) {
      due.push(card);
    } else {
      notDue.push(card);
    }
  }

  const mastery = (card: TestCard) =>
    progressByPathKey.get(card.pathKey)?.mastery ?? 0;

  due.sort((left, right) => mastery(left) - mastery(right));
  notDue.sort((left, right) => mastery(left) - mastery(right));

  const queue = [...due, ...notDue];
  const selected = new Set(queue.map((card) => card.pathKey));
  const remaining = withoutProgress.filter((card) => !selected.has(card.pathKey));

  if (queue.length < targetCount && remaining.length > 0) {
    shuffleInPlace(remaining, rng);
    queue.push(...remaining.slice(0, targetCount - queue.length));
  }

  return queue.slice(0, targetCount);
}

export interface TestSummary {
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  weakPathKeys: PathKey[];
}

function appendWeakPathKey(state: TestState, pathKey: PathKey): PathKey[] {
  return state.weakPathKeys.includes(pathKey)
    ? state.weakPathKeys
    : [...state.weakPathKeys, pathKey];
}

function advanceTestState(state: TestState): TestState {
  const index = state.index + 1;
  return {
    ...state,
    index,
    revealed: false,
    pendingAdvance: false,
    status: index >= state.queue.length ? "complete" : "active",
  };
}

export function buildTestSummary(state: TestState): TestSummary {
  const total = state.correctCount + state.incorrectCount;
  return {
    accuracy: total === 0 ? 1 : state.correctCount / total,
    correctCount: state.correctCount,
    incorrectCount: state.incorrectCount,
    weakPathKeys: state.weakPathKeys,
  };
}

export function testApplyMove(
  state: TestState,
  chapter: ChapterTree,
  move: { san?: string; uci?: string },
): { state: TestState; feedback: MatchResult } {
  const card = state.queue[state.index];
  if (!card) {
    throw new Error("Cannot apply a move to a completed test session");
  }

  const node = findNodeByPathKey(chapter, card.pathKey);
  if (!node) {
    throw new Error(`Test card path not found: ${card.pathKey}`);
  }

  const feedback = isRepertoireMove(node, move);
  if (!feedback.ok) {
    return {
      state: {
        ...state,
        revealed: false,
        pendingAdvance: false,
        incorrectCount: state.incorrectCount + 1,
        weakPathKeys: appendWeakPathKey(state, card.pathKey),
      },
      feedback,
    };
  }

  return {
    state: {
      ...advanceTestState(state),
      correctCount: state.correctCount + 1,
    },
    feedback,
  };
}

export function testReveal(state: TestState): TestState {
  return state.revealed && state.pendingAdvance
    ? state
    : { ...state, revealed: true, pendingAdvance: true };
}

export function testAdvance(state: TestState): TestState {
  if (!state.queue[state.index]) {
    throw new Error("Cannot advance a completed test session");
  }
  if (!state.pendingAdvance) {
    throw new Error("Cannot advance until the current card is resolved");
  }
  return advanceTestState(state);
}
