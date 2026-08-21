# Chessloom web

Next.js app for Chessloom — a free, open-source opening repertoire trainer.

## Architecture notes

- **Training authority is the server.** Learn / Practice / Test moves are validated and scored in server actions; the client never invents correctness.
- **Stockfish is optional analysis only.** The WASM engine evaluates positions on demand and never grades training attempts or auto-plays moves.
- **Repertoire source of truth.** Imported PGN or Lichess studies define the tree; FSRS schedules reviews from scored attempts.
- **Play vs computer** deep-links to Lichess (`/?fen=…#ai`) rather than running an in-app game loop.

## Scripts

From the monorepo root:

```bash
pnpm --filter @chessloom/web dev
pnpm --filter @chessloom/web test
pnpm --filter @chessloom/web build
```

Requires env vars for Supabase (see root README / `.env.example`).
