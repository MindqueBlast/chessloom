import { describe, expect, it } from "vitest";
import {
  parseLearnCheckpoint,
  parsePracticeCheckpoint,
  serializeCheckpoint,
  startLearn,
  startPractice,
  type ChapterTree,
  type PracticeCard,
} from "../index.js";

const fen = "8/8/8/8/8/8/8/K6k w - - 0 1";
const chapter: ChapterTree = {
  index: 4,
  title: "Checkpoint",
  headers: {},
  startingFen: fen,
  root: {
    id: "root",
    pathKey: "c4:",
    fen,
    san: null,
    uci: null,
    ply: 0,
    comment: null,
    nags: [],
    children: [
      {
        id: "move",
        pathKey: "c4:a1a2",
        fen: "8/8/8/8/8/8/K7/7k b - - 1 1",
        san: "Ka2",
        uci: "a1a2",
        ply: 1,
        comment: null,
        nags: [],
        children: [],
      },
    ],
  },
};
const cards: PracticeCard[] = [{ pathKey: "c4:", fen }];

describe("training checkpoints", () => {
  it("round-trips a learn state", () => {
    const state = startLearn(chapter, "both");

    expect(parseLearnCheckpoint(serializeCheckpoint(state))).toEqual(state);
  });

  it("round-trips a practice state", () => {
    const state = startPractice(cards, "white");

    expect(parsePracticeCheckpoint(serializeCheckpoint(state))).toEqual(state);
  });

  it("rejects invalid JSON and malformed learn state", () => {
    expect(() => parseLearnCheckpoint("{")).toThrow("Invalid learn checkpoint");
    expect(() =>
      parseLearnCheckpoint('{"chapterIndex":"4","pathKey":"c4:"}'),
    ).toThrow("Invalid learn checkpoint");
  });

  it("rejects malformed practice cards", () => {
    expect(() =>
      parsePracticeCheckpoint(
        '{"queue":[{"pathKey":2,"fen":"x"}],"index":0,"revealed":false,"side":"white","status":"active"}',
      ),
    ).toThrow("Invalid practice checkpoint");
  });

  it("rejects values that JSON cannot serialize", () => {
    expect(() => serializeCheckpoint(undefined)).toThrow(
      "Checkpoint is not JSON-serializable",
    );
  });
});
