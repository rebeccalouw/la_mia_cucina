#!/usr/bin/env bash
# Runs the Robot Framework API suites against a running instance of the app.
#
#   tests/run_tests.sh                        # everything
#   tests/run_tests.sh --include planner      # one area, by tag
#   tests/run_tests.sh --exclude network      # skip the tests that reach the internet
#   BASE_URL=http://localhost:4000 tests/run_tests.sh
#
# Any extra arguments are passed straight to robot.
set -euo pipefail

cd "$(dirname "$0")"

VENV="${VENV:-.venv}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

if [ ! -x "$VENV/bin/robot" ]; then
  echo "No Robot Framework in $VENV. Create it with:" >&2
  echo "  python3 -m venv tests/.venv" >&2
  echo "  tests/.venv/bin/pip install -r tests/requirements.txt" >&2
  exit 1
fi

if ! curl -sf -o /dev/null "$BASE_URL/api/categories" --max-time 5 \
  && ! curl -s -o /dev/null "$BASE_URL/api/categories" --max-time 5; then
  echo "Nothing is answering at $BASE_URL. Start the app with \`npm run dev\`." >&2
  exit 1
fi

exec "$VENV/bin/robot" \
  --outputdir results \
  --variable BASE_URL:"$BASE_URL" \
  "$@" \
  api
