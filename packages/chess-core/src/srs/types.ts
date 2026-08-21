import type { PositionProgress } from "../types.js";

export interface MasteryScheduler {
  onCorrect(progress: PositionProgress, now?: Date): PositionProgress;
  onIncorrect(progress: PositionProgress, now?: Date): PositionProgress;
  compareDue(a: PositionProgress, b: PositionProgress): number;
}

export interface LightweightConfig {
  correctMasteryDelta: number;
  incorrectMasteryDelta: number;
  intervalsMsByBand: readonly number[];
  incorrectDelayMs: number;
}
