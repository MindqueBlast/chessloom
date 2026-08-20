# Chessloom MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Chessloom MVP — import PGN repertoires as variation trees, Learn + Practice with server-authoritative scoring, lightweight pluggable SRS, Supabase auth (email + Google), checkpointed sessions, technical-premium UI (shadcn/ui + Motion), deployed via GitHub → Vercel.

**Architecture:** pnpm monorepo with `packages/chess-core` (pure TS, heavily tested) and `apps/web` (Next.js App Router + Supabase + shadcn/ui). Server actions validate moves with chess-core and write progress; clients never author mastery.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui (Radix) + Sonner, Motion, react-chessboard, chess.js, @mliebelt/pgn-parser, Supabase (Auth/Postgres/Storage/RLS), Vitest for chess-core, Playwright smoke optional later, Vercel.

## Global Constraints

- Repertoire is source of truth — no LLM chess correctness
- Server validates moves + computes SRS; ignore client mastery payloads
- Practice incorrect: copy “Not in your repertoire.”; reveal expected moves only on demand
- `path_key` = `c{chapterIndex}:{uci/uci/...}` from chapter root (empty path `c{n}:` for root)
- Progress key: `(user_id, study_id, path_key)`
- Large PGN → Supabase Storage; small paste may be inline
- Reimport: transactional replace + path_key progress reconciliation
- Checkpoint TTL: **14 days**
- Side mode **Both**: user plays every repertoire ply (both colors); opponent auto-play disabled
- Side mode **Random**: coin-flip White/Black once per session at start
- UI chrome: **shadcn/ui**; board/training feedback: custom; toasts: **Sonner** via shadcn
- Motion: Jakub primary · Emil secondary · selective Jhey; `prefers-reduced-motion` everywhere
- MIT-friendly board (`react-chessboard`); no Chessground
- Open-source GitHub repo; secrets only in Vercel/Supabase env

---

## File structure (create as tasks proceed)

```
Chessloom/
  package.json                 # pnpm workspaces
  pnpm-workspace.yaml
  turbo.json                   # optional; skip if unused
  .gitignore
  README.md
  docs/superpowers/specs/2026-08-20-chessloom-design.md
  docs/superpowers/plans/2026-08-20-chessloom-mvp.md
  packages/chess-core/
    package.json
    tsconfig.json
    vitest.config.ts
    src/
      index.ts
      types.ts
      path-key.ts
      pgn/parse.ts
      tree/build.ts
      tree/match.ts
      training/learn.ts
      training/practice.ts
      training/checkpoint.ts
      srs/types.ts
      srs/lightweight.ts
    src/**/*.test.ts
  apps/web/
    package.json
    next.config.ts
    tsconfig.json
    components.json            # shadcn
    middleware.ts
    app/
      layout.tsx
      page.tsx                   # landing
      (auth)/login/page.tsx
      (auth)/signup/page.tsx
      (auth)/forgot-password/page.tsx
      auth/callback/route.ts
      (app)/layout.tsx           # authenticated shell
      (app)/dashboard/page.tsx
      (app)/import/page.tsx
      (app)/studies/[studyId]/page.tsx
      (app)/studies/[studyId]/learn/page.tsx
      (app)/studies/[studyId]/practice/page.tsx
      (app)/settings/page.tsx
    components/
      ui/                        # shadcn
      chess/ChessBoard.tsx
      chess/BoardFrame.tsx
      training/LearnView.tsx
      training/PracticeView.tsx
      training/FeedbackBanner.tsx
      studies/StudyCard.tsx
      import/ImportForm.tsx
      motion/PageTransition.tsx
      providers/AppProviders.tsx
      layout/AppSidebar.tsx
      layout/ThemeToggle.tsx
    lib/
      supabase/client.ts
      supabase/server.ts
      supabase/middleware.ts
      actions/auth.ts
      actions/studies.ts
      actions/training.ts
      motion/tokens.ts
      utils.ts
    supabase/                    # or repo-root supabase/
  supabase/
    config.toml
    migrations/0001_init.sql
```

---

### Task 1: Monorepo scaffold + chess-core package skeleton

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `README.md`
- Create: `packages/chess-core/package.json`, `packages/chess-core/tsconfig.json`, `packages/chess-core/vitest.config.ts`, `packages/chess-core/src/index.ts`, `packages/chess-core/src/types.ts`

**Interfaces:**
- Produces: workspace runnable with `pnpm --filter @chessloom/chess-core test`

- [ ] **Step 1: Create root workspace files**

`package.json`:
```json
{
  "name": "chessloom",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "pnpm --filter @chessloom/web dev",
    "build": "pnpm --filter @chessloom/chess-core build && pnpm --filter @chessloom/web build",
    "test": "pnpm --filter @chessloom/chess-core test",
    "lint": "pnpm --filter @chessloom/web lint"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`.gitignore`:
```
node_modules
.next
dist
.env
.env.local
.turbo
coverage
*.log
.DS_Store
```

- [ ] **Step 2: Create `packages/chess-core` package.json**

```json
{
  "name": "@chessloom/chess-core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@mliebelt/pgn-parser": "^1.4.15",
    "chess.js": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 3: Add tsconfig + vitest + types stub**

`packages/chess-core/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`packages/chess-core/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

`packages/chess-core/src/types.ts`:
```ts
export type Uci = string;
export type San = string;
export type Fen = string;
export type PathKey = string;

export type Nag = number;

export interface TreeNode {
  id: string;
  pathKey: PathKey;
  fen: Fen;
  san: San | null;
  uci: Uci | null;
  ply: number;
  comment: string | null;
  nags: Nag[];
  children: TreeNode[];
}

export interface ChapterTree {
  index: number;
  title: string;
  headers: Record<string, string>;
  startingFen: Fen;
  root: TreeNode;
}

export interface StudyTree {
  title: string;
  chapters: ChapterTree[];
}

export interface PositionProgress {
  pathKey: PathKey;
  attempts: number;
  correctCount: number;
  streak: number;
  mastery: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
}

export type SideMode = "white" | "black" | "both" | "random";
export type SessionMode = "learn" | "practice";
```

`packages/chess-core/src/index.ts`:
```ts
export * from "./types.js";
```

- [ ] **Step 4: Install and verify empty test run**

Run:
```bash
cd C:\Users\aadit\Projects\Chessloom
pnpm install
pnpm --filter @chessloom/chess-core test
```
Expected: Vitest runs 0 tests (or exits 0 with no tests — if Vitest fails on zero tests, add a trivial `src/smoke.test.ts` asserting `1+1===2`, then remove in Task 2).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore packages/chess-core README.md
git commit -m "chore: scaffold pnpm workspace and chess-core package"
```

---

### Task 2: path_key + PGN parse → variation tree

**Files:**
- Create: `packages/chess-core/src/path-key.ts`, `packages/chess-core/src/path-key.test.ts`
- Create: `packages/chess-core/src/pgn/parse.ts`, `packages/chess-core/src/pgn/parse.test.ts`
- Create: `packages/chess-core/src/tree/build.ts`
- Modify: `packages/chess-core/src/index.ts`

**Interfaces:**
- Produces: `buildPathKey(chapterIndex, uciPath: string[]): PathKey`
- Produces: `parsePgnToStudy(pgn: string): StudyTree` (throws `PgnParseError`)

- [ ] **Step 1: Write failing path_key tests**

```ts
// packages/chess-core/src/path-key.test.ts
import { describe, expect, it } from "vitest";
import { buildPathKey } from "./path-key.js";

describe("buildPathKey", () => {
  it("encodes chapter root", () => {
    expect(buildPathKey(0, [])).toBe("c0:");
  });

  it("joins uci path", () => {
    expect(buildPathKey(1, ["e2e4", "e7e5", "g1f3"])).toBe("c1:e2e4/e7e5/g1f3");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @chessloom/chess-core test
```
Expected: FAIL cannot find module `./path-key.js` or `buildPathKey` undefined

- [ ] **Step 3: Implement path_key**

```ts
// packages/chess-core/src/path-key.ts
import type { PathKey } from "./types.js";

export function buildPathKey(chapterIndex: number, uciPath: string[]): PathKey {
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0) {
    throw new Error(`Invalid chapterIndex: ${chapterIndex}`);
  }
  return `c${chapterIndex}:${uciPath.join("/")}`;
}
```

- [ ] **Step 4: Write failing PGN parse tests**

```ts
// packages/chess-core/src/pgn/parse.test.ts
import { describe, expect, it } from "vitest";
import { parsePgnToStudy } from "./parse.js";

const VARIATION_PGN = `[Event "Test"]
[White "W"]
[Black "B"]

1. e4 e5 2. Nf3 (2. Nc3 Nf6) 2... Nc6 *`;

describe("parsePgnToStudy", () => {
  it("preserves a side variation as a sibling child", () => {
    const study = parsePgnToStudy(VARIATION_PGN);
    expect(study.chapters).toHaveLength(1);
    const root = study.chapters[0]!.root;
    const e4 = root.children.find((c) => c.san === "e4");
    expect(e4).toBeTruthy();
    const e5 = e4!.children.find((c) => c.san === "e5");
    const afterE5 = e5!;
    const seconds = afterE5.children;
    const sans = seconds.map((c) => c.san).sort();
    expect(sans).toEqual(["Nc3", "Nf3"].sort());
  });

  it("assigns stable path_keys along mainline", () => {
    const study = parsePgnToStudy(`1. e4 e5 *`);
    const e4 = study.chapters[0]!.root.children[0]!;
    expect(e4.pathKey).toBe("c0:e2e4");
    expect(e4.children[0]!.pathKey).toBe("c0:e2e4/e7e5");
  });

  it("keeps comments on nodes when present", () => {
    const study = parsePgnToStudy(`1. e4 {Best by test} e5 *`);
    const e4 = study.chapters[0]!.root.children[0]!;
    expect(e4.comment).toMatch(/Best by test/);
  });

  it("throws on empty input", () => {
    expect(() => parsePgnToStudy("")).toThrow();
  });
});
```

- [ ] **Step 5: Implement parse + tree build**

Use `@mliebelt/pgn-parser` `parse` / `ParseTree`, walk moves recursively, apply each move with `chess.js` `Chess` from starting FEN (default startpos), attach SAN/UCI/FEN/comment/NAGs, set `id` via `crypto.randomUUID()` (Node 20+) at build time, set `pathKey` via `buildPathKey`.

Multi-game PGN → multiple chapters (`index` 0..n-1). Study title from first `[Event]` or `"Untitled study"`.

Export `PgnParseError` class with message.

Wire exports in `index.ts`.

- [ ] **Step 6: Run tests — expect PASS**

```bash
pnpm --filter @chessloom/chess-core test
```

- [ ] **Step 7: Commit**

```bash
git add packages/chess-core
git commit -m "feat(chess-core): parse PGN into variation trees with path keys"
```

---

### Task 3: Repertoire matcher

**Files:**
- Create: `packages/chess-core/src/tree/match.ts`, `packages/chess-core/src/tree/match.test.ts`
- Modify: `packages/chess-core/src/index.ts`

**Interfaces:**
- Produces:
```ts
export type MatchResult =
  | { ok: true; child: TreeNode }
  | { ok: false; expected: TreeNode[] };

export function isRepertoireMove(node: TreeNode, move: { san?: string; uci?: string }): MatchResult;
export function findNodeByPathKey(chapter: ChapterTree, pathKey: PathKey): TreeNode | null;
```

- [ ] **Step 1: Write failing tests** for matching SAN/UCI, rejecting off-book legal moves, listing expected children

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement matcher** — compare normalized SAN or UCI against `node.children`; on miss return `{ ok: false, expected: [...children] }`

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit** `feat(chess-core): repertoire move matcher`

---

### Task 4: Pluggable lightweight SRS

**Files:**
- Create: `packages/chess-core/src/srs/types.ts`, `packages/chess-core/src/srs/lightweight.ts`, `packages/chess-core/src/srs/lightweight.test.ts`
- Modify: `packages/chess-core/src/index.ts`

**Interfaces:**
```ts
export interface MasteryScheduler {
  onCorrect(progress: PositionProgress, now?: Date): PositionProgress;
  onIncorrect(progress: PositionProgress, now?: Date): PositionProgress;
  compareDue(a: PositionProgress, b: PositionProgress): number;
}

export function createLightweightScheduler(config?: Partial<LightweightConfig>): MasteryScheduler;
export function createInitialProgress(pathKey: PathKey, now?: Date): PositionProgress;
```

Default config (injected, not scattered magic numbers):
```ts
{
  correctMasteryDelta: 8,
  incorrectMasteryDelta: 15,
  intervalsMsByBand: [/* mastery 0-20: 1d, 21-40: 3d, ... */],
  incorrectDelayMs: 60 * 60 * 1000
}
```

- [ ] **Step 1: Failing tests** — correct increases mastery/streak/nextReview; incorrect resets streak, lowers mastery, sooner nextReview; `compareDue` orders due first then low mastery

- [ ] **Step 2: Implement**

- [ ] **Step 3: Tests PASS + commit** `feat(chess-core): pluggable lightweight mastery scheduler`

---

### Task 5: Learn + Practice state machines + checkpoint

**Files:**
- Create: `packages/chess-core/src/training/learn.ts`, `learn.test.ts`
- Create: `packages/chess-core/src/training/practice.ts`, `practice.test.ts`
- Create: `packages/chess-core/src/training/checkpoint.ts`, `checkpoint.test.ts`
- Create: `packages/chess-core/src/training/side.ts`
- Modify: `packages/chess-core/src/index.ts`

**Interfaces:**
```ts
export interface LearnState { /* studyId omitted in core */ chapterIndex: number; pathKey: PathKey; side: "white" | "black"; stack: PathKey[]; status: "active" | "complete" }
export function startLearn(chapter: ChapterTree, sideMode: SideMode, rng?: () => number): LearnState;
export function learnApplyUserMove(state: LearnState, chapter: ChapterTree, move: { san?: string; uci?: string }): { state: LearnState; feedback: MatchResult };
export function learnAutoOpponentIfNeeded(state: LearnState, chapter: ChapterTree): LearnState;

export interface PracticeCard { pathKey: PathKey; fen: Fen }
export interface PracticeState { queue: PracticeCard[]; index: number; revealed: boolean; side: "white" | "black"; status: "active" | "complete" }
export function startPractice(cards: PracticeCard[], sideMode: SideMode, rng?: () => number): PracticeState;
export function practiceApplyMove(...): { state: PracticeState; feedback: MatchResult };
export function practiceReveal(state: PracticeState): PracticeState;

export function serializeCheckpoint(input: unknown): string;
export function parseLearnCheckpoint(json: string): LearnState;
export function parsePracticeCheckpoint(json: string): PracticeState;
```

Practice incorrect feedback at UI layer uses match result but **does not auto-reveal**; `revealed` flag only flips via `practiceReveal`.

Both-mode: `side` unused for filtering; user moves every ply that has repertoire children expecting a move from the side to move — implement as: on each position, if side-to-move has children, await user; never auto-play.

- [ ] **Step 1–4:** TDD each module (fail → impl → pass)

- [ ] **Step 5: Commit** `feat(chess-core): learn/practice engines and checkpoints`

---

### Task 6: Next.js app + shadcn/ui + theme tokens

**Files:**
- Create: `apps/web/**` via `create-next-app`
- Create: shadcn components listed below
- Create: `apps/web/lib/motion/tokens.ts`, `apps/web/components/providers/AppProviders.tsx`

**Interfaces:**
- Produces: `pnpm --filter @chessloom/web dev` serves app
- Produces: dependency on `@chessloom/chess-core` via workspace

- [ ] **Step 1: Scaffold Next app**

```bash
cd C:\Users\aadit\Projects\Chessloom
pnpm create next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --use-pnpm
```

Add to `apps/web/package.json` dependencies: `"@chessloom/chess-core": "workspace:*"`, `motion`, `react-chessboard`, `chess.js`, `@supabase/supabase-js`, `@supabase/ssr`, `next-themes`.

- [ ] **Step 2: Init shadcn (non-interactive)**

```bash
cd apps/web
pnpm dlx shadcn@latest init -d --base radix
```

Add components:
```bash
pnpm dlx shadcn@latest add button card input label textarea dialog sheet dropdown-menu tabs badge separator skeleton sonner avatar tooltip progress alert empty field
```

(If `empty` / `field` unavailable in CLI version, add closest equivalents: custom empty state using Card + Alert; forms with Label+Input.)

- [ ] **Step 3: Theme — dark-forward technical premium**

Customize CSS variables in `app/globals.css` for zinc/slate neutrals + one restrained accent (teal or electric blue — **not** purple-on-white). Wire `ThemeProvider` (`next-themes`) + `Toaster` (Sonner) in `AppProviders`.

`lib/motion/tokens.ts`:
```ts
export const motionTokens = {
  durationFast: 0.18,
  duration: 0.24,
  durationSlow: 0.32,
  easeOut: [0.16, 1, 0.3, 1] as const,
};
```

- [ ] **Step 4: Landing page shell** using shadcn Button/Card — brand **Chessloom**, one CTA to `/signup`

- [ ] **Step 5: Commit** `feat(web): Next.js app with shadcn and theme providers`

---

### Task 7: Supabase schema + RLS + Storage

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `apps/web/.env.local.example`
- Create: `apps/web/lib/supabase/{client,server,middleware}.ts`
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Write migration** covering `profiles`, `studies`, `chapters`, `nodes`, `position_progress`, `training_sessions`, Storage bucket `pgns`, RLS policies owner-scoped, trigger `on_auth_user_created` → profile.

Critical columns:
- `nodes.path_key text not null`
- `nodes.id uuid primary key`
- `position_progress` unique `(user_id, study_id, path_key)`
- `training_sessions.checkpoint jsonb`, `status text`, `updated_at`, index for active sessions

- [ ] **Step 2: Document local setup in README** — create Supabase project, `supabase db push` or SQL editor apply migration, enable Google provider, set redirect URLs

- [ ] **Step 3: Implement Supabase SSR helpers** per current `@supabase/ssr` Next.js docs (verify with Context7/docs at implement time)

- [ ] **Step 4: Middleware refresh session**

- [ ] **Step 5: Commit** `feat: add Supabase schema, RLS, and Next SSR clients`

---

### Task 8: Auth UI + OAuth callback

**Files:**
- Create: auth pages + `app/auth/callback/route.ts`
- Create: `lib/actions/auth.ts`

- [ ] **Step 1: Build login/signup/forgot forms** with shadcn Field/Input/Button; email+password actions

- [ ] **Step 2: Google button** → `signInWithOAuth({ provider: 'google' })`

- [ ] **Step 3: Callback route** exchanges code; redirect `/dashboard`

- [ ] **Step 4: Sign out** in settings/shell

- [ ] **Step 5: Toasts** for auth success/error via Sonner

- [ ] **Step 6: Commit** `feat(web): email and Google authentication`

---

### Task 9: Study import + persistence

**Files:**
- Create: `lib/actions/studies.ts`
- Create: `components/import/ImportForm.tsx`
- Create: `app/(app)/import/page.tsx`
- Create: `app/(app)/dashboard/page.tsx`
- Create: `app/(app)/studies/[studyId]/page.tsx`

**Interfaces:**
```ts
// server action
export async function importPgnAction(input: {
  title?: string;
  pgnText?: string;
  // file handled via FormData
}): Promise<{ ok: true; studyId: string } | { ok: false; error: string }>;
```

Flow:
1. Read PGN text (paste or upload)
2. If size > 200_000 chars → upload to Storage, keep path
3. `parsePgnToStudy` in server action
4. Insert study + chapters + nodes in one transaction (Supabase RPC or sequential inserts wrapped in postgres function `import_study(...)`)
5. Toast success/failure

Also: rename, delete (cascade), list studies with mastery aggregates (SQL view or app-side compute).

- [ ] **Step 1: Implement import action + UI**

- [ ] **Step 2: Manual test** with multi-variation PGN

- [ ] **Step 3: Commit** `feat(web): PGN import to study tree in Supabase`

---

### Task 10: Reimport reconciliation

**Files:**
- Modify: `lib/actions/studies.ts`
- Create: `supabase/migrations/0002_reimport_study.sql` (optional RPC)

- [ ] **Step 1: RPC `reimport_study(study_id, payload)`** — delete chapters/nodes; insert new; delete progress rows whose path_key not in new set; keep matches

- [ ] **Step 2: Wire UI confirm Dialog**

- [ ] **Step 3: Commit** `feat: transactional study reimport with progress reconcile`

---

### Task 11: Training server actions (authoritative)

**Files:**
- Create: `lib/actions/training.ts`

**Interfaces:**
```ts
export async function submitPracticeMoveAction(input: {
  sessionId: string;
  pathKey: string;
  uci: string;
}): Promise<{
  ok: boolean;
  expectedCount: number; // do not send SANs until reveal
  progress?: PositionProgress;
  checkpoint: unknown;
}>;

export async function revealPracticeExpectedAction(sessionId: string, pathKey: string): Promise<{ sans: string[]; ucis: string[] }>;

export async function submitLearnMoveAction(...): Promise<...>;
export async function saveCheckpointAction(sessionId: string, checkpoint: unknown): Promise<void>;
export async function resumeSessionAction(studyId: string, mode: SessionMode): Promise<...>;
```

Rules:
- Load nodes for study from DB; rebuild adjacency in memory or query children by parent
- Validate move with chess-core
- Update `position_progress` server-side via scheduler
- Persist checkpoint JSON + `updated_at`
- Reject if session not owned / expired (>14 days)

- [ ] **Step 1: Implement actions with unit-testable helpers** that map DB rows → `TreeNode`

- [ ] **Step 2: Commit** `feat(web): server-authoritative training actions`

---

### Task 12: Chess board UI + Learn/Practice views

**Files:**
- Create: `components/chess/ChessBoard.tsx`, `BoardFrame.tsx`
- Create: `components/training/LearnView.tsx`, `PracticeView.tsx`, `FeedbackBanner.tsx`
- Create: learn/practice pages

- [ ] **Step 1: ChessBoard wrapper** — themes for dark/light, orientation prop, onPieceDrop → uci

- [ ] **Step 2: LearnView** — Motion for feedback; auto-opponent via action; show comments; branch selector with shadcn Tabs or list

- [ ] **Step 3: PracticeView** — incorrect banner text exactly **"Not in your repertoire."**; Button “Show expected move(s)”; Retry

- [ ] **Step 4: Keyboard shortcuts** hook (arrows, R, Space) — no celebratory motion on key repeat

- [ ] **Step 5: Commit** `feat(web): learn and practice training UIs`

---

### Task 13: Dashboard, SRS queue, settings, motion polish

**Files:**
- Modify: dashboard page
- Create: `components/studies/StudyCard.tsx`
- Create: settings page (theme, default side mode)
- Create: `components/motion/PageTransition.tsx`
- Wire skeletons, empty states (shadcn Empty/Card), progress bars

- [ ] **Step 1: Dashboard queries** — due count, weak path_keys (mastery < 40), streak from profile/sessions

- [ ] **Step 2: Practice queue builder** server-side using scheduler `compareDue`

- [ ] **Step 3: Motion** — staggered cards, modal/sheet, mastery number tween; respect reduced motion

- [ ] **Step 4: Toast coverage** per design list

- [ ] **Step 5: Commit** `feat(web): dashboard, settings, and motion polish`

---

### Task 14: Checkpoint resume + session lifecycle

**Files:**
- Modify: training actions + learn/practice pages

- [ ] **Step 1: On training page load** — `resumeSessionAction`; if active checkpoint <14d, restore; else start fresh

- [ ] **Step 2: Save checkpoint after each resolved move**

- [ ] **Step 3: Test refresh mid-learn** manually

- [ ] **Step 4: Commit** `feat(web): persist and resume training checkpoints`

---

### Task 15: README, env example, Vercel readiness

**Files:**
- Modify: `README.md`
- Create: `apps/web/.env.local.example`
- Create: `apps/web/vercel.json` only if needed (usually not)

- [ ] **Step 1: Document** setup: Supabase, Google OAuth, `pnpm install`, `pnpm dev`, `pnpm test`, deploy to Vercel (root or `apps/web` + workspace install)

- [ ] **Step 2: Ensure build** `pnpm build` succeeds with placeholder env where required

- [ ] **Step 3: Commit** `docs: README and environment setup for Chessloom MVP`

---

### Task 16: Final verification gate

- [ ] **Step 1: Run** `pnpm test` — all chess-core tests pass

- [ ] **Step 2: Manual checklist** against design §14 success criteria

- [ ] **Step 3: Fix any failures; commit as needed**

- [ ] **Step 4: Tag or note** `mvp-complete` on main when criteria met

---

## Spec coverage self-review

| Spec requirement | Task(s) |
|------------------|---------|
| Isolated chess-core + tests | 1–5 |
| PGN tree / path_key / comments/NAGs | 2 |
| Learn + Practice + Both/Random | 5, 12 |
| Pluggable SRS | 4, 13 |
| Server-authoritative progress | 11 |
| Practice reveal UX | 5, 11, 12 |
| Auth email + Google | 8 |
| Import paste/upload + Storage | 9 |
| Reimport transactional | 10 |
| Checkpoints 14d | 5, 14 |
| Dashboard due/weak/streak | 13 |
| shadcn/ui + Sonner + Motion | 6, 13 |
| Dark/light technical premium | 6 |
| GitHub + Vercel | 15 |
| No Lichess URL / Random Test / Full Test / FSRS / Stockfish | explicitly omitted |

**Placeholder scan:** none intentional — CLI component names may adapt if shadcn version lacks `empty`/`field`; plan allows fallbacks.

**Type consistency:** `PathKey`, `PositionProgress`, `SideMode`, `SessionMode` defined in chess-core and reused by web actions.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-20-chessloom-mvp.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints  

Which approach?
