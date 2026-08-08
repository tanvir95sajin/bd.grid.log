"""
Rebuilds data/index.json - the list of available dates the website reads
to populate the date picker. Run this after adding any new dated JSON
file to the data/ folder (i.e. after running parse_report.py on a new
day's PGCB report). parse_all.py calls this automatically already.

Usage:
    python3 build_index.py
"""

import json
import re
from pathlib import Path


def main():
    data_dir = Path(__file__).resolve().parent.parent / "data"
    summary_dir = data_dir / "summary"
    dates = []
    if summary_dir.exists():
        for f in summary_dir.glob("*.json"):
            if re.match(r"^\d{4}-\d{2}-\d{2}\.json$", f.name):
                dates.append(f.stem)

    dates.sort()

    with open(data_dir / "index.json", "w") as f:
        json.dump({"dates": dates}, f, indent=1)

    print(f"index.json written with {len(dates)} date(s): {dates}")


if __name__ == "__main__":
    main()
