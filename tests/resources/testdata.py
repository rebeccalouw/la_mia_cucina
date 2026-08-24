"""Test data helpers for the Robot Framework suites.

Every run works against its own freshly registered users, so suites can be run repeatedly
(and in parallel) against the same database without colliding on unique columns.
"""

import os
import secrets
import tempfile
from datetime import date, timedelta

FIXTURES = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fixtures")


def unique_token(length: int = 8) -> str:
    """Short random string, used to keep generated names and emails unique per run."""
    return secrets.token_hex(length // 2 or 4)


def unique_email(prefix: str = "rf") -> str:
    """An address in a reserved TLD, so a stray password-reset mail can never be delivered."""
    return f"{prefix}-{unique_token()}@robot.invalid"


def unique_name(prefix: str) -> str:
    return f"{prefix} {unique_token()}"


def plan_date(offset_days: int = 0) -> str:
    """A YYYY-MM-DD date, which is the only format the planner accepts."""
    return (date.today() + timedelta(days=offset_days)).isoformat()


def fixture_path(name: str) -> str:
    return os.path.join(FIXTURES, name)


def oversized_png_path(megabytes: int = 3) -> str:
    """Writes a .png larger than the upload limit, to exercise the 413 path.

    The bytes after the header are junk: multer rejects on declared size before anything
    tries to decode the image.
    """
    path = os.path.join(tempfile.gettempdir(), f"la-mia-cucina-oversized-{megabytes}mb.png")
    if not os.path.exists(path) or os.path.getsize(path) < megabytes * 1024 * 1024:
        with open(fixture_path("pixel.png"), "rb") as handle:
            header = handle.read()
        with open(path, "wb") as handle:
            handle.write(header)
            handle.write(b"\0" * (megabytes * 1024 * 1024))
    return path
