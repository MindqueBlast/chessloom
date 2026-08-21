import { describe, expect, it } from "vitest";

import { flattenStudyTree, importSource } from "./import";

const variationPgn = `[Event "Sicilian"]

1. e4 c5 2. Nf3 (2. Nc3) *`;

describe("study import preparation", () => {
  it("flattens every node while preserving parent path keys", async () => {
    const { parsePgnToStudy } = await import("@chessloom/chess-core");
    const study = parsePgnToStudy(variationPgn);

    const chapters = flattenStudyTree(study);

    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.nodes.map((node) => node.path_key)).toEqual([
      "c0:",
      "c0:e2e4",
      "c0:e2e4/c7c5",
      "c0:e2e4/c7c5/g1f3",
      "c0:e2e4/c7c5/b1c3",
    ]);
  });

  it("stores only PGNs larger than the inline limit", () => {
    expect(importSource(200_000)).toEqual({
      sourceType: "pgn_paste",
      useStorage: false,
    });
    expect(importSource(200_001)).toEqual({
      sourceType: "pgn_upload",
      useStorage: true,
    });
  });
});
