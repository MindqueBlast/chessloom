# Chessloom Phase 2 — Slice 3: Random Test & Full Repertoire Test

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development or executing-plans.

**Goal:** Add `random_test` and `full_test` session modes that reuse Practice board UX and **update FSRS** on each graded move.

**Depends on:** Slice 2 (FSRS) complete.

**Spec:** `docs/superpowers/specs/2026-08-21-chessloom-phase2-design.md` §5

## Global Constraints

- Reuse Practice UX: immediate move commit, “Not in your repertoire.”, reveal/retry, Continue
- Server-validated moves; FSRS updates (real reviews)
- Never grade against Stockfish
- Side: White / Black / Both / Random (coin-flip once per session)
- Preserve visual identity

---

### Task 1: chess-core queue builders + checkpoint types

**Files:**
- Create: `packages/chess-core/src/training/test-modes.ts`
- Create: `packages/chess-core/src/training/test-modes.test.ts`
- Modify: `packages/chess-core/src/types.ts` — `SessionMode = "learn" | "practice" | "random_test" | "full_test"`
- Modify: checkpoint parsers to accept test state

**Interfaces:**
```ts
interface TestCard { pathKey: string; fen: string }

interface TestState {
  mode: "random_test" | "full_test";
  queue: TestCard[];
  index: number;
  revealed: boolean;
  side: "white" | "black";
  sideMode: "white" | "black" | "both";
  status: "active" | "complete";
  // random only:
  targetCount?: number;
  // summary accumulators optional in checkpoint or computed at end:
  correctCount: number;
  incorrectCount: number;
  weakPathKeys: string[];
}

buildRandomTestQueue(cards: TestCard[], progress: PositionProgress[], n: number, now?: Date, rng?: () => number): TestCard[]
// prefer due (nextReviewAt <= now), then weakest mastery, fill randomly to n unique

buildFullTestQueue(cards: TestCard[]): TestCard[]
// chapter/path order as provided (caller passes chapter-sorted trainable list)

clampRandomTestN(n: number): number // 5..50, default 20
```

- [ ] TDD queue builders; commit `feat(chess-core): random and full test queue builders`

---

### Task 2: DB mode allowlist + session start

**Files:**
- Create: `supabase/migrations/20260821150000_test_session_modes.sql` — widen `training_sessions.mode` check
- Modify: `apps/web/lib/actions/training.ts` — `startTrainingSessionAction` accepts new modes + options `{ n?: number; sideMode }`
- Checkpoint via `createInitialTestCheckpoint`

- [ ] Apply migration; commit `feat(db): allow random_test and full_test session modes`

---

### Task 3: Server actions + end summary

**Files:**
- Modify: `apps/web/lib/actions/training.ts` — submit move for test modes (same scorePositionAndSave / FSRS)
- Create helpers for summary when `index >= queue.length`
- Weak positions = pathKeys marked incorrect during session

- [ ] Tests; commit `feat(web): grade random/full test moves with FSRS`

---

### Task 4: UI entry + TestView

**Files:**
- Create: `apps/web/components/training/TestView.tsx` (clone Practice patterns; progress `k/total`; end screen accuracy + weak list)
- Modify: study overview / training entry — Random Test + Full Test buttons + N input (default 20) + side picker
- Routes: reuse `/studies/[id]/practice`-style or `/studies/[id]/test?mode=`

Prefer: `/studies/[studyId]/test/random` and `.../test/full` or query param — match existing app router patterns.

- [ ] Wire navigation; commit `feat(web): Random and Full Repertoire Test UI`

---

## Spec coverage

| Requirement | Task |
|-------------|------|
| Random N 5–50 default 20 | 1, 4 |
| Prefer due/weak | 1 |
| Full = all trainable ordered | 1 |
| Updates FSRS | 3 |
| End screen | 3–4 |
| Practice-like UX | 4 |
