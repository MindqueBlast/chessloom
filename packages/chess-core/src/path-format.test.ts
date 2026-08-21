import { describe, expect, it } from "vitest";
import {
  formatPathFromChapter,
  formatPathLabel,
  formatPathSan,
  parsePathKey,
  type ChapterTree,
} from "./index.js";

const start =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("path formatting", () => {
  it("parses chapter index and uci segments", () => {
    expect(parsePathKey("c0:")).toEqual({ chapterIndex: 0, uciMoves: [] });
    expect(parsePathKey("c2:e2e4/e7e5")).toEqual({
      chapterIndex: 2,
      uciMoves: ["e2e4", "e7e5"],
    });
  });

  it("formats a SAN line from path key uci", () => {
    expect(formatPathSan("c0:")).toBe("Starting position");
    expect(formatPathSan("c0:e2e4/e7e5/g1f3")).toBe("1. e4 e5 2. Nf3");
  });

  it("falls back to the raw key when uci cannot be replayed", () => {
    expect(formatPathSan("c0:zzzz")).toBe("c0:zzzz");
  });

  it("prefers chapter tree sans and labels with titles", () => {
    const chapter: ChapterTree = {
      index: 1,
      title: "Italian",
      headers: {},
      startingFen: start,
      root: {
        id: "root",
        pathKey: "c1:",
        fen: start,
        san: null,
        uci: null,
        ply: 0,
        comment: null,
        nags: [],
        children: [
          {
            id: "e4",
            pathKey: "c1:e2e4",
            fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
            san: "e4",
            uci: "e2e4",
            ply: 1,
            comment: null,
            nags: [],
            children: [
              {
                id: "e5",
                pathKey: "c1:e2e4/e7e5",
                fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
                san: "e5",
                uci: "e7e5",
                ply: 2,
                comment: null,
                nags: [],
                children: [],
              },
            ],
          },
        ],
      },
    };

    expect(formatPathFromChapter(chapter, "c1:e2e4/e7e5")).toBe("1. e4 e5");
    expect(
      formatPathLabel("c1:e2e4/e7e5", {
        chapter,
        chapterTitle: chapter.title,
      }),
    ).toBe("Italian · 1. e4 e5");
  });
});
