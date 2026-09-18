"""Flag server-side relative imports that omit an explicit .ts extension.

tsconfig sets moduleResolution "bundler", so tsc resolves '../lib/db' without
complaint -- but the backend is run directly by tsx, which requires the
extension, and `npm run dev` fails at runtime. tsc cannot catch this, which is
the whole reason this check exists.

Usage: check_import_extensions.py <file>
Prints one line per offending import; exits 1 if any were found.
"""

import re
import sys

ALLOWED = (".ts", ".tsx", ".css", ".json")

# from './x'  |  import './x'  |  export ... from './x'  |  import('./x')
PATTERN = re.compile(r"""(?:from|import)\s*\(?\s*['"](\.[^'"]*)['"]""")


def main() -> int:
    path = sys.argv[1]

    try:
        with open(path, encoding="utf-8") as fh:
            lines = fh.readlines()
    except OSError:
        return 0

    found = False
    for number, line in enumerate(lines, 1):
        stripped = line.lstrip()
        if stripped.startswith("//") or stripped.startswith("*"):
            continue
        for specifier in PATTERN.findall(line):
            if not specifier.endswith(ALLOWED):
                print(f"  {path}:{number}  {specifier}")
                found = True

    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
