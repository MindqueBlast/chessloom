# Chessloom — Phase 2 Design Spec

**Date:** 2026-08-21  
**Status:** Draft for review (design sections approved in chat)  
**Product:** Chessloom — opening repertoire training web app  
**Parent:** `docs/superpowers/specs/2026-08-20-chessloom-design.md` (MVP)

---

## 1. Summary

Phase 2 extends the shipped MVP without changing the core principle: **the imported repertoire remains the source of truth**. No LLM chess correctness. No engine grading of Practice. Deterministic `chess-core` still owns parsing, matching, and training state.

**Delivery order (sequential vertical slices):**

1. Lichess Study URL import (public studies) + URL reimport  
2. FSRS as the sole mastery scheduler  
3. Random Test + Full Repertoire Test modes  
4. In-browser Stockfish WASM analysis (optional, non-authoritative)

**Delivery approach:** Approach 1 — sequential shippable slices (not a single big-bang branch).

---

## 2. Hard constraints (unchanged + Phase 2)

From MVP, still non-negotiable:

- Do not flatten variation trees  
- Do not use AI for chess correctness  
- Do not silently replace repertoire moves with engine moves  
- Do not trust client-sent mastery/progress — server validates moves and owns scoring  
- Practice incorrect copy starts with exact **“Not in your repertoire.”** then optional reveal  

Phase 2 additions:

- Stockfish must never auto-play into the repertoire or score Practice/tests  
- Lichess import is public-only in this phase (no Lichess OAuth)  
- FSRS replaces lightweight scheduling entirely (no dual-scheduler settings toggle)

---

## 3. Slice 1 — Lichess Study URL import

### 3.1 Goals

- User pastes a **public** Lichess Study URL on Import.  
- Server fetches study PGN, parses via existing `chess-core`, creates a normal study tree.  
- User can **reimport** later from the same stored URL (transactional replace + `path_key` progress reconcile).

### 3.2 Behavior

| Action | Behavior |
|--------|----------|
| Import URL | Validate URL shape → fetch public export → parse → `import_study` RPC (same chapter/node write path as PGN) |
| Source | `studies.source_type = 'lichess_study'`; store canonical URL + Lichess study id |
| Reimport | On Lichess studies, Reimport refetches URL (no file required); same reconcile rules as PGN reimport |
| Failures | Private/404/rate-limit/parse → fail closed; toast; no partial write |

### 3.3 Non-goals

- Private studies / Lichess OAuth  
- Chapter cherry-picking  
- Live sync / webhooks  
- Changing paste/upload flows except adding URL field

### 3.4 UI

- Import screen: URL field alongside paste + upload (existing visual language).  
- Study detail: show source badge “Lichess study”; Reimport available.

### 3.5 Success criteria

1. Public study URL imports chapters/variations usable in Learn/Practice.  
2. Reimport from URL refreshes tree and keeps matched `path_key` progress.  
3. Invalid/private URL never corrupts an existing study.

---

## 4. Slice 2 — FSRS scheduler

### 4.1 Goals

- Replace lightweight mastery deltas with **FSRS** as the only `MasteryScheduler`.  
- Keep Practice queue semantics: due first, then weakest, then least recent.  
- Dashboard still shows a **mastery %** (derived), plus due counts / streak.

### 4.2 Behavior

- Implement FSRS in `chess-core` (e.g. `ts-fsrs`) behind `MasteryScheduler`.  
- Extend `position_progress` with FSRS card fields (stability, difficulty, reps, lapses, state, due, last_review, etc.).  
- Retain `attempts`, `correct_count`, `streak` for stats.  
- **Mastery %** = derived display (from retrievability or stable mapping), not ±8/±15.  
- **Migration:** one-shot map existing rows → FSRS cards with sensible defaults from current mastery/due.  
- **Server authority:** schedule updates computed in TS on the server (training actions / service path), not hardcoded interval SQL.

### 4.3 Non-goals

- User-tunable FSRS parameters  
- SM-2 parallel path  
- Per-user or per-study scheduler toggle  
- Leaving old rows on lightweight forever

### 4.4 Success criteria

1. Correct/incorrect Practice updates FSRS due dates.  
2. Dashboard due queue matches FSRS `due`.  
3. Post-migration, existing users can continue training without manual reset.

---

## 5. Slice 3 — Random Test & Full Repertoire Test

### 5.1 Goals

Two new session modes that reuse Practice board UX (immediate move commit, incorrect copy, reveal/retry, Continue).

### 5.2 Shared

| Item | Choice |
|------|--------|
| Modes | `random_test`, `full_test` |
| Side | White / Black / Both / Random (coin-flip once per session) |
| Scoring | Server-validated; **updates FSRS progress** (real reviews) |
| End screen | Accuracy, correct/incorrect counts, weak positions |

### 5.3 Random Test

- Queue size **N** (default **20**, clamp **5–50**).  
- Sample unique trainable user-to-move positions for the side; prefer due/weak; fill randomly if needed.  
- Ends when queue exhausted.

### 5.4 Full Repertoire Test

- Queue = **all** trainable user-to-move positions for the side.  
- Order: chapter index → path (deterministic).  
- Progress: `k / total`; checkpoints resume cursor.  
- Incorrect: Retry stays on card; Continue advances after resolution.  
- Complete when every card answered once.

### 5.5 Non-goals

- Timed bullet modes  
- Adaptive mid-test branching  
- Multiplayer  

### 5.6 Success criteria

1. Random Test produces N unique cards and a summary.  
2. Full Test covers every trainable position for the side.  
3. Both modes never grade against Stockfish.

---

## 6. Slice 4 — Stockfish WASM analysis

### 6.1 Goals

Optional engine **analysis** for curiosity — never repertoire authority.

### 6.2 Behavior

- Toggle **Analysis** (off by default) on Learn, Practice, and study training surfaces.  
- Stockfish runs **in-browser WASM** (no server engine).  
- UI: eval bar + principal variation; capped default depth; light depth control.  
- Respect `prefers-reduced-motion`.  
- Copy: “Engine eval” — not “correct move.”

### 6.3 Hard rules

- Never auto-play engine moves into the line  
- Never score Practice / Random / Full tests against Stockfish  
- Never rewrite imported repertoire from engine suggestions  

### 6.4 Non-goals

- Cloud Stockfish  
- Opening books  
- Multi-PV analysis farm  
- Engine-vs-repertoire quizzes  

### 6.5 Success criteria

1. User can toggle analysis and see eval/PV without blocking training.  
2. Turning analysis on never changes repertoire data or Practice scoring.  
3. Reduced-motion users get non-flashy updates.

---

## 7. Data / schema sketch (implementation plan will detail)

| Area | Change |
|------|--------|
| `studies.source_type` | Add `lichess_study`; columns for URL + external id |
| `position_progress` | FSRS fields + migration |
| `training_sessions.mode` | Add `random_test`, `full_test` |
| Checkpoints | Extend for test queues / N / cursor |

RLS and server validation patterns remain as MVP.

---

## 8. Testing strategy

- **chess-core:** FSRS scheduler unit tests; Random/Full queue builders; Lichess URL parse helpers (no network in unit tests)  
- **App:** Lichess fetch mocked; import/reimport fail-closed; training modes reject forged progress  
- **Explicit non-goals:** pixel snapshots as substitute for domain tests; live Lichess/private study CI without fixtures  

---

## 9. Decisions log

| Decision | Choice |
|----------|--------|
| Order | Lichess → FSRS → Random/Full Test → Stockfish |
| Delivery | Sequential vertical slices |
| Lichess scope | Public only; new study + URL reimport |
| Test modes | Random = N sample; Full = all trainable positions |
| Test scoring | Updates FSRS (real reviews) |
| FSRS | Sole scheduler; migrate existing progress |
| Stockfish | Browser WASM; optional; never repertoire authority |
| Visual identity | Preserve current Chessloom UI; motion polish already shipped |

---

## 10. Out of Phase 2 (still later)

- Full offline  
- Social / public sharing  
- Native apps  
- AI annotations  
- Private Lichess studies  
- Server-side Stockfish  

---

## 11. Review checklist

- [x] Scope broken into four shippable slices  
- [x] Hard constraints preserved  
- [x] No placeholder APIs left unnamed without “implementation chooses”  
- [x] Stockfish cannot override repertoire  
- [ ] User review of this file before implementation plan  

---

**Next step after approval of this file:** write `docs/superpowers/plans/2026-08-21-chessloom-phase2.md` and implement slice-by-slice (starting with Lichess).
