# Task 2 Report: path_key + PGN variation trees

**Status:** DONE  
**Branch:** `feature/chessloom-mvp`  
**Commit:** `7a16d26` — feat(chess-core): parse PGN into variation trees with path keys

## Summary

Implemented locked-format path keys and PGN conversion into `StudyTree`. The parser supports multiple chapters, nested side variations, SAN/UCI/FEN data, comments, NAGs, UUID node IDs, custom starting FENs, and typed parse errors.

## Implementation

- Added `buildPathKey(chapterIndex, uciPath)` with chapter-index validation.
- Added `parsePgnToStudy` and `PgnParseError`.
- Added recursive tree construction using `@mliebelt/pgn-parser` and `chess.js`.
- Assigned root and move-node UUIDs with `crypto.randomUUID()`.
- Preserved side variations as sibling children from their branching position.
- Derived deterministic path keys from chapter index and each node's UCI ancestry.
- Exported the public APIs from the package index.
- Removed the temporary smoke test.
- Excluded `**/*.test.ts` from TypeScript build emit as the Task 1 review minor.

## TDD Evidence

### Path-key RED

After adding `src/path-key.test.ts` and before implementation:

```text
FAIL src/path-key.test.ts
Error: Cannot find module './path-key.js'
Test Files 1 failed | 1 passed
```

### Path-key GREEN

After adding `src/path-key.ts`:

```text
✓ src/path-key.test.ts (2 tests)
Test Files 1 passed (1)
Tests 2 passed (2)
```

### PGN parser RED

After adding `src/pgn/parse.test.ts` and before parser/tree implementation:

```text
FAIL src/pgn/parse.test.ts
Error: Cannot find module './parse.js'
Test Files 1 failed (1)
```

### PGN parser GREEN

After implementing parser and tree construction:

```text
✓ src/pgn/parse.test.ts (4 tests)
Test Files 1 passed (1)
Tests 4 passed (4)
```

## Final Verification

```text
corepack pnpm --filter @chessloom/chess-core test
✓ src/path-key.test.ts (2 tests)
✓ src/pgn/parse.test.ts (4 tests)
Test Files 2 passed (2)
Tests 6 passed (6)

corepack pnpm --filter @chessloom/chess-core build
tsc -p tsconfig.json
Exit code 0
```

`pnpm` was not directly available on PATH, so verification used the equivalent `corepack pnpm`.

## Self-Review

- Confirmed path-key format is exactly `c{chapterIndex}:{uci/uci/...}` and roots end at the colon.
- Confirmed variations are built from the position before the annotated mainline move.
- Confirmed each recursive branch carries an independent `Chess` position and UCI ancestry.
- Confirmed the chapter root and all move nodes receive UUIDs.
- Confirmed comments, NAGs, canonical SAN, UCI, and resulting FEN are attached to move nodes.
- Confirmed multi-game input maps to chapter indices `0..n-1`, with study title from the first Event header or `Untitled study`.
- Confirmed parser/build failures are wrapped in `PgnParseError`.
- Confirmed only `packages/chess-core` changes were included in the task commit.

## Concerns

None.

## Review Fix Verification

- Preserved leading game comments on the chapter root without changing its path key.
- Deduplicated identical parser representations of ordinary move comments.
- Strengthened comment assertions and added a leading-comment regression test.

```text
corepack pnpm --filter @chessloom/chess-core test
Test Files 2 passed (2)
Tests 7 passed (7)
Exit code 0
```

The requested direct `pnpm` command was unavailable on PATH, so the equivalent
Corepack invocation was used.
