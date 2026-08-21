import { describe, expect, it, vi } from "vitest";
import { parsePgnToStudy } from "../pgn/parse.js";
import {
  learnApplyUserMove,
  learnAutoOpponentIfNeeded,
  startLearn,
  type ChapterTree,
  type TreeNode,
} from "../index.js";

function node(
  pathKey: string,
  fen: string,
  san: string | null,
  uci: string | null,
  children: TreeNode[] = [],
): TreeNode {
  return {
    id: pathKey,
    pathKey,
    fen,
    san,
    uci,
    ply: pathKey === "c2:" ? 0 : pathKey.split("/").length,
    comment: null,
    nags: [],
    children,
  };
}

const whiteFen = "8/8/8/8/8/8/8/K6k w - - 0 1";
const blackFen = "8/8/8/8/8/8/8/K6k b - - 0 1";
const nf3 = node("c2:e2e4/e7e5/g1f3", blackFen, "Nf3", "g1f3");
const e5 = node("c2:e2e4/e7e5", whiteFen, "e5", "e7e5", [nf3]);
const e4 = node("c2:e2e4", blackFen, "e4", "e2e4", [e5]);
const root = node("c2:", whiteFen, null, null, [e4]);
const chapter: ChapterTree = {
  index: 2,
  title: "Line",
  headers: {},
  startingFen: whiteFen,
  root,
};

describe("learn training", () => {
  it("starts at the chapter root and resolves random side once", () => {
    const rng = vi.fn(() => 0.75);

    expect(startLearn(chapter, "random", rng)).toEqual({
      chapterIndex: 2,
      pathKey: "c2:",
      side: "black",
      sideMode: "black",
      stack: [],
      status: "active",
    });
    expect(rng).toHaveBeenCalledTimes(1);
  });

  it("keeps an incorrect user move at the current position", () => {
    const state = startLearn(chapter, "white");
    const result = learnApplyUserMove(state, chapter, { san: "d4" });

    expect(result.feedback).toEqual({ ok: false, expected: [e4] });
    expect(result.state).toBe(state);
  });

  it("advances correct user moves and records the prior path", () => {
    const state = startLearn(chapter, "white");
    const result = learnApplyUserMove(state, chapter, { uci: "e2e4" });

    expect(result.feedback).toEqual({ ok: true, child: e4 });
    expect(result.state).toMatchObject({
      pathKey: e4.pathKey,
      stack: [root.pathKey],
      status: "active",
    });
  });

  it("auto-plays the first repertoire reply only on the opponent turn", () => {
    const afterE4 = learnApplyUserMove(
      startLearn(chapter, "white"),
      chapter,
      { san: "e4" },
    ).state;
    const afterE5 = learnAutoOpponentIfNeeded(afterE4, chapter);

    expect(afterE5).toMatchObject({
      pathKey: e5.pathKey,
      stack: [root.pathKey, e4.pathKey],
      status: "active",
    });
    expect(learnAutoOpponentIfNeeded(afterE5, chapter)).toBe(afterE5);
  });

  it("auto-plays the opening move for a black session", () => {
    const state = startLearn(chapter, "black");

    expect(learnAutoOpponentIfNeeded(state, chapter)).toMatchObject({
      pathKey: e4.pathKey,
      stack: [root.pathKey],
    });
  });

  it("rejects a user move on the opponent ply in a white session", () => {
    const afterE4 = learnApplyUserMove(
      startLearn(chapter, "white"),
      chapter,
      { san: "e4" },
    ).state;
    const result = learnApplyUserMove(afterE4, chapter, { san: "e5" });

    expect(result).toEqual({
      state: afterE4,
      feedback: { ok: false, expected: [], reason: "opponent-turn" },
    });
  });

  it("rejects a user move on the opponent ply in a black session", () => {
    const state = startLearn(chapter, "black");
    const result = learnApplyUserMove(state, chapter, { san: "e4" });

    expect(result).toEqual({
      state,
      feedback: { ok: false, expected: [], reason: "opponent-turn" },
    });
  });

  it("never auto-plays in both mode, so the user plays every ply", () => {
    const afterE4 = learnApplyUserMove(
      startLearn(chapter, "both"),
      chapter,
      { san: "e4" },
    ).state;

    expect(learnAutoOpponentIfNeeded(afterE4, chapter)).toBe(afterE4);
    expect(
      learnApplyUserMove(afterE4, chapter, { san: "e5" }).state.pathKey,
    ).toBe(e5.pathKey);
  });

  it("completes after the final repertoire move", () => {
    const atNf3 = learnApplyUserMove(
      learnAutoOpponentIfNeeded(
        learnApplyUserMove(startLearn(chapter, "white"), chapter, {
          san: "e4",
        }).state,
        chapter,
      ),
      chapter,
      { san: "Nf3" },
    ).state;

    expect(atNf3.status).toBe("complete");
  });

  it("does not auto-play when the opponent has multiple replies", () => {
    const chapter = parsePgnToStudy(
      "1. e4 e5 2. Nf3 (2. Nc3) 2... Nc6 *",
    ).chapters[0]!;
    const afterUserE5 = learnApplyUserMove(
      learnAutoOpponentIfNeeded(startLearn(chapter, "black"), chapter),
      chapter,
      { san: "e5" },
    ).state;
    const afterOpponent = learnAutoOpponentIfNeeded(afterUserE5, chapter);
    const e5 = chapter.root.children[0]!.children[0]!;
    const nf3 = e5.children[0]!;
    const nc3 = e5.children[1]!;

    expect(nf3.san).toBe("Nf3");
    expect(nc3.san).toBe("Nc3");
    expect(afterOpponent.pathKey).toBe(e5.pathKey);
    expect(afterOpponent.pathKey).not.toBe(nf3.pathKey);
  });
});
