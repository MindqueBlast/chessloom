import {
  findNodeByPathKey,
  isRepertoireMove,
  type MatchResult,
} from "../tree/match.js";
import type { ChapterTree, Fen, PathKey, SideMode } from "../types.js";
import {
  resolveTrainingSide,
  sideToMove,
  type TrainingSide,
} from "./side.js";

export interface PracticeCard {
  pathKey: PathKey;
  fen: Fen;
}

export interface PracticeState {
  queue: PracticeCard[];
  index: number;
  revealed: boolean;
  side: TrainingSide;
  sideMode: SideMode;
  status: "active" | "complete";
}

export function startPractice(
  cards: PracticeCard[],
  sideMode: SideMode,
  rng?: () => number,
): PracticeState {
  const side = resolveTrainingSide(sideMode, rng);
  const queue =
    sideMode === "both"
      ? [...cards]
      : cards.filter((card) => sideToMove(card.fen) === side);

  return {
    queue,
    index: 0,
    revealed: false,
    side,
    sideMode,
    status: queue.length === 0 ? "complete" : "active",
  };
}

export function practiceApplyMove(
  state: PracticeState,
  chapter: ChapterTree,
  move: { san?: string; uci?: string },
): { state: PracticeState; feedback: MatchResult } {
  const card = state.queue[state.index];
  if (!card) {
    throw new Error("Cannot apply a move to a completed practice session");
  }

  const node = findNodeByPathKey(chapter, card.pathKey);
  if (!node) {
    throw new Error(`Practice card path not found: ${card.pathKey}`);
  }

  const feedback = isRepertoireMove(node, move);
  if (!feedback.ok) {
    return { state, feedback };
  }

  const index = state.index + 1;
  return {
    state: {
      ...state,
      index,
      revealed: false,
      status: index >= state.queue.length ? "complete" : "active",
    },
    feedback,
  };
}

export function practiceReveal(state: PracticeState): PracticeState {
  return state.revealed ? state : { ...state, revealed: true };
}
