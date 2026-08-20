# Task 5 Report: Learn + Practice state machines + checkpoint

## Status

Complete.

## Commit

- `feat(chess-core): learn/practice engines and checkpoints`

## Implementation

- Added learn session startup, user move matching, deterministic opponent replies, completion, and path stack tracking.
- Added fixed, both, and one-time injectable random side resolution.
- Preserved both-mode in learn state so opponent auto-play remains disabled after checkpoint restoration.
- Added practice card filtering, move application, explicit reveal, queue advancement, and completion.
- Incorrect practice moves retain the current state and never change `revealed`.
- Added validated JSON serialization and parsers for learn and practice checkpoint round-trips.
- Exported all training APIs from the package index.

## TDD evidence

1. Learn: added seven tests, then ran the focused file; all seven failed because `startLearn` was absent. Implemented the learn and side modules; all seven passed.
2. Practice: added eight tests, then ran the focused file; all eight failed because `startPractice` was absent. Implemented the practice module; all eight passed.
3. Checkpoints: added five tests, then ran the focused file; all five failed because checkpoint exports were absent. Implemented checkpoint serialization and parsing; all five passed.

## Verification

- `corepack pnpm --filter @chessloom/chess-core test`
  - 7 test files passed
  - 40 tests passed
- `corepack pnpm --filter @chessloom/chess-core build`
  - TypeScript compilation passed
- Independent review found no concrete defects.

## Concerns

- Opponent auto-play selects the first repertoire child deterministically; variation choice policy is not specified by the current core interface.

## Review fixes

- Fixed white/black learn sessions to reject user moves on opponent plies without advancing state, returning `reason: "opponent-turn"`; both mode still accepts every ply.
- Required `sideMode` when parsing learn checkpoints and verified that restored both-mode sessions do not auto-play.
- Added four regression tests and observed the ownership and missing-`sideMode` tests fail before implementation.
- `corepack pnpm --filter @chessloom/chess-core test`: 7 test files passed, 44 tests passed.
