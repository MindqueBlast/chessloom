# FSRS Task 1 Report: Extend PositionProgress + FSRS scheduler

## Status: Complete

## Changes

### Dependencies
- Added `ts-fsrs@^5.4.1` to `@chessloom/chess-core`

### Types (`packages/chess-core/src/types.ts`)
- Extended `PositionProgress` with required FSRS fields:
  `fsrsStability`, `fsrsDifficulty`, `fsrsElapsedDays`, `fsrsScheduledDays`,
  `fsrsReps`, `fsrsLapses`, `fsrsState`, `fsrsLastReview`

### New module (`packages/chess-core/src/srs/fsrs.ts`)
- `createInitialFsrsProgress(pathKey, now?)` — FSRS `createEmptyCard` mapped to progress
- `createFsrsScheduler()` — `Rating.Good` on correct, `Rating.Again` on incorrect; `compareDue` by `nextReviewAt` then mastery
- `masteryPercentFromProgress(progress, now?)` — `round(retrievability * 100)` clamped 0–100
- `migrateLightweightToFsrs(progress, now?)` — maps legacy mastery bands to stability `[1,3,7,14,30]` days, seeds `State.Review` when mastery > 0, preserves due from `nextReviewAt`

### Integration
- `createInitialProgress` now delegates to `createInitialFsrsProgress` (existing imports unchanged)
- Exported new symbols from `index.ts`
- Updated `lightweight.test.ts` fixture expectations for FSRS fields

### Tests (`packages/chess-core/src/srs/fsrs.test.ts`)
- 9 tests covering initial progress, scheduler correct/incorrect/due ordering, mastery derivation, migration determinism and band mapping

## Verification
```
pnpm --filter @chessloom/chess-core test  → 57/57 passed
pnpm --filter @chessloom/chess-core build → success
```

## Web app compile note (Task 3 scope)
`apps/web/lib/actions/training-helpers.ts` `progressFromRow` is missing new FSRS fields — TS2740 at compile. Expected; web DB migration + row mapping deferred to FSRS Task 3.

## Commit
`feat(chess-core): FSRS MasteryScheduler`

---

## Review Fix: persist FSRS learning_steps (Critical)

**Problem:** `progressToCard` hardcoded `learning_steps: 0`, resetting the FSRS learning-step counter on every scheduler call. Cards never graduated from Learning → Review after completing learning steps.

**Fix:**
- Added `fsrsLearningSteps: number` to `PositionProgress` in `types.ts`
- Round-trip in `progressToCard` / `cardFieldsFromCard` (initial + migrate inherit via `cardFieldsFromCard`)
- Regression test: two consecutive `onCorrect` on a new card → `fsrsState === State.Review` and due interval > 10 min (days-scale)
- `@deprecated` JSDoc on `createLightweightScheduler`

**Verification:**
```
pnpm --filter @chessloom/chess-core test  → 58/58 passed (10 in fsrs.test.ts)
pnpm --filter @chessloom/chess-core build → success
```

**Commit:** `fix(chess-core): persist FSRS learning_steps for card graduation`
