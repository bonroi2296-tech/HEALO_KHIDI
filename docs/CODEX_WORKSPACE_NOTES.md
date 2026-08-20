# Codex Workspace Notes

Last checked: 2026-04-20

## What This Project Is

healwith is a Next.js 16 medical concierge platform for foreign patients using Korean medical services. It uses React 18, Supabase, Tailwind CSS, mixed JavaScript/TypeScript, and App Router.

## Useful Commands

- `npm run dev` - start the local Next.js development server.
- `npm run build` - production build.
- `npm run lint` - ESLint check.
- `npm run test:run` - Vitest single run.
- `npm run check:env` - verify required `.env.local` values.

## Current Setup Status

- Dependencies were installed with `npm install`.
- `scripts/check-env.js` was updated to work with the repository's ESM setup.
- `eslint.config.js` was updated to ignore local worktree/export/build artifact folders so lint output focuses on the active app code.

## Known Local Blockers

- `.env.local` is missing these required values:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ENCRYPTION_KEY_V2`
- Optional values currently missing:
  - `GOOGLE_MAPS_API_KEY`
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  - `AWS_SES_REGION`
  - `AWS_SES_ACCESS_KEY_ID`
  - `AWS_SES_SECRET_ACCESS_KEY`
  - `AWS_SES_FROM_EMAIL`
- `npm run lint` still reports existing app-code issues. After excluding artifact folders, the current baseline is 192 problems: 123 errors and 69 warnings.
- In the Codex sandbox, `npm run dev` and `npm run test:run` can fail with `spawn EPERM`. Running them with approval outside the sandbox may be required.

## Next Best Steps

1. Fill the missing required environment variables in `.env.local`.
2. Run `npm run check:env`.
3. Start the app with `npm run dev`.
4. Fix lint issues in small groups, starting with parser errors and duplicate keys before React hook style warnings.
