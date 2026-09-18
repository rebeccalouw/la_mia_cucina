#!/usr/bin/env bash
#
# PostToolUse build gate.
#
# Two checks, both of which are silent at edit time and expensive later:
#
#   1. Server-side relative imports must carry an explicit .ts extension.
#      tsconfig sets moduleResolution "bundler", so tsc resolves '../lib/db'
#      happily -- but tsx/Node ESM does not, and `npm run dev` dies on it.
#      tsc structurally cannot catch this; that is why the check exists.
#
#   2. `tsc --noEmit` over the project. This repo has no ESLint and no unit
#      tests, so the typecheck is the whole static-check story.
#
# Exit 2 on failure so the diagnostics feed straight back for correction.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

here="$(dirname "$0")"

payload=$(cat)

file_path=$(printf '%s' "$payload" | python3 -c 'import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
print(data.get("tool_input", {}).get("file_path", "") or "")
')

[ -n "$file_path" ] || exit 0

# Normalise to a repo-relative path.
rel="${file_path#"$PWD"/}"

case "$rel" in
    *.ts|*.tsx) ;;
    *) exit 0 ;;
esac

# Only files inside the tsconfig "include" set are our business.
case "$rel" in
    src/*|server.ts|seed.ts|vite.config.ts) ;;
    *) exit 0 ;;
esac

[ -f "$rel" ] || exit 0

errors=""

# --- Check 1: explicit .ts extension on server-side relative imports --------
#
# Scoped to server-side paths only. Frontend files are resolved by Vite and
# correctly omit extensions, so including them would be a false positive.
case "$rel" in
    server.ts|seed.ts|src/lib/*|src/controllers/*|src/routes/*)
        if bad_imports=$(python3 "$here/check_import_extensions.py" "$rel"); then
            :
        else
            errors+="Relative import(s) missing an explicit .ts extension:
$bad_imports

Server-side code is run directly by tsx, which requires the extension.
tsc will NOT flag this (moduleResolution is \"bundler\"), but 'npm run dev'
will fail at runtime. Add the .ts extension.
"
        fi
        ;;
esac

# --- Check 2: project typecheck --------------------------------------------
tsc_bin="./node_modules/.bin/tsc"
if [ -x "$tsc_bin" ]; then
    if ! tsc_output=$("$tsc_bin" --noEmit 2>&1); then
        errors+="Typecheck failed (tsc --noEmit):

$tsc_output
"
    fi
fi

if [ -n "$errors" ]; then
    printf '%s\n' "$errors" >&2
    exit 2
fi

exit 0
