import { describe, expect, it } from "vitest";
import { buildLichessPlayAiUrl, parseLichessStudyUrl } from "../index.js";

describe("lichess urls", () => {
  it("parses a public study url", () => {
    expect(
      parseLichessStudyUrl("https://lichess.org/study/abcdefgh"),
    ).toEqual({
      studyId: "abcdefgh",
      canonicalUrl: "https://lichess.org/study/abcdefgh",
    });
  });

  it("builds a play-vs-AI deep link from fen and color", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const url = buildLichessPlayAiUrl(fen, "black");
    expect(url.startsWith("https://lichess.org/?")).toBe(true);
    expect(url.endsWith("#ai")).toBe(true);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("fen")).toBe(fen);
    expect(parsed.searchParams.get("color")).toBe("black");
    expect(parsed.hash).toBe("#ai");
  });
});
