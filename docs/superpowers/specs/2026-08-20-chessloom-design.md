# Chessloom — Design Spec (MVP)

**Date:** 2026-08-20  
**Status:** Approved (design sections 1–5 + follow-up adjustments)  
**Product:** Chessloom — opening repertoire training web app  
**Repo:** GitHub (open-source source of truth)  
**Deploy:** Vercel (CI/CD + production)

---

## 1. Product summary

Chessloom turns an imported opening repertoire (PGN) into an interactive Learn → Practice → Review loop. The imported repertoire is the **source of truth**. The app never uses LLMs to decide chess correctness, invent theory, explain moves, or replace repertoire moves. Deterministic chess logic (`chess.js` via an isolated `chess-core` package) owns parsing, legality, and repertoire matching. Stockfish is explicitly out of scope for MVP.

**Primary audience:** Club / intermediate players  
**Primary use case:** Import a repertoire → learn lines → practice recall → review weak/due positions  
**Tone:** Technical premium (modern chess SaaS) — dark-forward with light mode, board-centric, restrained motion, minimal clutter

**Product loop (MVP):** Import → Parse → Organize → Learn → Recall (Practice) → Review → Master

---

## 2. Scope

### 2.1 In scope (MVP)

- Real authentication: email/password + Google OAuth (architecture ready for more OAuth providers)
- Password reset, login, logout, persistent multi-device data (Supabase)
- Import via **raw PGN paste** and **PGN file upload**
- PGN as variation trees (chapters, variations, comments, NAGs, headers, starting FENs)
- Learn mode (guided walkthrough)
- Practice mode (user must play repertoire moves)
- Side modes: White, Black, Both, Random
- Lightweight mastery / spaced-repetition scheduler (config-driven; FSRS-ready later)
- Dashboard: openings, mastery, due positions, weak variations, activity/streak
- Study lifecycle: rename, delete, reimport (transactional + progress reconciliation)
- Training session checkpoint persistence (survive refresh/close of browser tab)
- Dark/light themes, responsive UI, keyboard shortcuts
- Dedicated motion + toast systems with `prefers-reduced-motion`
- GitHub + Vercel deployment
- Strong typing; heavy automated tests for chess-critical domain logic

### 2.2 Out of scope (phase 2+)

- Lichess Study URL import
- Random Test mode
- Full Repertoire Test mode
- FSRS / SM-2 full algorithms (replace lightweight scheduler later)
- Stockfish / engine analysis
- Full offline support
- Social features, public repertoire sharing
- Native mobile apps
- AI annotations or move explanations

### 2.3 Hard constraints (non-negotiable)

- Do **not** flatten variations into linear-only games as the stored model
- Do **not** require manual flashcards/lessons/annotations to train
- Do **not** use AI for chess correctness
- Do **not** silently replace repertoire moves with engine moves
- Do **not** trust client-sent mastery/progress values — server validates moves and updates SRS
- Incorrect Practice feedback must **not** immediately dump all expected moves when multiple branches exist; start with “Not in your repertoire,” then optional reveal

---

## 3. Architecture

### 3.1 Chosen approach

**Next.js App Router monolith + Supabase + isolated domain package**

| Layer | Responsibility |
|-------|----------------|
| Next.js (Vercel) | UI, routing, server actions / route handlers, auth middleware |
| Supabase | Auth, Postgres, RLS, Storage (large PGNs) |
| `packages/chess-core` | Pure TS: PGN → tree, repertoire matching, training state machines, SRS updates (no React, no Supabase, no Next) |

**Data path (correctness):**

```
Board input → server action → chess-core (validate vs stored tree) → compute progress/SRS → Postgres
```

Never:

```
Board → frontend decides correctness / invents mastery
```

### 3.2 Repository layout (target)

```
apps/web/                 # or repo-root Next.js app — prefer monorepo if tooling is light
packages/chess-core/      # pure domain + unit tests
supabase/                 # migrations, seed, config
docs/superpowers/specs/   # this document
docs/superpowers/plans/   # implementation plans
```

Implementation may use a single Next.js root with `src/lib/chess-core` **only if** the package boundary remains importable and testable without Next. Prefer a real package (`packages/chess-core`) so domain work stays independent of UI.

### 3.3 Hosting & CI

- **GitHub:** canonical open-source repository
- **Vercel:** preview deployments on PRs; production from `main`
- Secrets only in Vercel / Supabase dashboards (never committed)
- License-friendly board stack: `react-chessboard` (MIT) + `chess.js` — not Lichess Chessground (GPL-3.0)

---

## 4. Authentication & accounts

### 4.1 Providers

- Email/password (sign up, login, logout)
- Google OAuth
- Password reset via Supabase recovery email
- Provider list is configuration — additional OAuth providers later without schema redesign

### 4.2 Session model

- `@supabase/ssr` cookie-based sessions
- Next.js middleware protects authenticated app routes (`/app/*` or equivalent)
- `profiles` row upserted on first authenticated session (theme, default side mode, optional display name, streak fields)

### 4.3 Multi-device

- All studies and progress live in Postgres under RLS
- No offline-first sync in MVP
- Users resume training across devices via server state + session checkpoints (see §7)

---

## 5. Data model

### 5.1 Domain concepts (`chess-core`)

| Concept | Definition |
|---------|------------|
| Study | Imported repertoire unit (title, source type, metadata) |
| Chapter | One PGN game/chapter (headers, starting FEN, root node) |
| Node | Position after a move from parent; SAN/UCI, FEN, comments, NAGs, sibling order |
| Variation tree | Parent→child edges; siblings = alternatives — **not** a flattened game |

### 5.2 Identity & reimport matching

- **`node_id`:** UUID generated at import (row primary key)
- **`path_key`:** Deterministic signature of the node’s identity within a study/chapter (e.g. chapter index + move path from root, or hash of starting FEN + UCI path). Used to match nodes across reimports
- Do **not** rely solely on `(chapter_id, fen, uci)` — chapter IDs change on reimport

### 5.3 Progress identity

`position_progress` is keyed by **`user_id` + `study_id` + `path_key`** (and chapter identity as needed inside `path_key`). Progress belongs to a study’s logical positions, not to ephemeral node UUIDs alone.

### 5.4 Postgres tables (logical)

| Table | Purpose |
|-------|---------|
| `profiles` | `id` → `auth.users`; prefs; activity streak |
| `studies` | owner, title, source_type (`pgn_paste` \| `pgn_upload`), status, storage pointer and/or inline PGN ref, timestamps |
| `chapters` | study_id, title, chapter_index, headers JSON, starting_fen |
| `nodes` | chapter_id, parent_id, node_id UUID, path_key, fen, san, uci, ply, comment, nags[], sibling_order |
| `position_progress` | user_id, study_id, path_key, attempts, correct_count, streak, mastery, last_reviewed_at, next_review_at |
| `training_sessions` | user_id, study_id, mode (`learn` \| `practice`), side_mode, checkpoint JSON, status, started_at, updated_at, ended_at |
| Storage bucket | Large raw PGN files; DB holds path + checksum/size |

All user data tables: **RLS** so only the owning `auth.uid()` can read/write. Chapters/nodes accessible only through owned studies.

### 5.5 Raw PGN

- Always retain original PGN for audit/reimport
- Small pastes may live in DB text; **large uploads go to Supabase Storage** with a DB pointer
- Never treat raw PGN as the runtime training structure — normalized tree is what Learn/Practice use

### 5.6 Reimport

1. Parse new PGN fully in `chess-core` (fail closed on parse error — no partial write)
2. **Transactionally** replace chapters/nodes for the study
3. Reconcile `position_progress` by `path_key`: keep matches; remove unmatched progress for that study
4. Failed import must leave the previous study tree intact

---

## 6. Training engine (`chess-core`)

### 6.1 Repertoire matcher

`isRepertoireMove(node, move) → { ok: true, child } | { ok: false, expected: Node[] }`

- Legal but off-book ⇒ training-incorrect
- Copy must stay repertoire-relative (never “blunder,” never engine judgment)

### 6.2 Learn mode

1. Start from chapter root (or resumed checkpoint)
2. Opponent turns (relative to training side): auto-play repertoire move(s)
3. User turns: await move; on correct, advance; show PGN comments when available (after advance or on reveal — UX detail in plan)
4. Multiple children: navigate/select among repertoire branches (mainline = lowest `sibling_order`)
5. Back/forward along visited path

### 6.3 Practice mode

1. Present position from queue (due / weak / line sequence)
2. User plays a move
3. **Correct** → continue; server updates progress
4. **Incorrect** → show **“Not in your repertoire.”** Do **not** list all expected moves immediately when multiple branches exist. Provide **Show expected move(s)** to reveal. Offer Retry / continue after reveal

### 6.4 Side modes

- **White / Black:** user always that color; opponent moves auto-played from repertoire
- **Both:** per chapter or alternating (default documented in implementation plan)
- **Random:** per-session coin flip by default (configurable later)

### 6.5 Server authority

Server actions receive proposed move + session/study identifiers, load stored tree, run `chess-core`, then write progress. Clients may do optimistic UI but **authoritative result is server-computed**.

---

## 7. Lightweight SRS

### 7.1 Tracked fields (per study + path_key)

- attempts  
- correct_count (accuracy = correct_count / attempts)  
- streak  
- mastery (0–100)  
- last_reviewed_at  
- next_review_at  

### 7.2 Pluggable scheduler

Do **not** hardcode `+8` / `-15` / interval tables inside the training state machine.

```ts
interface MasteryScheduler {
  onCorrect(progress: PositionProgress): PositionProgress
  onIncorrect(progress: PositionProgress): PositionProgress
  compareDue(a: PositionProgress, b: PositionProgress): number
}
```

Default MVP implementation: simple mastery deltas + interval bands. Swappable for FSRS later without rewriting Learn/Practice.

### 7.3 Queue priority

1. `next_review_at <= now`  
2. Then lowest mastery  
3. Then least recently reviewed  

New positions: due immediately, mastery 0.

### 7.4 Dashboard

- Studies with mastery summary  
- Positions due count  
- Weak variations  
- Activity / streak  

---

## 8. Session checkpoint persistence

Full offline is out of scope. **In scope:** survive tab close/refresh without unexpectedly losing an active session.

**Minimum checkpoint contents:**

- active `study_id`, `chapter_id` / chapter index  
- mode (`learn` | `practice`) and side mode  
- current `path_key` (or node path)  
- Learn: visited path stack / ply index  
- Practice: queue snapshot or cursor + seed if needed  
- UI flags safe to restore (e.g. whether expected moves were revealed for current card)

**Storage:** `training_sessions.checkpoint` JSON updated at meaningful checkpoints (after each resolved move / advance), `updated_at` touched server-side. On load, resume if `status = active` and study still exists.

Discard or mark abandoned sessions older than a documented TTL (implementation plan chooses a concrete TTL, e.g. 7–30 days).

---

## 9. UI / UX

### 9.1 Visual direction

- Technical premium chess SaaS  
- Dark-forward default + first-class light mode  
- Precise typography; board as visual centerpiece  
- Subtle surfaces where appropriate; no flashy “AI startup” aesthetics  
- Strong hierarchy, generous spacing, minimal clutter  
- Genre alignment: modern-minimal (Hallmark)

### 9.2 MVP screens

| Screen | Purpose |
|--------|---------|
| Landing | Brand + primary CTA |
| Auth | Login / signup / reset; Google + email |
| Dashboard | Studies, due, weak, streak |
| Import | Paste + upload; progress + errors |
| Study detail | Chapters; Learn/Practice; rename/delete/reimport |
| Learn | Board + branch nav + comments |
| Practice | Board + feedback + reveal/retry |
| Settings | Theme, defaults, account |

Responsive: desktop board + panel; mobile board-first + drawers.

### 9.3 Keyboard (non-exhaustive)

Arrows back/forward; Esc closes overlays; R retry; Space/Enter continue/reveal where safe. Keyboard-initiated repeats must not trigger heavy celebration animations (motion frequency gate).

---

## 10. Motion & toasts

### 10.1 Designer weighting

- **Primary:** Jakub Krehel (production polish)  
- **Secondary:** Emil Kowalski (restraint, frequency gate)  
- **Selective:** Jhey Tompkins (import success, session complete, streak milestones only)

Library: Motion (Framer Motion) where useful; CSS for simple cases.

### 10.2 Rules

- Animate `transform` / `opacity` (and filter if needed) only  
- UI transitions ~180–320ms; no bounce on high-frequency chess input  
- `prefers-reduced-motion: reduce` → ≤150ms opacity or instant  
- Route transitions light; keep board stable within training flows  
- Staggered dashboard entrances (once); modal/drawer polish; progress bars via scale; number tweens for mastery  
- Correct/incorrect feedback short and clear; no spam on rapid retries  

### 10.3 Toast system

Centralized toasts for: study imported; PGN parse failed; opening deleted; settings saved; training session completed; correct/incorrect (optional quiet); review completed; auth events; network/server errors.

---

## 11. Testing strategy

### 11.1 `chess-core` (required, heavy)

- Nested variations, comments, NAGs, headers  
- Non-standard starting FEN, castling, en passant, promotions  
- Repertoire match / mismatch  
- Learn/Practice state transitions  
- Scheduler interface behavior (default impl)  
- path_key stability across equivalent trees  
- Checkpoint serialize/deserialize round-trip  

### 11.2 App layer

- Auth route guards (smoke)  
- Server actions reject forged mastery payloads  
- Reimport transaction + progress reconciliation integration tests where practical  

### 11.3 Explicit non-goals for tests

- Pixel-perfect UI snapshots as a substitute for domain tests  
- LLM-based chess fixtures  

---

## 12. Security

- RLS on all user-owned tables  
- Server validates every training move against stored repertoire via `chess-core`  
- Server computes mastery/SRS; ignore client-supplied progress numbers  
- Service role key never exposed to the browser  
- OAuth redirect allowlists for local, preview, and production  
- Open-source repo: no secrets in git  

---

## 13. Environment & configuration

| Variable (illustrative) | Purpose |
|-------------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only if needed for admin tasks |
| Google OAuth client | Configured in Supabase Auth providers |

Vercel project linked to GitHub; preview env vars mirror production where safe.

---

## 14. Success criteria (MVP done)

A user can:

1. Create an account (email or Google) and log in on two devices  
2. Paste or upload a multi-variation PGN and see study/chapters organized  
3. Complete a Learn walkthrough including a side branch and a PGN comment  
4. Practice positions with server-validated scoring and “Not in your repertoire” → reveal flow  
5. See due/weak/mastery on the dashboard  
6. Refresh mid-session and resume from checkpoint  
7. Rename, delete, and reimport a study without corrupting matched progress  

---

## 15. Decisions log

| Decision | Choice |
|----------|--------|
| Scope | Vertical MVP (phase Lichess URL / Random / Full Test later) |
| Backend | Supabase Auth + Postgres + Storage |
| Auth | Email/password + Google OAuth; extensible |
| Framework | Next.js App Router + TypeScript + Tailwind |
| Board | `react-chessboard` + `chess.js` |
| Audience | Club / intermediate |
| Visual tone | Technical premium |
| SRS | Lightweight, pluggable scheduler interface |
| Architecture | Approach 1 — monolith + `chess-core` package |
| Source control / deploy | GitHub + Vercel |
| Motion weighting | Jakub · Emil · selective Jhey |
| UI primitives | shadcn/ui (Radix) + Sonner toasts; compose product chrome from shadcn, keep board/training surfaces custom |

---

## 16. Spec self-review (2026-08-20)

- [x] No TBD/TODO placeholders left for MVP-critical behavior  
- [x] Architecture matches feature descriptions (server-authoritative training)  
- [x] Scope is a single MVP plan (phase 2 explicitly carved out)  
- [x] Ambiguities resolved: progress keyed by study+path_key; Practice reveal UX; SRS pluggable; checkpoints required; Storage for large PGN  
- [x] Remaining implementation knobs (exact path_key algorithm, Both-mode default, checkpoint TTL, monorepo vs single package path) deferred to implementation plan with a single concrete pick each  

---

*End of design spec.*
