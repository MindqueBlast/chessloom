import {
  findNodeByPathKey,
  isRepertoireMove,
  type MatchResult,
} from "../tree/match.js";
import type { ChapterTree, PathKey, SideMode, TreeNode } from "../types.js";
import {
  resolveTrainingSide,
  sideToMove,
  type TrainingSide,
} from "./side.js";

export interface LearnState {
  chapterIndex: number;
  pathKey: PathKey;
  side: TrainingSide;
  sideMode: Exclude<SideMode, "random">;
  stack: PathKey[];
  status: "active" | "complete";
}

function currentNode(state: LearnState, chapter: ChapterTree): TreeNode {
  const node = findNodeByPathKey(chapter, state.pathKey);
  if (!node) {
    throw new Error(`Learn checkpoint path not found: ${state.pathKey}`);
  }
  return node;
}

function advance(state: LearnState, child: TreeNode): LearnState {
  return {
    ...state,
    pathKey: child.pathKey,
    stack: [...state.stack, state.pathKey],
    status: child.children.length === 0 ? "complete" : "active",
  };
}

export function startLearn(
  chapter: ChapterTree,
  sideMode: SideMode,
  rng?: () => number,
): LearnState {
  const side = resolveTrainingSide(sideMode, rng);
  return {
    chapterIndex: chapter.index,
    pathKey: chapter.root.pathKey,
    side,
    sideMode: sideMode === "both" ? "both" : side,
    stack: [],
    status: chapter.root.children.length === 0 ? "complete" : "active",
  };
}

export function learnApplyUserMove(
  state: LearnState,
  chapter: ChapterTree,
  move: { san?: string; uci?: string },
): { state: LearnState; feedback: MatchResult } {
  const feedback = isRepertoireMove(currentNode(state, chapter), move);
  return feedback.ok
    ? { state: advance(state, feedback.child), feedback }
    : { state, feedback };
}

export function learnAutoOpponentIfNeeded(
  state: LearnState,
  chapter: ChapterTree,
): LearnState {
  if (state.status === "complete" || state.sideMode === "both") {
    return state;
  }

  const node = currentNode(state, chapter);
  if (sideToMove(node.fen) === state.side || node.children.length === 0) {
    return state;
  }

  return advance(state, node.children[0]!);
}
