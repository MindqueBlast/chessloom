import { describe, expect, it } from "vitest";
import { parsePgnToStudy } from "./parse.js";

const VARIATION_PGN = `[Event "Test"]
[White "W"]
[Black "B"]

1. e4 e5 2. Nf3 (2. Nc3 Nf6) 2... Nc6 *`;

describe("parsePgnToStudy", () => {
  it("preserves a side variation as a sibling child", () => {
    const study = parsePgnToStudy(VARIATION_PGN);
    expect(study.chapters).toHaveLength(1);
    const root = study.chapters[0]!.root;
    const e4 = root.children.find((c) => c.san === "e4");
    expect(e4).toBeTruthy();
    const e5 = e4!.children.find((c) => c.san === "e5");
    const afterE5 = e5!;
    const seconds = afterE5.children;
    const sans = seconds.map((c) => c.san).sort();
    expect(sans).toEqual(["Nc3", "Nf3"].sort());
  });

  it("assigns stable path_keys along mainline", () => {
    const study = parsePgnToStudy(`1. e4 e5 *`);
    const e4 = study.chapters[0]!.root.children[0]!;
    expect(e4.pathKey).toBe("c0:e2e4");
    expect(e4.children[0]!.pathKey).toBe("c0:e2e4/e7e5");
  });

  it("keeps comments on nodes when present", () => {
    const study = parsePgnToStudy(`1. e4 {Best by test} e5 *`);
    const e4 = study.chapters[0]!.root.children[0]!;
    expect(e4.comment).toMatch(/Best by test/);
  });

  it("throws on empty input", () => {
    expect(() => parsePgnToStudy("")).toThrow();
  });
});
