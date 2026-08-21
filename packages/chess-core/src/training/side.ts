import type { SideMode } from "../types.js";

export type TrainingSide = "white" | "black";

export function resolveTrainingSide(
  sideMode: SideMode,
  rng: () => number = Math.random,
): TrainingSide {
  if (sideMode === "random") {
    return rng() < 0.5 ? "white" : "black";
  }
  return sideMode === "black" ? "black" : "white";
}

export function sideToMove(fen: string): TrainingSide {
  return fen.split(/\s+/)[1] === "b" ? "black" : "white";
}
