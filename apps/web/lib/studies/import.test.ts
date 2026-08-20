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
    expect(chapters[0]?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path_key: "c0:", parent_path_key: null }),
        expect.objectContaining({
          path_key: "c0:e2e4/c7c5/g1f3",
          parent_path_key: "c0:e2e4/c7c5",
        }),
        expect.objectContaining({
          path_key: "c0:e2e4/c7c5/b1c3",
          parent_path_key: "c0:e2e4/c7c5",
        }),
      ]),
    );
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
