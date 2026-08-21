# Chessloom Phase 2 — Slice 1: Lichess Study URL Import

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users import and reimport a **public** Lichess Study by URL into Chessloom as a first-class study (`source_type = lichess_study`), reusing the existing PGN → tree → Learn/Practice pipeline.

**Architecture:** Server-only fetch of `https://lichess.org/api/study/{studyId}.pgn` (comments + variations on; clocks off). Parse URL in `chess-core` (pure). Persist fetched PGN on the study (keeps `studies_pgn_source_present`). Widen DB/RPC allowlists for `lichess_study` + store canonical URL and study id. UI: URL field on Import; Reimport-from-URL for Lichess studies.

**Tech Stack:** Next.js server actions, existing `import_study` / `reimport_study` RPCs (migrated), `parsePgnToStudy`, Vitest, Supabase migrations.

**Spec:** `docs/superpowers/specs/2026-08-21-chessloom-phase2-design.md` §3

## Global Constraints

- Public studies only — no Lichess OAuth
- Fail closed — no partial study writes on fetch/parse failure
- Repertoire remains source of truth — fetched PGN is the import payload
- Preserve current visual identity
- Never commit secrets
- Fetch only on the server (User-Agent identifying Chessloom)

**Later Phase 2 plans (not this file):** FSRS; Random/Full Test; Stockfish WASM.

---

## File map

| File | Responsibility |
|------|----------------|
| `packages/chess-core/src/lichess/url.ts` | Parse/normalize Lichess study URLs → `{ studyId }` |
| `packages/chess-core/src/lichess/url.test.ts` | Unit tests (no network) |
| `packages/chess-core/src/index.ts` | Export parse helpers |
| `apps/web/lib/lichess/fetch-study.ts` | Server fetch public study PGN |
| `apps/web/lib/lichess/fetch-study.test.ts` | Mocked fetch tests |
| `supabase/migrations/20260821130000_lichess_study_source.sql` | Schema + RPC updates |
| `apps/web/lib/actions/studies.ts` | Import/reimport Lichess actions |
| `apps/web/components/import/ImportForm.tsx` | URL field |
| `apps/web/app/(app)/import/page.tsx` | Copy |
| `apps/web/components/studies/StudyActions.tsx` | Reimport-from-URL UI |
| `apps/web/components/studies/StudyOverview.tsx` / `StudyCard.tsx` | Badges |
| `apps/web/lib/toasts.ts` | Error/success copy |

---

### Task 1: Parse Lichess study URLs in chess-core

**Files:**
- Create: `packages/chess-core/src/lichess/url.ts`
- Create: `packages/chess-core/src/lichess/url.test.ts`
- Modify: `packages/chess-core/src/index.ts` (export)

**Interfaces:**
- Produces: `parseLichessStudyUrl(input: string): { studyId: string; canonicalUrl: string }` throws `Error` with message containing `lichess` on failure
- Accepts: `https://lichess.org/study/{id}`, optional slug `/study/{id}/{slug}`, trailing slash, `http`, `www.`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { parseLichessStudyUrl } from "./url.js";

describe("parseLichessStudyUrl", () => {
  it("extracts study id from common public URLs", () => {
    expect(parseLichessStudyUrl("https://lichess.org/study/abcDef12").studyId).toBe(
      "abcDef12",
    );
    expect(
      parseLichessStudyUrl("https://lichess.org/study/abcDef12/italian-game").studyId,
    ).toBe("abcDef12");
    expect(parseLichessStudyUrl("https://www.lichess.org/study/abcDef12/").canonicalUrl).toBe(
      "https://lichess.org/study/abcDef12",
    );
  });

  it("rejects non-study URLs", () => {
    expect(() => parseLichessStudyUrl("https://lichess.org/practice")).toThrow(/lichess/i);
    expect(() => parseLichessStudyUrl("not-a-url")).toThrow(/lichess/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @chessloom/chess-core exec vitest run src/lichess/url.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/chess-core/src/lichess/url.ts
const STUDY_ID = /^[a-zA-Z0-9]{8}$/;

export function parseLichessStudyUrl(input: string): {
  studyId: string;
  canonicalUrl: string;
} {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Enter a valid Lichess study URL.");
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host !== "lichess.org") {
    throw new Error("Only lichess.org study URLs are supported.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "study" || !parts[1] || !STUDY_ID.test(parts[1])) {
    throw new Error("Enter a Lichess study URL like https://lichess.org/study/xxxxxxxx.");
  }

  const studyId = parts[1];
  return {
    studyId,
    canonicalUrl: `https://lichess.org/study/${studyId}`,
  };
}
```

Export from `packages/chess-core/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @chessloom/chess-core exec vitest run src/lichess/url.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/chess-core/src/lichess packages/chess-core/src/index.ts
git commit -m "feat(chess-core): parse public Lichess study URLs"
```

---

### Task 2: Server fetch public study PGN

**Files:**
- Create: `apps/web/lib/lichess/fetch-study.ts`
- Create: `apps/web/lib/lichess/fetch-study.test.ts`

**Interfaces:**
- Consumes: `parseLichessStudyUrl` from `@chessloom/chess-core`
- Produces: `fetchLichessStudyPgn(urlInput: string): Promise<{ studyId: string; canonicalUrl: string; pgnText: string; titleHint: string | null }>`
- Endpoint: `GET https://lichess.org/api/study/{studyId}.pgn?clocks=false` with `Accept: application/x-chess-pgn` / `User-Agent: Chessloom/0.1 (+https://github.com/MindqueBlast/chessloom)`
- On 404/401/403 → throw user-facing “Study not found or not public.”
- On non-OK / empty body → throw fetch failed
- `titleHint`: first `[Event "..."]` header if present

- [ ] **Step 1: Write failing tests** with `vi.stubGlobal("fetch", ...)` covering success, 404, network empty

- [ ] **Step 2: Run tests — expect FAIL**

Run: `corepack pnpm --filter @chessloom/web exec vitest run lib/lichess/fetch-study.test.ts`

- [ ] **Step 3: Implement `fetchLichessStudyPgn`**

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): fetch public Lichess study PGN on the server"
```

---

### Task 3: Migration — `lichess_study` source + RPC allowlist

**Files:**
- Create: `supabase/migrations/20260821130000_lichess_study_source.sql`
- Update: `apps/web/lib/actions/reimport-migration.test.ts` if it asserts allowlist strings

**Schema changes:**

```sql
alter table public.studies
  drop constraint if exists studies_source_type_check;

-- recreate check including lichess_study (name may differ — inspect 0001_init.sql)
alter table public.studies
  add constraint studies_source_type_check
  check (source_type in ('pgn_paste', 'pgn_upload', 'lichess_study'));

alter table public.studies
  add column if not exists lichess_study_id text,
  add column if not exists lichess_study_url text;

-- Keep studies_pgn_source_present: always store fetched pgn_text (or storage path)
```

**RPC:** `create or replace` `import_study` and `reimport_study` to:
- Accept optional `p_lichess_study_id text`, `p_lichess_study_url text` (default null)
- On insert/update, set those columns when provided
- `reimport_study` allowlist: `p_source_type in ('pgn_paste', 'pgn_upload', 'lichess_study')`

Apply to remote Supabase project via MCP `apply_migration` after local file lands.

- [ ] **Step 1: Write migration SQL file**
- [ ] **Step 2: Update migration string tests if present**
- [ ] **Step 3: Apply migration to project `mcwnszqxpfivbrucwtlf`**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(db): add lichess_study source type and RPC fields"
```

---

### Task 4: Import + reimport server actions

**Files:**
- Modify: `apps/web/lib/actions/studies.ts`
- Modify: `apps/web/lib/toasts.ts` (add Lichess-specific error strings if needed)
- Modify: `apps/web/lib/actions/studies.test.ts`

**Interfaces:**
- `importPgnFormAction`: if `lichessUrl` form field non-empty, call `fetchLichessStudyPgn` then `import_study` with `p_source_type: 'lichess_study'`, `p_pgn_text`, `p_lichess_*`, title from form or `titleHint`
- Precedence: **URL wins if provided**; else existing file > paste
- `reimportLichessStudyAction(studyId: string)`: load study row (must be owner + `lichess_study` + url) → fetch → `reimport_study` with same source type + url/id
- Keep `reimportPgnAction` for paste/upload studies

- [ ] **Step 1: Tests for form branch + reimport Lichess (mocked fetch + rpc)**
- [ ] **Step 2: Implement actions**
- [ ] **Step 3: Tests PASS**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): import and reimport Lichess studies via server actions"
```

---

### Task 5: Import + study UI

**Files:**
- Modify: `apps/web/components/import/ImportForm.tsx` — URL input `name="lichessUrl"`; short helper text
- Modify: `apps/web/app/(app)/import/page.tsx` — title/description mention Lichess URL
- Modify: `apps/web/components/studies/StudyOverview.tsx` — badge “Lichess study”; pass `sourceType` + `lichessStudyUrl` to actions
- Modify: `apps/web/components/studies/StudyCard.tsx` — badge
- Modify: `apps/web/components/studies/StudyActions.tsx` — if `lichess_study`, primary reimport = “Refresh from Lichess” (no file required); keep PGN reimport optional or hide for Lichess
- Modify: `apps/web/app/(app)/studies/[studyId]/page.tsx` — select `lichess_study_url`, `source_type`

- [ ] **Step 1: Wire form field + badges + reimport button**
- [ ] **Step 2: Manual smoke** (or component tests if cheap): URL empty → PGN path unchanged
- [ ] **Step 3: `corepack pnpm --filter @chessloom/web exec vitest run` PASS
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): Lichess URL field and study reimport UI"
```

---

### Task 6: Verify build + document

- [ ] **Step 1:** `corepack pnpm --filter @chessloom/chess-core test` and web vitest + `pnpm --filter @chessloom/web build` with placeholder env
- [ ] **Step 2:** Update `README.md` Import section: public Lichess Study URL supported
- [ ] **Step 3: Commit**

```bash
git commit -m "docs: document Lichess study URL import"
```

---

## Spec coverage (Slice 1)

| Spec requirement | Task |
|------------------|------|
| Public URL import | 2, 4, 5 |
| `lichess_study` + URL + id | 3, 4 |
| Reimport from URL | 4, 5 |
| Fail closed | 2, 4 |
| No private/OAuth | Global + Task 2 error mapping |

## Out of this plan

FSRS, Random/Full Test, Stockfish — separate plans after Slice 1 ships.
