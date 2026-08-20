# Chessloom

Chess opening trainer. Import a PGN repertoire, then Learn and Practice it with server-authoritative scoring.

This is a [pnpm](https://pnpm.io/) workspace:

- `packages/chess-core` — shared tree types, PGN parsing, Learn/Practice, and SRS
- `apps/web` — Next.js app (App Router) with Supabase auth, storage, and training UI

## Prerequisites

- Node.js 20.9 or later
- pnpm 9.15.0 (pinned in `packageManager`; enable via Corepack)

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

## Local development

```bash
pnpm install
pnpm dev
```

The Next.js app runs at [http://localhost:3000](http://localhost:3000). Copy `apps/web/.env.local.example` to `apps/web/.env.local` and fill real Supabase values before signing in.

```bash
pnpm test
pnpm --filter @chessloom/web exec vitest run
pnpm build
pnpm lint
```

| Command | What it runs |
| --- | --- |
| `pnpm install` | Workspace install (`apps/*`, `packages/*`) |
| `pnpm dev` | Next.js dev server for `@chessloom/web` |
| `pnpm test` | Vitest for `@chessloom/chess-core` |
| `pnpm --filter @chessloom/web exec vitest run` | Vitest for the web app |
| `pnpm build` | `chess-core` `tsc`, then `next build` |
| `pnpm lint` | ESLint for `@chessloom/web` |

`pnpm build` compiles without talking to Supabase. If you need a local smoke build and do not have a project yet, export placeholders:

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=placeholder-publishable-key
export SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key
export NEXT_PUBLIC_SITE_URL=http://localhost:3000
pnpm build
```

Runtime (`pnpm dev`, Vercel) still needs real keys.

## Environment variables

All app secrets live in `apps/web/.env.local` locally and in the Vercel project settings in production. Never commit `.env.local`.

| Variable | Where it is used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server Supabase clients | Project URL from **Settings → API** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server Supabase clients | Publishable (anon) key. Safe in the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server actions only (`apps/web/lib/supabase/service.ts`) | **Server-only.** Bypasses RLS. Never prefix with `NEXT_PUBLIC_`, never import from client code. |
| `NEXT_PUBLIC_SITE_URL` | Auth email and OAuth `redirectTo` | Canonical origin, for example `http://localhost:3000` |

Google OAuth client ID and secret are configured in the Supabase dashboard, not in this repo.

## Supabase setup

1. Create a Supabase project.
2. Copy `apps/web/.env.local.example` to `apps/web/.env.local`.
3. In **Settings → API** (or the **Connect** dialog), set:
   - `NEXT_PUBLIC_SUPABASE_URL` to the project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the publishable / anon key
   - `SUPABASE_SERVICE_ROLE_KEY` to the `service_role` key
   - `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000`
4. Apply every file in `supabase/migrations` in filename order. Link the CLI and run `supabase db push`, or paste each migration once in the dashboard SQL Editor.
5. Enable **Email** under **Authentication → Providers** if you use email/password.
6. Enable **Google** (steps below).
7. Under **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
   - Add the production origin and `https://<your-domain>/auth/callback` before going live. For Vercel preview deployments, also allow `https://<project-name>-*-<team>.vercel.app/auth/callback` (or the matching wildcard your team uses).

The schema creates owner-scoped RLS policies and a private `pgns` Storage bucket. Store uploads beneath a user-owned path such as `<auth-user-id>/<file-name>.pgn`.

`position_progress` and training checkpoints are read-only to authenticated clients. After user-scoped authentication and move validation, training server actions use the server-only service client to call `apply_training_result_and_checkpoint`. The RPC commits the scheduler result and checkpoint atomically; no browser or server-action input may provide mastery counters.

### Google OAuth

1. In [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients), create an OAuth client of type **Web application**.
2. Under **Authorized JavaScript origins**, add `http://localhost:3000` and your production origin.
3. Under **Authorized redirect URIs**, add the callback shown on the Supabase Google provider page. Hosted projects use `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Copy the client ID and client secret into **Authentication → Providers → Google** in Supabase and enable the provider.

## Deploy on Vercel

Import the GitHub repository into Vercel. This is a pnpm monorepo; the Next.js app is `apps/web`, and it depends on workspace package `@chessloom/chess-core`.

**Project settings**

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Include files outside the Root Directory | On (default) |
| Install Command | Default (`pnpm install` from the workspace root) |
| Build Command | `pnpm --filter @chessloom/chess-core build && pnpm build` |
| Output Directory | Default (`.next`) |

The custom build command compiles `packages/chess-core` to `dist/` before `next build`. Root `pnpm build` does the same locally.

You can also import the repo with Root Directory left at the repository root and set the build command to `pnpm build`, as long as Vercel still detects the Next.js app in `apps/web`. Prefer Root Directory `apps/web` so framework detection stays on the app package.

**Environment variables** (Production, Preview, and Development as needed):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; do not give this a `NEXT_PUBLIC_` name)
- `NEXT_PUBLIC_SITE_URL` (the Vercel production URL or custom domain)

After the first production URL exists, add that origin and `/auth/callback` to the Supabase redirect allowlist and to the Google OAuth client's authorized origins.
