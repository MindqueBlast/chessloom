# Task 11 Report: Authoritative training server actions

## Status
Complete.

## Implemented
- Added server-authoritative Practice and Learn move actions that load the owned session and stored repertoire, validate UCI moves through `chess-core`, compute progress with `createLightweightScheduler`, and persist checkpoints.
- Kept incorrect Practice responses free of expected SAN/UCI values; those are available only from the explicit reveal action.
- Added ownership, active-state, mode, and 14-day TTL checks, including abandonment of expired sessions.
- Added validated checkpoint save/resume actions and pure DB row mappers that rebuild chapter tree adjacency.
- Added tests for unordered adjacency reconstruction, malformed trees, TTL boundaries, progress mapping, forged Practice paths, server-side scoring, and reveal isolation.

## Verification
- `corepack pnpm --filter @chessloom/web exec vitest run` — 18 tests passed.
- `corepack pnpm --filter @chessloom/chess-core test` — 44 tests passed.
- `corepack pnpm --filter @chessloom/web exec tsc --noEmit` — passed.
- `corepack pnpm --filter @chessloom/web lint` — passed.
- `corepack pnpm --filter @chessloom/web build` — passed.

## Concerns
- The production build retains the pre-existing Next.js warning that `middleware.ts` is deprecated in favor of `proxy.ts`.
- The migration contract is unit-tested, but the SQL was not executed against
  a local Supabase/Postgres instance in this environment.

## Review remediation
- Added `0003_training_authority.sql`, which revokes authenticated
  `position_progress` writes and exposes the authenticated, owner-checked
  `apply_training_result` SECURITY DEFINER RPC.
- Moved lightweight scheduler defaults into one atomic SQL upsert. Training
  actions now send only study ID, path key, and correctness; mastery counters
  are never accepted from clients.
- Hardened checkpoint saves with exact schemas, non-empty paths, active-only
  status, in-range Practice indices, equality with the current authoritative
  checkpoint, and an `updated_at` compare-and-swap on writes.
- Documented the RPC-only progress write boundary in the root README.

## Review verification
- `corepack pnpm --filter @chessloom/web exec vitest run` — 24 tests passed.
- `corepack pnpm --filter @chessloom/chess-core test` — 44 tests passed.
- `corepack pnpm --filter @chessloom/web lint` — passed.
- `cmd /c "corepack pnpm --filter @chessloom/chess-core build && corepack pnpm --filter @chessloom/web build"` — passed.
- `git diff --check` — passed (Git emitted only line-ending conversion warnings).

The earlier progress-upsert concurrency concern is resolved by the atomic RPC;
checkpoint writes now reject stale snapshots via compare-and-swap.

## Critical/important remediation
- Added `0004_training_service_authority.sql`. It revokes authenticated
  `training_sessions` INSERT/UPDATE, replaces the owner-all policy with
  owner-scoped SELECT, removes public/authenticated/anon execution of the old
  scoring RPC, and grants training RPC execution only to `service_role`.
- Added the server-only `createServiceClient()` with a fail-closed
  `SUPABASE_SERVICE_ROLE_KEY` guard and non-persistent auth configuration.
- Move actions still authenticate and read through the user-scoped client,
  validate moves with `chess-core`, then use the service client to call
  `apply_training_result_and_checkpoint`.
- The new RPC locks and compare-and-swaps the session before committing progress
  and the checkpoint in one transaction, preventing counted racing attempts.
- Reveal, client checkpoint, expiry, and resume checkpoint writes now use the
  service client only after the user and owned session have been verified.
- Updated the environment example and README to mark the service key as
  server-only. Added regression tests for the env guard, service-client auth
  isolation, RPC grants, direct-write revocation, atomic checkpoint SQL, and
  payloads that cannot include mastery counters.

## Critical/important verification
- `corepack pnpm exec vitest run` (apps/web) — 26 tests passed.
- `corepack pnpm exec tsc --noEmit` (apps/web) — passed.
- `corepack pnpm lint` (apps/web) — passed.
- `corepack pnpm test` (packages/chess-core) — 44 tests passed.
- Core and web production builds — passed.
- The SQL contract is unit-tested but was not executed against a local
  Supabase/Postgres instance in this environment.
