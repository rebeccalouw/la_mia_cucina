# API tests

Robot Framework suites that exercise the La Mia Cucina HTTP API end to end: real requests
against a running app and a real database, no mocks.

## Setup

```bash
npm run test:api:setup     # python3 -m venv tests/.venv + pip install -r tests/requirements.txt
```

## Running

The app has to be up, and the suites write to whatever database it is pointed at — use a
development database, not one with data you care about.

```bash
npm run dev                            # in one terminal
npm run test:api                       # in another
```

`npm run test:api` forwards its arguments to `robot`, so any of the usual options work:

```bash
npm run test:api -- --include planner          # one area
npm run test:api -- --exclude network          # skip the tests that reach the internet
npm run test:api -- --test "Deleting A Plan Removes It"
BASE_URL=http://localhost:4000 npm run test:api
```

Results land in `tests/results/` — open `log.html` for the request-by-request detail of a
failure, `report.html` for the summary. Both are gitignored.

## Layout

| Path | What it holds |
|------|---------------|
| `api/*.robot` | One suite per area of the API |
| `resources/api.resource` | Session, auth, request wrappers, fixtures, cleanup |
| `resources/testdata.py` | Unique emails and names, plan dates, file fixtures |
| `fixtures/` | A 1×1 PNG and a text file, for the upload tests |

Tags are `api` plus the area (`auth`, `recipes`, `categories`, `freezer`, `planner`, `import`,
`upload`), and `network` on the one test that fetches a public page.

## How the suites are built

**Each suite owns its data.** A suite setup registers one or two fresh users with unique
`@robot.invalid` addresses, and the teardown deletes the recipes, freezer items and meal plans
that were created. Suites can be run repeatedly, in any order, against a database that already
has data in it. The user rows themselves stay behind — the API has no endpoint that deletes an
account — so a development database collects one or two rows per suite per run.

**Requests go through the wrappers in `api.resource`** (`Authorized GET`, `Authorized POST`,
and so on). Each takes the token to send and the status to expect, which is what lets an
endpoint's happy path, its 401, its 403 and its 404 all be written the same way.

**Ownership is checked from both sides.** Where a route is scoped to the caller, there is a test
that a second user's row is invisible to the first, and a test that reaching for it directly
gives 403 or 404 rather than data.

## Behaviour recorded as-is

Two tests describe what the API does today rather than what it arguably should do. Both say so
in their documentation:

- **`Zero Servings Is Stored As One Rather Than Rejected`** — `parseInt(0) || 1` reads a zero as
  "not given", so `servings: 0` is saved as `1` instead of being refused by the validation that
  claims servings must be at least one. Negative values are refused correctly.
- **`Creating An Item With A Type The Column Forbids Fails`** — a freezer `type` other than
  `ingredient` or `meal` violates a CHECK constraint, and the controller reports that as a 500
  rather than validating the field and answering 400.

If either is fixed, the test is the thing to update.
