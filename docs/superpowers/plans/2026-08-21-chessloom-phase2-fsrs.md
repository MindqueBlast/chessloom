# Chessloom Phase 2 — Slice 2: FSRS Scheduler

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans. Checkbox steps for tracking.

**Goal:** Replace lightweight ±8/±15 SQL scheduling with **FSRS** as the sole `MasteryScheduler`. Server TS computes card updates; SQL persists fields only. Migrate existing `position_progress` rows.

**Architecture:** Add `ts-fsrs` to `@chessloom/chess-core`. Implement `createFsrsScheduler(): MasteryScheduler` mapping Grade → FSRS. Extend `PositionProgress` + DB columns. Change `scorePositionAndSave` to compute next progress in TS, then upsert via a new `upsert_position_progress` (or replace math inside apply RPCs with client-supplied validated fields from service role only — prefer: service writes full progress row after TS schedule). Dashboard mastery % derived from FSRS retrievability.

**Spec:** `docs/superpowers/specs/2026-08-21-chessloom-phase2-design.md` §4

**Depends on:** Slice 1 optional (independent of Lichess); must ship before Slice 3 tests that update FSRS.

## Global Constraints

- FSRS is the only scheduler — remove lightweight write path; keep or delete lightweight module after migration
- No dual-scheduler toggle; no user-tunable params in Phase 2
- Server authority: never trust client-sent mastery fields from browser; only server actions compute schedule
- Retain `attempts`, `correct_count`, `streak` for stats
- Preserve visual identity
- Practice queue: due first (`due`/`nextReviewAt`), then weakest (retrievability/mastery), then least recent

---

### Task 1: Extend PositionProgress + FSRS scheduler in chess-core

**Files:**
- Modify: `packages/chess-core/src/types.ts` — add FSRS fields on `PositionProgress`
- Create: `packages/chess-core/src/srs/fsrs.ts`
- Create: `packages/chess-core/src/srs/fsrs.test.ts`
- Modify: `packages/chess-core/src/srs/types.ts` if needed
- Modify: `packages/chess-core/package.json` — add `ts-fsrs` dependency
- Modify: `packages/chess-core/src/index.ts` — export `createFsrsScheduler`, `createInitialFsrsProgress`, `masteryPercentFromProgress`

**Interfaces:**
```ts
// Additional fields on PositionProgress (keep mastery as derived display 0-100):
fsrsStability: number;
fsrsDifficulty: number;
fsrsElapsedDays: number;
fsrsScheduledDays: number;
fsrsReps: number;
fsrsLapses: number;
fsrsState: number; // ts-fsrs State enum as number
fsrsLastReview: string | null; // ISO

createInitialFsrsProgress(pathKey: PathKey, now?: Date): PositionProgress
createFsrsScheduler(): MasteryScheduler
masteryPercentFromProgress(progress: PositionProgress, now?: Date): number // 0-100 from retrievability
migrateLightweightToFsrs(progress: PositionProgress, now?: Date): PositionProgress
```

- Correct → FSRS Grade.Good (or Easy if streak high — use Good for correct, Again for incorrect; keep simple)
- Incorrect → Grade.Again
- `nextReviewAt` / display due = card.due
- `mastery` field = `masteryPercentFromProgress` result for dashboard compat

- [ ] **Step 1:** Add dependency `ts-fsrs`, write failing tests for onCorrect/onIncorrect due movement and migrate helper
- [ ] **Step 2:** Implement scheduler + initial + migrate
- [ ] **Step 3:** Update `createInitialProgress` to use FSRS or re-export alias
- [ ] **Step 4:** Tests pass; deprecate lightweight writes (queue sort may use FSRS `compareDue`)
- [ ] **Step 5:** Commit `feat(chess-core): FSRS MasteryScheduler`

---

### Task 2: DB columns + one-shot migration SQL

**Files:**
- Create: `supabase/migrations/20260821140000_fsrs_progress.sql`

```sql
alter table public.position_progress
  add column if not exists fsrs_stability double precision not null default 0,
  add column if not exists fsrs_difficulty double precision not null default 0,
  add column if not exists fsrs_elapsed_days double precision not null default 0,
  add column if not exists fsrs_scheduled_days double precision not null default 0,
  add column if not exists fsrs_reps integer not null default 0,
  add column if not exists fsrs_lapses integer not null default 0,
  add column if not exists fsrs_state integer not null default 0,
  add column if not exists fsrs_last_review timestamptz;

-- One-shot: set due_at unchanged; seed FSRS from mastery bands via simple defaults
-- (stability/difficulty from ts-fsrs New card + optional fake reviews in app migration preferred)
-- Prefer app-side migrate on read OR SQL defaults for New state with due_at preserved.
```

Also replace `apply_training_result` / `apply_training_result_and_checkpoint` to **accept precomputed progress fields** from service role (no ±8 math), OR add `upsert_progress_and_checkpoint` that writes full row.

Recommended RPC shape:
```sql
apply_training_result_and_checkpoint(
  p_user_id uuid,
  p_study_id uuid,
  p_session_id uuid,
  p_path_key text,
  p_correct boolean,
  p_progress jsonb,  -- full scheduled row from server TS
  p_checkpoint jsonb,
  p_updated_at timestamptz
) returns jsonb
```
Validate ownership; write progress fields from jsonb; update checkpoint; return row.

- [ ] Write migration; apply to remote; commit `feat(db): FSRS columns and TS-authored progress RPC`

---

### Task 3: Wire web training to FSRS (server TS)

**Files:**
- Modify: `apps/web/lib/actions/training-helpers.ts` — `progressFromRow` / `progressToRow` include FSRS; `scorePositionAndSave` uses `createFsrsScheduler`
- Modify: `apps/web/lib/actions/training.ts`
- Modify: `apps/web/lib/actions/training*.test.ts`
- Modify: dashboard mastery display if it reads `mastery` column (ensure derived on write)

Flow:
1. Load existing progress or `createInitialFsrsProgress`
2. `scheduler.onCorrect` / `onIncorrect`
3. Increment attempts/correct/streak in TS
4. Pass full progress JSON to RPC
5. Queue sort via FSRS `compareDue`

- [ ] Tests with mocked RPC asserting FSRS fields in payload
- [ ] Commit `feat(web): apply Practice/Learn results via FSRS on server`

---

### Task 4: Remove lightweight schedule authority leftovers

**Files:**
- SQL RPCs must not compute ±8/±15 anymore (Task 2)
- Delete or stub `createLightweightScheduler` usage for writes; keep file only if tests need migrate path
- Update docs/README if it mentions lightweight bands

- [ ] Grep for `correctMasteryDelta`, `intervalsMsByBand`, `mastery + 8`
- [ ] Tests green; commit `refactor: remove lightweight SRS write path`

---

## Spec coverage

| Requirement | Task |
|-------------|------|
| FSRS sole scheduler | 1–4 |
| Migrate existing | 1 migrate + 2 SQL |
| Server TS scoring | 3 |
| Due queue | 3 |
| Mastery % derived | 1 + 3 |
