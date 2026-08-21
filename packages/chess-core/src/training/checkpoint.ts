import type { LearnState } from "./learn.js";
import type { PracticeCard, PracticeState } from "./practice.js";
import type { TestCard, TestState } from "./test-modes.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(json: string, kind: "learn" | "practice" | "test"): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error(`Invalid ${kind} checkpoint`);
  }
}

function isSide(value: unknown): value is "white" | "black" {
  return value === "white" || value === "black";
}

function isStatus(value: unknown): value is "active" | "complete" {
  return value === "active" || value === "complete";
}

function isPracticeCard(value: unknown): value is PracticeCard {
  return (
    isRecord(value) &&
    typeof value.pathKey === "string" &&
    typeof value.fen === "string"
  );
}

function isTestCard(value: unknown): value is TestCard {
  return isPracticeCard(value);
}

function isTestMode(value: unknown): value is TestState["mode"] {
  return value === "random_test" || value === "full_test";
}

function isTestSideMode(value: unknown): value is TestState["sideMode"] {
  return value === "white" || value === "black" || value === "both";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0;
}

export function serializeCheckpoint(input: unknown): string {
  try {
    const json = JSON.stringify(input);
    if (json === undefined) {
      throw new Error();
    }
    return json;
  } catch {
    throw new Error("Checkpoint is not JSON-serializable");
  }
}

export function parseLearnCheckpoint(json: string): LearnState {
  const value = parseJson(json, "learn");
  if (
    !isRecord(value) ||
    !Number.isInteger(value.chapterIndex) ||
    (value.chapterIndex as number) < 0 ||
    typeof value.pathKey !== "string" ||
    !isSide(value.side) ||
    !Array.isArray(value.stack) ||
    !value.stack.every((path) => typeof path === "string") ||
    !isStatus(value.status) ||
    (value.sideMode !== "white" &&
      value.sideMode !== "black" &&
      value.sideMode !== "both")
  ) {
    throw new Error("Invalid learn checkpoint");
  }
  return value as unknown as LearnState;
}

export function parsePracticeCheckpoint(json: string): PracticeState {
  const value = parseJson(json, "practice");
  if (
    !isRecord(value) ||
    !Array.isArray(value.queue) ||
    !value.queue.every(isPracticeCard) ||
    !Number.isInteger(value.index) ||
    (value.index as number) < 0 ||
    (value.index as number) > value.queue.length ||
    typeof value.revealed !== "boolean" ||
    !isSide(value.side) ||
    !isStatus(value.status)
  ) {
    throw new Error("Invalid practice checkpoint");
  }
  return value as unknown as PracticeState;
}

export function parseTestCheckpoint(json: string): TestState {
  const value = parseJson(json, "test");
  if (
    !isRecord(value) ||
    !isTestMode(value.mode) ||
    !Array.isArray(value.queue) ||
    !value.queue.every(isTestCard) ||
    !Number.isInteger(value.index) ||
    (value.index as number) < 0 ||
    (value.index as number) > value.queue.length ||
    typeof value.revealed !== "boolean" ||
    !isSide(value.side) ||
    !isTestSideMode(value.sideMode) ||
    !isStatus(value.status) ||
    !isNonNegativeInteger(value.correctCount) ||
    !isNonNegativeInteger(value.incorrectCount) ||
    !isStringArray(value.weakPathKeys) ||
    (value.targetCount !== undefined &&
      (!Number.isInteger(value.targetCount) ||
        (value.targetCount as number) < 5 ||
        (value.targetCount as number) > 50))
  ) {
    throw new Error("Invalid test checkpoint");
  }
  return value as unknown as TestState;
}
