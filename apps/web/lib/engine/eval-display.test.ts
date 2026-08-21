import { describe, expect, it } from "vitest";

import {
  evalToWhitePercent,
  formatEvalScore,
  pvToDisplayLine,
} from "./eval-display";

describe("formatEvalScore", () => {
  it("formats centipawns as pawn advantage", () => {
    expect(formatEvalScore(150, null)).toBe("+1.5");
    expect(formatEvalScore(-75, null)).toBe("-0.8");
  });

  it("formats mate scores with sign", () => {
    expect(formatEvalScore(null, 3)).toBe("+#3");
    expect(formatEvalScore(null, -2)).toBe("-#2");
  });
});

describe("evalToWhitePercent", () => {
  it("centers equal positions", () => {
    expect(evalToWhitePercent(0, null)).toBe(50);
    expect(evalToWhitePercent(null, null)).toBe(50);
  });

  it("pushes toward extremes for large advantages", () => {
    expect(evalToWhitePercent(800, null)).toBe(95);
    expect(evalToWhitePercent(-800, null)).toBe(5);
  });
});

describe("pvToDisplayLine", () => {
  it("converts UCI pv to SAN from the starting FEN", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    expect(pvToDisplayLine(fen, ["e7e5"])).toBe("e5");
  });
});
