# La Mia Cucina

A personal kitchen management application for recipes, freezer inventory, and weekly meal planning.

## Features

- **Recipes:** Ingredients, instructions, timings, photos, and categories.
- **Freezer Inventory:** Tracks ingredients and "ready made meals" separately.
- **Meal Planner:** Weekly calendar fed from your recipes or your freezer. Planning a freezer
  meal takes the item out of the freezer and records its name on the plan.
- **Recipe Importer:** Scrapes a recipe from a URL, preferring JSON-LD and falling back to
  heuristics.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- [npm](https://www.npmjs.com/)
- A PostgreSQL database — the app is built against [Supabase](https://supabase.com/)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   At minimum, set `DATABASE_URL` to your Supabase connection string and `JWT_SECRET` to any
   long random string. SMTP values are only needed for password-reset emails.

3. **Create the schema.** There is no migration runner — SQL is applied by hand:
   ```bash
   psql "$DATABASE_URL" -f supabase_schema.sql
   psql "$DATABASE_URL" -f migrations/001_meal_plan_freezer_name.sql
   ```
   Run the files in `migrations/` in numerical order. They are idempotent, so re-running them
   is safe. Apply new migrations *before* deploying the code that needs them.

4. **Seed some demo data (optional):**
   ```bash
   npm run seed
   ```
   Creates `chef@lamiacucina.com` with password `password123`, plus a couple of recipes. Safe
   to re-run; it skips anything already present.

5. **Run it:**
   ```bash
   npm run dev
   ```
   Available at `http://localhost:3000`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase) | — (required) |
| `JWT_SECRET` | Secret used to sign session tokens. Required in production; a development fallback is used when unset | `mia-cucina-jwt-secret-dev` |
| `DATABASE_SSL` | Force TLS on or off. By default it is on for every host except `localhost` | auto |
| `PORT` | Port the server listens on | `3000` |
| `VITE_APP_URL` | Public origin used to build password-reset links. Falls back to the request's own host | request host |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Mail server for password resets | — |
| `SMTP_SECURE` | Force TLS for SMTP | `true` when port is 465 |
| `SMTP_FROM` | From address on outgoing mail | `noreply@lamiaCucina.com` |
| `DEV_ALLOWED_HOSTS` | Comma-separated hosts allowed to reach the dev server through a tunnel or proxy | none |

Do **not** set `NODE_ENV` in `.env`: Vite rejects `NODE_ENV=production` there, and `npm start`
sets it for you.

## Scripts

- `npm run dev` — Express plus Vite dev middleware, with HMR.
- `npm run build` — builds the frontend into `dist/`.
- `npm start` — production mode: serves `dist/` and never starts Vite. Run `npm run build` first.
- `npm run lint` — type-checks the whole project with `tsc --noEmit` (strict).
- `npm run seed` — seeds demo data.
- `npm run clean` — removes `dist/`.

## Architecture

One Node process serves everything. `server.ts` mounts the API under `/api/*` and hands every
other URL to the frontend — Vite middleware in development, the static `dist/` build in
production. Requests carry a JWT in an `Authorization: Bearer` header; `isAuthenticated` verifies
it and sets `req.user.userId`, which every controller uses to scope its SQL. There are no cookies
and no server-side sessions.

```
server.ts              Express app: API routers, then the frontend
src/routes/            One thin router per feature
src/controllers/       Validation, business rules, and SQL
src/lib/db.ts          pg.Pool wrapper: get / all / run / transaction
src/lib/auth.ts        JWT middleware and token signing
src/lib/safeFetch.ts   URL guard for the recipe importer
src/components/        React UI (hash-based routing, no router library)
migrations/            Numbered SQL, applied by hand
```

## Deployment

The host must run `npm run build` before `npm start`, and set `NODE_ENV=production`,
`DATABASE_URL`, `JWT_SECRET`, and `VITE_APP_URL` (the public origin, so reset emails link to the
right place). `PORT` is read from the environment.

## Troubleshooting

**`Cannot start service: Host version ... does not match binary version ...`**
Vite's esbuild binary has been renamed or corrupted, usually by a file-sync client. Reinstall:

```bash
rm -rf node_modules && npm ci
```

Keep the repository out of iCloud Drive, Dropbox, or any synced folder — syncing
`node_modules` renames duplicate files and breaks native binaries.

**`Port 3000 is already in use`**
An earlier dev server is still running. Stop it, or use `PORT=3001 npm run dev`.

## Tech Stack

- **Frontend:** React 19, Tailwind CSS v4, Lucide icons, Motion.
- **Backend:** Node.js, Express, PostgreSQL (`pg`).
- **Tooling:** Vite, tsx, TypeScript in strict mode.
