import { Chess } from "chess.js";

import type { EngineEval } from "@/lib/engine/stockfish-client";

const CP_CLAMP = 800;

export function formatEvalScore(cp: number | null, mate: number | null): string {
  if (mate !== null) {
    return mate > 0 ? `+#${mate}` : `-#${Math.abs(mate)}`;
  }
  if (cp === null) {
    return "—";
  }
  const pawns = cp / 100;
  return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

/** Map centipawns / mate to white share of the bar (5–95 for visibility). */
export function evalToWhitePercent(cp: number | null, mate: number | null): number {
  if (mate !== null) {
    return mate > 0 ? 95 : 5;
  }
  if (cp === null) {
    return 50;
  }
  const clamped = Math.max(-CP_CLAMP, Math.min(CP_CLAMP, cp));
  const raw = 50 + (clamped / CP_CLAMP) * 45;
  return Math.max(5, Math.min(95, raw));
}

export function pvToDisplayLine(fen: string, pv: string[]): string {
  if (pv.length === 0) {
    return "";
  }

  try {
    const game = new Chess(fen);
    const sans: string[] = [];

    for (const uci of pv) {
      if (uci.length < 4) {
        break;
      }
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion =
        uci.length > 4 &&
        (uci[4] === "q" ||
          uci[4] === "r" ||
          uci[4] === "b" ||
          uci[4] === "n")
          ? uci[4]
          : undefined;
      const move = game.move({ from, to, promotion });
      if (!move) {
        break;
      }
      sans.push(move.san);
    }

    return sans.length > 0 ? sans.join(" ") : pv.join(" ");
  } catch {
    return pv.join(" ");
  }
}

export function hasEvalData(evalResult: EngineEval | null): boolean {
  return Boolean(
    evalResult &&
      (evalResult.cp !== null ||
        evalResult.mate !== null ||
        evalResult.pv.length > 0),
  );
}
