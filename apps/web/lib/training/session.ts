import {
  findNodeByPathKey,
  parseLearnCheckpoint,
  parsePracticeCheckpoint,
  parseTestCheckpoint,
  serializeCheckpoint,
  type ChapterTree,
  type LearnState,
  type PracticeState,
  type TestState,
} from "@chessloom/chess-core";

import { SESSION_TTL_MS } from "../actions/training-helpers";

export function isCheckpointWithinTtl(
  updatedAt: string,
  now = new Date(),
): boolean {
  const parsed = Date.parse(updatedAt);
  return Number.isFinite(parsed) && now.getTime() - parsed <= SESSION_TTL_MS;
}

export async function loadTrainingSession<T>(
  resume: () => Promise<T | null>,
  startFresh: () => Promise<T>,
): Promise<{ session: T; restored: boolean }> {
  const resumed = await resume();
  if (resumed) {
    return { session: resumed, restored: true };
  }
  return { session: await startFresh(), restored: false };
}

export function isLearnCheckpointRestorable(
  state: LearnState,
  chapters: ChapterTree[],
): boolean {
  const chapter = chapters.find(
    (candidate) => candidate.index === state.chapterIndex,
  );
  if (!chapter) return false;
  return [state.pathKey, ...state.stack].every((pathKey) =>
    Boolean(findNodeByPathKey(chapter, pathKey)),
  );
}

export function isPracticeCheckpointRestorable(
  state: PracticeState,
  chapters: ChapterTree[],
): boolean {
  return state.queue.every((card) => {
    const match = /^c(\d+):/.exec(card.pathKey);
    const chapter = match
      ? chapters.find((candidate) => candidate.index === Number(match[1]))
      : undefined;
    return chapter
      ? findNodeByPathKey(chapter, card.pathKey)?.fen === card.fen
      : false;
  });
}

export function resumableLearnCheckpoint(
  checkpoint: unknown,
  chapters: ChapterTree[],
): LearnState | null {
  try {
    const state = parseLearnCheckpoint(serializeCheckpoint(checkpoint));
    return isLearnCheckpointRestorable(state, chapters) ? state : null;
  } catch {
    return null;
  }
}

export function resumablePracticeCheckpoint(
  checkpoint: unknown,
  chapters: ChapterTree[],
): PracticeState | null {
  try {
    const state = parsePracticeCheckpoint(serializeCheckpoint(checkpoint));
    return isPracticeCheckpointRestorable(state, chapters) ? state : null;
  } catch {
    return null;
  }
}

export function isTestCheckpointRestorable(
  state: TestState,
  chapters: ChapterTree[],
): boolean {
  return state.queue.every((card) => {
    const match = /^c(\d+):/.exec(card.pathKey);
    const chapter = match
      ? chapters.find((candidate) => candidate.index === Number(match[1]))
      : undefined;
    return chapter
      ? findNodeByPathKey(chapter, card.pathKey)?.fen === card.fen
      : false;
  });
}

export function resumableTestCheckpoint(
  checkpoint: unknown,
  chapters: ChapterTree[],
): TestState | null {
  try {
    const state = parseTestCheckpoint(serializeCheckpoint(checkpoint));
    return isTestCheckpointRestorable(state, chapters) ? state : null;
  } catch {
    return null;
  }
}

export function applyResolvedMoveCheckpoint<T>(
  checkpoint: unknown,
  parse: (json: string) => T,
): T {
  return parse(serializeCheckpoint(checkpoint));
}
