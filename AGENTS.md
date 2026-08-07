# AGENTS.md

## Project Overview

**HEALO** — Medical concierge platform connecting foreign patients with Korean medical services.

- **Stack:** Next.js 16 + React 18 + Supabase + Tailwind CSS
- **Language:** TypeScript / JavaScript (mixed, `strict: false`)

## Cursor Cloud specific instructions

### Dev Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Next.js with webpack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run test` | Run Vitest (watch mode) |
| `npm run test:run` | Run Vitest (single run) |

### Environment Setup

- A `.env.local` file with Supabase credentials is required for full functionality. Without it the dev server will start but API routes depending on Supabase will fail at runtime.
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and others listed in `scripts/check-env.js`.
- Run `npm run check:env` to verify which env vars are set.

### Build Notes

- `typescript.ignoreBuildErrors` is `true` in `next.config.js` because Supabase DB types (`database.types.ts`) have not been generated yet. The build will succeed even with TS errors.
- ESLint is configured via `eslint.config.js` (flat config, ESLint 9).
- Sentry integration activates only when `NEXT_PUBLIC_SENTRY_DSN` is set.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
