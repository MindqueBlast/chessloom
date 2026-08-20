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
   key into the matching environment variables. Do not use a service-role key
   in the web app.
3. Apply `supabase/migrations/0001_init.sql`. Either link the Supabase CLI and
   run `supabase db push`, or paste the migration into the dashboard SQL
   Editor and run it once.
4. In **Authentication > Providers**, enable Google and configure its OAuth
   client credentials.
5. In **Authentication > URL Configuration**, set the local site URL to
   `http://localhost:3000` and allow
   `http://localhost:3000/auth/callback`. Add the equivalent production URL
   and callback before deploying.

The migration creates owner-scoped RLS policies and a private `pgns` Storage
bucket. Store uploads beneath a user-owned path such as
`<auth-user-id>/<file-name>.pgn`.
