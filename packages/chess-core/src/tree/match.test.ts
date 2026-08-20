import { describe, expect, it } from "vitest";
import {
  findNodeByPathKey,
  isRepertoireMove,
  type ChapterTree,
  type TreeNode,
} from "../index.js";

function node(
  pathKey: string,
  san: string | null,
  uci: string | null,
  children: TreeNode[] = [],
): TreeNode {
  return {
    id: pathKey,
    pathKey,
    fen: "test-fen",
    san,
    uci,
    ply: pathKey === "c0:" ? 0 : pathKey.split("/").length,
    comment: null,
    nags: [],
    children,
  };
}

const nf3 = node("c0:e2e4/e7e5/g1f3", "Nf3", "g1f3");
const bc4 = node("c0:e2e4/e7e5/f1c4", "Bc4", "f1c4");
const e5 = node("c0:e2e4/e7e5", "e5", "e7e5", [nf3, bc4]);
const e4 = node("c0:e2e4", "e4", "e2e4", [e5]);
const root = node("c0:", null, null, [e4]);
const chapter: ChapterTree = {
  index: 0,
  title: "Italian Game",
  headers: {},
  startingFen: "test-fen",
  root,
};

describe("isRepertoireMove", () => {
  it("matches a child by normalized SAN", () => {
    expect(isRepertoireMove(e5, { san: "  Nf3?!  " })).toEqual({
      ok: true,
      child: nf3,
    });
  });

  it("matches a child by normalized UCI", () => {
    expect(isRepertoireMove(e5, { uci: " G1F3 " })).toEqual({
      ok: true,
      child: nf3,
    });
  });

  it("rejects an off-book move and lists expected children", () => {
    expect(isRepertoireMove(e5, { san: "d4", uci: "d2d4" })).toEqual({
      ok: false,
      expected: [nf3, bc4],
    });
  });

  it("rejects a missing move identity", () => {
    expect(isRepertoireMove(e5, {})).toEqual({
      ok: false,
      expected: [nf3, bc4],
    });
  });
});

describe("findNodeByPathKey", () => {
  it("finds the chapter root", () => {
    expect(findNodeByPathKey(chapter, "c0:")).toBe(root);
  });

  it("finds a nested variation node", () => {
    expect(findNodeByPathKey(chapter, bc4.pathKey)).toBe(bc4);
  });

  it("returns null when the path is absent", () => {
    expect(findNodeByPathKey(chapter, "c0:d2d4")).toBeNull();
  });
});
