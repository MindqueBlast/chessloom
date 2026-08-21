import { describe, expect, it, vi } from "vitest";
import {
  practiceApplyMove,
  practiceReveal,
  startPractice,
  type ChapterTree,
  type PracticeCard,
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
    ply: pathKey === "c0:" ? 0 : pathKey.split("/").length,
    comment: null,
    nags: [],
    children,
  };
}

const whiteFen = "8/8/8/8/8/8/8/K6k w - - 0 1";
const blackFen = "8/8/8/8/8/8/8/K6k b - - 0 1";
const e5 = node("c0:e2e4/e7e5", whiteFen, "e5", "e7e5");
const e4 = node("c0:e2e4", blackFen, "e4", "e2e4", [e5]);
const root = node("c0:", whiteFen, null, null, [e4]);
const chapter: ChapterTree = {
  index: 0,
  title: "Cards",
  headers: {},
  startingFen: whiteFen,
  root,
};
const cards: PracticeCard[] = [
  { pathKey: root.pathKey, fen: whiteFen },
  { pathKey: e4.pathKey, fen: blackFen },
];

describe("practice training", () => {
  it("filters cards to the fixed training side", () => {
    expect(startPractice(cards, "black")).toEqual({
      queue: [cards[1]],
      index: 0,
      revealed: false,
      side: "black",
      status: "active",
    });
  });

  it("coin-flips random side once per session", () => {
    const rng = vi.fn(() => 0.2);
    const state = startPractice(cards, "random", rng);

    expect(state.side).toBe("white");
    expect(state.queue).toEqual([cards[0]]);
    expect(rng).toHaveBeenCalledTimes(1);
  });

  it("keeps every card in both mode", () => {
    expect(startPractice(cards, "both").queue).toEqual(cards);
  });

  it("starts complete when no cards match", () => {
    expect(startPractice([], "white").status).toBe("complete");
  });

  it("does not advance or reveal after an incorrect move", () => {
    const state = startPractice(cards, "both");
    const result = practiceApplyMove(state, chapter, { san: "d4" });

    expect(result.feedback).toEqual({ ok: false, expected: [e4] });
    expect(result.state).toBe(state);
    expect(result.state.revealed).toBe(false);
  });

  it("only reveal explicitly flips the revealed flag", () => {
    const state = startPractice(cards, "both");

    expect(practiceReveal(state)).toEqual({ ...state, revealed: true });
    expect(practiceReveal(practiceReveal(state))).toEqual({
      ...state,
      revealed: true,
    });
  });

  it("advances a correct move and resets reveal for the next card", () => {
    const state = practiceReveal(startPractice(cards, "both"));
    const result = practiceApplyMove(state, chapter, { uci: "e2e4" });

    expect(result.feedback).toEqual({ ok: true, child: e4 });
    expect(result.state).toMatchObject({
      index: 1,
      revealed: false,
      status: "active",
    });
  });

  it("completes after answering the final card", () => {
    const state = startPractice(cards, "black");
    const result = practiceApplyMove(state, chapter, { san: "e5" });

    expect(result.state).toMatchObject({ index: 1, status: "complete" });
  });
});
