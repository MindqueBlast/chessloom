# Chessloom

Chess opening trainer monorepo.

This workspace uses [pnpm](https://pnpm.io/) workspaces. The `@chessloom/chess-core` package holds shared chess tree types and logic used by apps in this repo.

## Getting started

```bash
pnpm install
pnpm test
```

## Supabase setup

1. Create a Supabase project and copy `apps/web/.env.local.example` to
   `apps/web/.env.local`.
2. In the project's **Connect** dialog, copy the project URL and publishable
   key into the matching environment variables. Add the service-role key as
   `SUPABASE_SERVICE_ROLE_KEY` for trusted server actions only. It must never
   use a `NEXT_PUBLIC_` prefix or be imported by browser code.
3. Apply every file in `supabase/migrations` in migration order. Either link
   the Supabase CLI and run `supabase db push`, or run each migration once in
   the dashboard SQL Editor.
4. In **Authentication > Providers**, enable Google and configure its OAuth
   client credentials.
5. In **Authentication > URL Configuration**, set the local site URL to
   `http://localhost:3000` and allow
   `http://localhost:3000/auth/callback`. Add the equivalent production URL
   and callback before deploying.

The migration creates owner-scoped RLS policies and a private `pgns` Storage
bucket. Store uploads beneath a user-owned path such as
`<auth-user-id>/<file-name>.pgn`.

`position_progress` and training checkpoints are read-only to authenticated
clients. After user-scoped authentication and move validation, training server
actions use the server-only service client to call
`apply_training_result_and_checkpoint`. The RPC commits the scheduler result
and checkpoint atomically; no browser or server-action input may provide
mastery counters.
