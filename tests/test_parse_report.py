import os
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from parse_report import parse_one


class ParseReportTests(unittest.TestCase):
    def test_parse_one_extracts_summary_and_zones(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "sample.xlsx"
            wb = Workbook()
            ws = wb.active
            ws.title = "Forecast"
            ws.append([None, None, None, None, None])
            ws.append([None, None, None, None, None])
            ws.append([None, None, None, None, None])
            ws.append([None, None, None, None, None])
            ws.append([None, None, None, None, None])
            ws.append([None, None, "Date :", "31-03-2026", None])
            ws.append([None, None, None, "System Summary Report", None])
            ws.append([None, "Day Peak Generation", None, None, 12570.15])
            ws.append([None, "Day Peak Demand", None, None, 12905.15])
            ws.append([None, "Evening Peak Generation", None, None, 13839.85])
            ws.append([None, "Evening Peak Demand", None, None, 13999.38])
            ws.append([None, "Minimum Generation of the Day", None, None, 10570.0])
            ws.append([None, "Maximum Generation of the Day", None, None, 13839.85])
            ws.append([None, None, None, "Zone-wise Generation Summary (MKWHr.)", None])
            ws.append([None, None, None, None, None])
            ws.append([None, None, None, "Gas", "Coal", "HFO", "HSD", "Hydro", "Solar", "Import", "Wind", "Total"])
            ws.append(["Dhaka Zone", None, None, 28.32193091, 0, 8.995643, 0, 0, 0.144636, 0, 0, 37.46220991])
            ws.append(["Chattogram Zone", None, None, 5.629785, 50.64726964, 2.4253416, 0, 1.92204, 0.139956, 0, 0.1704, 60.93479224])
            wb.save(path)

            date_str = parse_one(path)

            self.assertEqual(date_str, "2026-03-31")
            with open(path.with_suffix('.json'), 'r', encoding='utf-8') as fh:
                payload = parse_one.__globals__["json"].loads(fh.read())
            self.assertIn("summary", payload)
            self.assertIn("day_peak_generation", payload["summary"])


if __name__ == "__main__":
    unittest.main()
