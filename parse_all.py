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

try:
    import build_index
except ModuleNotFoundError:
    build_index = None


def main():
    if len(sys.argv) not in (2, 3):
        print("Usage: python3 parse_all.py path/to/folder [output_folder]")
        sys.exit(1)

    folder = Path(sys.argv[1])
    output_folder = Path(sys.argv[2]) if len(sys.argv) == 3 else folder / "json_outputs"
    output_folder.mkdir(parents=True, exist_ok=True)

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
            date_str = parse_one(path, output_folder)
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

    if build_index is not None:
        build_index.main()
    else:
        print("Skipping index rebuild because build_index.py is not available.")


if __name__ == "__main__":
    main()
