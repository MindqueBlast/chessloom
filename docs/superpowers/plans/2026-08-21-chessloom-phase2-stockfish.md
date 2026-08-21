# Chessloom Phase 2 — Slice 4: Stockfish WASM Analysis

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development or executing-plans.

**Goal:** Optional in-browser Stockfish analysis (eval bar + PV) on Learn, Practice, and Test surfaces. Never grades or rewrites repertoire.

**Depends on:** Slices 1–3 preferred but can land after Practice UX exists (MVP Learn/Practice enough).

**Spec:** `docs/superpowers/specs/2026-08-21-chessloom-phase2-design.md` §6

## Global Constraints

- Browser WASM only — no server engine
- Off by default
- Never auto-play engine moves into the line
- Never score Practice / Random / Full against Stockfish
- Never rewrite imported repertoire
- Label UI “Engine eval” not “correct move”
- Respect `prefers-reduced-motion`
- Preserve visual identity

---

### Task 1: Engine worker wrapper

**Files:**
- Create: `apps/web/lib/engine/stockfish-client.ts`
- Create: `apps/web/lib/engine/stockfish-client.test.ts` (mock Worker)
- Add dependency: stockfish.wasm or `stockfish` npm package suitable for Next.js client

**Interfaces:**
```ts
type EngineEval = { cp: number | null; mate: number | null; depth: number; pv: string[] }

createStockfishClient(): {
  analyze(fen: string, depth: number): Promise<EngineEval> | AsyncIterable...
  stop(): void
  terminate(): void
}
```

Default depth ~12–15; allow light depth control (e.g. 10 / 15 / 18).

- [ ] TDD client lifecycle; commit `feat(web): Stockfish WASM client wrapper`

---

### Task 2: AnalysisToggle + EvalBar UI

**Files:**
- Create: `apps/web/components/engine/AnalysisPanel.tsx` (toggle, eval bar, PV san/uci text)
- Create: `apps/web/components/engine/EvalBar.tsx`
- Hook: `useEngineAnalysis(fen, enabled, depth)`

Copy: “Engine eval” helper text. Reduced motion: no rapid bar flicker — throttle updates ~200–300ms.

- [ ] Commit `feat(web): Analysis toggle with eval bar and PV`

---

### Task 3: Mount on Learn / Practice / Test

**Files:**
- Modify: `LearnView.tsx`, `PracticeView.tsx`, `TestView.tsx` — mount panel; pass current FEN only
- Ensure analyzing never calls training score actions with engine moves

- [ ] Manual + unit: toggle does not change checkpoint; commit `feat(web): optional analysis on training surfaces`

---

### Task 4: Docs + verify

- README: Analysis is optional, non-authoritative
- Build + vitest green
- Commit `docs: document optional Stockfish analysis`

---

## Spec coverage

| Requirement | Task |
|-------------|------|
| WASM browser | 1 |
| Toggle off default | 2–3 |
| Eval + PV | 2 |
| Never grade/rewrite | 3 + constraints |
| Reduced motion | 2 |
