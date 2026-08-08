# Grid Log

A static, no-backend website showing Bangladesh's national power grid day by day: demand vs. generation, load-shedding, fuel mix, estimated CO2, division-level peak loads, and every individual power plant's output — all sourced from PGCB/NLDC's daily report.

No server, no database, no build step. It's plain HTML/CSS/JS reading JSON files, which is exactly what GitHub Pages hosts for free.

## How it's organized

```
index.html, plants.html, areas.html, substations.html   the four pages
style.css                                                 styling
app.js, plants.js, areas.js, substations.js               per-page logic (loads JSON, draws charts)
data/
  index.json               list of dates the site knows about
  summary/2026-06-09.json      Today + Areas pages read this - small, ~20 KB/day
  plants/2026-06-09.json       Plants page only - the big one, ~200 KB/day
  substations/2026-06-09.json  Substations page only - ~50 KB/day
tools/
  parse_report.py      turns a PGCB .xlsx into that date's three JSON files
  parse_all.py           runs parse_report.py over a whole folder of .xlsx files
  build_index.py          regenerates data/index.json after adding new dates
```

Each day's data is split into three files by what actually uses it, instead of one big file every page has to download regardless of what it needs. The Today page, for instance, never touches plant or substation detail, so it now only loads the ~20 KB summary file instead of the full ~270 KB. This is the reason the site can feel slow to load right after adding a lot of dates if you're on an older single-file version — see "Why the site feels slow" below.

## Adding a new day

Each time you get a new `Daily_Report_DD-MM-YYYY.xlsx` from PGCB:

```
python3 tools/parse_report.py path/to/Daily_Report_DD-MM-YYYY.xlsx
python3 tools/build_index.py
```

That's it. The first command reads the spreadsheet and writes a new `data/YYYY-MM-DD.json`. The second command updates the list of dates the site shows in the dropdown. Then commit and push (or upload through the GitHub website) — the live site updates automatically, no deploy step.

## Backfilling many days at once

Put every `.xlsx` file you have in one folder, then:

```
python3 tools/parse_all.py path/to/that/folder
```

It parses every file in the folder, writes one JSON per date, rebuilds `data/index.json` automatically, and keeps going even if one file fails — failures are listed at the end so you can fix and re-run just those. Order doesn't matter and dates don't need to be contiguous.

Note: PGCB's daily report is issued for "today" but the actual generation numbers inside it (GenLog, P1–P4, the curves) are for the day before. The parser already accounts for this — a file named `Daily_Report_10-06-2026.xlsx` produces `data/2026-06-09.json`.

## Backfilling 2025/2026

Run the two commands above once per file you have, in any order — dates don't need to be added in order, `build_index.py` sorts them. If PGCB's report layout ever changes (column order, sheet names), the parser will need small updates to match; it's built to fail loudly (a `None` value or a Python error) rather than silently, so a layout change should be obvious rather than showing wrong numbers.

## Pages

- `index.html` &mdash; today's overview: demand vs. generation, load-shedding, fuel mix, CO2, zone peak loads.
- `plants.html` &mdash; every named generating unit, running or offline, with capacity, fuel, and the report's stated reason for any that are offline.
- `areas.html` &mdash; generation by fuel and peak load, one tab per grid zone.
- `substations.html` &mdash; every substation's peak load (and when it happened) plus max/min voltage (and when).

## On plant counts

The report doesn't list plants in one consistent place: GenLog, the unit-wise generation sheet, and the forecast sheet each name units slightly differently (some dual-fuel units are split into two rows in one sheet and combined into one in another). The parser merges all three by name, so the plant count you see (175 for the sample day) is usually higher than what any single sheet lists on its own, not lower. If two entries that are really the same physical unit show up separately, that's a naming mismatch between sheets, not double-counted generation &mdash; each unit's output still only comes from GenLog once.

## On gas delivery data

This report only contains one national total for gas supply per day (in the system summary sheet, "Total Gas Supplied," in MMCFD). It's on the roadmap as a metric but there's no per-plant or per-source breakdown in this file to build a dedicated page from. If PGCB publishes that detail elsewhere, send it over and it can be added the same way as everything else here.

## About the CO2 numbers

These are **rough planning estimates**, not verified emissions:

| Fuel | Estimate used |
|---|---|
| Coal | 0.95 kg CO2/kWh |
| Gas | 0.45 kg CO2/kWh |
| Oil (HFO) | 0.73 kg CO2/kWh |
| Solar / Hydro | 0 |
| Adani import (coal-fired, India) | 0.95 kg CO2/kWh |
| HVDC / Nepal / Tripura imports | Not estimated — source generation mix isn't published in this report |

These are standard, commonly cited factors, not plant-specific measurements. Treat the total as "roughly this order of magnitude," not a precise figure — and say so on the site, which it already does.

## Local preview

Any static file server works, for example:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Why the site feels slow

If you're on the old version (one JSON file per day holding everything), every page — including Today, which doesn't need plant or substation detail at all — was downloading the full file, roughly 190-270 KB per day depending on how many plants were running. That's fine for one day, but it adds up as a one-time cost on every visit, not because of *how many dates exist* — the site only ever loads the single selected date, never all of them at once.

The current version splits each day into three files (see "How it's organized" above), so Today only pulls the ~20 KB it actually uses. If you're still seeing slowness after re-running the parser with the current `parse_report.py`, the most likely remaining cause is the map's one-time fetch of the Bangladesh boundary shape from GitHub on the Today page — that's an external request outside your control, and it already fails gracefully (the map still renders, just without the coastline) if it's ever slow or unavailable.

## Placeholders to edit

Everything on the site is real data except two cosmetic strings, repeated identically at the top of all four HTML files:

- The site name: `GRIDLOG` — one `<div class="brand-name">GRIDLOG</div>` line near the top of each of `index.html`, `plants.html`, `areas.html`, `substations.html`.
- The tagline underneath it: `Bangladesh national grid — daily` — the `<div class="brand-sub">` line right below the name, same four files.

Change both in all four files to keep them consistent. Everything else (page copy, footers, methodology notes) reflects what's actually in the data and isn't placeholder text.

## The zone map

The Today page includes a bubble map of PGCB's nine grid zones, sized and shaded by evening peak load, in `app.js` (search for `ZONE_COORDS`). It intentionally does not plot individual plants or substations — this report has no coordinates for them, and the nine points on the map are approximate city-level positions for each zone's namesake city, not precise sites. If you get a coordinates file for plants or substations (even a rough one), that's a straightforward addition: a lat/long per name, plotted the same way.

## Deploying

See the setup walkthrough you were given in chat, or GitHub's own docs: Settings &rarr; Pages &rarr; Deploy from a branch &rarr; main / (root).

## Data source and attribution

Data: Power Grid Bangladesh PLC (PGCB), National Load Dispatch Center (NLDC) daily reports. This is an independent project, not affiliated with or endorsed by PGCB. Confirm redistribution is acceptable with PGCB directly, especially once ads or sponsorships are added.
