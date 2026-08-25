# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                 # Express + Vite middleware on :3000 (HMR). The only way to run locally.
npm run build && npm start  # Production: serves dist/, never starts Vite. Build first or startup throws.
npm run lint                # tsc --noEmit, strict. This is the whole static-check story — no ESLint.
npm run seed                # Demo user chef@lamiacucina.com / password123 + recipes. Idempotent.
```

Tests are Robot Framework suites hitting the real HTTP API against a real database — no unit test
framework, no mocks:

```bash
npm run test:api:setup                          # once: creates tests/.venv
npm run dev                                     # the app must be running (BASE_URL, default :3000)
npm run test:api                                # all suites
npm run test:api -- --include planner           # one area by tag (auth/recipes/categories/freezer/planner/import/upload)
npm run test:api -- --exclude network           # skip the one test that fetches a public page
npm run test:api -- --test "Deleting A Plan Removes It"   # a single test
```

Failures are diagnosed from `tests/results/log.html` (request-by-request). Suites write to whatever
database the app points at — always a development database.

Schema changes are applied by hand; there is no migration runner:

```bash
psql "$DATABASE_URL" -f supabase_schema.sql
psql "$DATABASE_URL" -f migrations/001_....sql   # numbered order, idempotent, apply before deploying the code
```

## Architecture

One Node process serves both halves. `server.ts` mounts `/api/*` routers, then hands every other URL
to the frontend: Vite middleware in development (imported lazily so production never loads it), static
`dist/` in production. `errorHandler` is last in the chain and turns Multer/upload failures into JSON —
without it the client gets an HTML stack trace it cannot parse.

The backend is TypeScript run directly by `tsx` — never compiled. That is why every server-side import
carries an explicit `.ts` extension (`allowImportingTsExtensions`). Keep that; dropping it breaks `npm run dev`.

**Request shape:** `routes/` are thin (`router.post('/', isAuthenticated, controller)`); all validation,
business rules and SQL live in `controllers/`. `isAuthenticated` verifies the Bearer JWT and sets
`(req as any).user.userId` — every controller scopes its SQL by that userId, which is the only thing
keeping one account's rows out of another's. Any new query over a user-owned table must include it, and
any new route over user data needs both an "invisible to another user" and a "direct access is 403/404"
test, matching the existing suites.

**Database:** `src/lib/db.ts` default-exports `get` / `all` / `run` / `transaction` over a `pg.Pool`,
with better-sqlite3-shaped names for historical reasons. Parameterized `$1` placeholders throughout.
Anything writing more than one row/table goes through `db.transaction` — the planner's freezer handoff
depends on it (planning a freezer meal copies the item's name onto the plan and deletes the freezer row;
`meal_plans.freezer_item_name` exists because the item is gone by then, so there is nothing to reference).

**Auth:** JWT only. No cookies, no server-side sessions. The token lives in `localStorage` under
`la_mia_cucina_token` and is sent as `Authorization: Bearer`. `JWT_SECRET` is mandatory in production
(the module throws at import time without it) and falls back to a dev constant otherwise.

**Recipe importer:** user-supplied URLs are fetched only through `src/lib/safeFetch.ts`, which resolves
DNS, rejects loopback/private/link-local/CGNAT addresses, revalidates every redirect hop by hand, and
caps body size. Any future server-side fetch of a user-supplied URL must go through it, not bare `fetch`.
`importController` prefers JSON-LD and falls back to cheerio heuristics.

**Uploads:** images are converted to base64 `data:` URIs and stored in the database as text — the
`uploads/` directory is created but nothing is written to it. 2 MB limit, jpeg/jpg/png/webp only.

**Frontend:** React 19 with no router library. `App.tsx` holds all navigation state and drives it from
`window.location.hash` (`#tab/id/edit`); the password-reset token is read off the URL and stripped.
There is no API client layer — each component calls `fetch('/api/...')` with the localStorage token
inline. Follow that pattern rather than introducing an abstraction for one call site.

**Styling:** Tailwind v4, configured entirely in `src/index.css` via `@theme` — there is no
`tailwind.config`. The palette (`cream`, `sage`, `terracotta`, `ochre`, `honey`, `earth`, `brick`) and
the component classes (`.btn-primary`, `.btn-accent`, `.btn-ghost`, `.panel`, `.label`, `.micro`,
`.rule`) are the design system: compose from those instead of raw hex or ad-hoc utility soup.

## Gotchas

- Do not set `NODE_ENV` in `.env` — Vite rejects `NODE_ENV=production` there, and `npm start` sets it.
- `DATABASE_SSL` is decided from the connection host, not `NODE_ENV`: TLS on for everything except localhost.
- Two API behaviours are deliberately pinned by tests as-is, and documented in `tests/README.md`:
  `servings: 0` is stored as `1` (`parseInt(0) || 1`), and an invalid freezer `type` surfaces the CHECK
  constraint as a 500 rather than a 400. Fixing either means updating its test.
- Keep this repo out of iCloud/Dropbox — syncing `node_modules` corrupts Vite's esbuild binary.
