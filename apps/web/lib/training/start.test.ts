import { describe, expect, it } from "vitest";

import {
  learnCheckpointMatchesChapter,
  parseTrainingStartQuery,
  trainingPath,
} from "./start";

describe("training start query", () => {
  it("parses chapter, session side including random, and fresh", () => {
    expect(
      parseTrainingStartQuery({
        chapter: "2",
        side: "random",
        fresh: "1",
      }),
    ).toEqual({
      chapterIndex: 2,
      sideMode: "random",
      fresh: true,
    });
    expect(parseTrainingStartQuery({ chapter: "nope", side: "green" })).toEqual({
      chapterIndex: undefined,
      sideMode: undefined,
      fresh: false,
    });
  });

  it("builds learn and practice hrefs from the selected start options", () => {
    expect(
      trainingPath("study-1", "learn", {
        chapterIndex: 1,
        sideMode: "black",
      }),
    ).toBe("/studies/study-1/learn?chapter=1&side=black");
    expect(
      trainingPath("study-1", "practice", { sideMode: "random", fresh: true }),
    ).toBe("/studies/study-1/practice?side=random&fresh=1");
  });

  it("resumes a learn checkpoint only when the requested chapter matches", () => {
    const checkpoint = {
      chapterIndex: 1,
      pathKey: "c1:",
      side: "white",
      sideMode: "white",
      stack: [],
      status: "active",
    };
    expect(learnCheckpointMatchesChapter(checkpoint, undefined)).toBe(true);
    expect(learnCheckpointMatchesChapter(checkpoint, 1)).toBe(true);
    expect(learnCheckpointMatchesChapter(checkpoint, 0)).toBe(false);
  });
});
