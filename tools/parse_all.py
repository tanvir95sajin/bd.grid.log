"""
Parse every PGCB daily report in a folder at once, then rebuild the date
index. This is the tool to use for backfilling - point it at a folder
containing all your 2025/2026 Daily_Report_*.xlsx files.

Usage:
    python3 parse_all.py path/to/folder/of/xlsx/files

Files that fail to parse are reported at the end and skipped - they don't
stop the rest of the batch.
"""

import sys
from pathlib import Path

from parse_report import parse_one
import build_index


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 parse_all.py path/to/folder")
        sys.exit(1)

    folder = Path(sys.argv[1])
    files = sorted(folder.glob("*.xlsx"))
    if not files:
        print(f"No .xlsx files found in {folder}")
        sys.exit(1)

    print(f"Found {len(files)} file(s) in {folder}\n")

    succeeded = []
    failed = []
    for path in files:
        print(f"--- {path.name} ---")
        try:
            date_str = parse_one(path)
            succeeded.append((path.name, date_str))
        except Exception as e:
            print(f"  FAILED: {e}")
            failed.append((path.name, str(e)))
        print()

    print("=" * 50)
    print(f"Done: {len(succeeded)} succeeded, {len(failed)} failed")
    if failed:
        print("\nFailed files (fix and re-run just these):")
        for name, err in failed:
            print(f"  {name}: {err}")

    build_index.main()


if __name__ == "__main__":
    main()
