import glob
import os
import sys

sys.path.insert(0, r'e:\Research\NLDC Dataset\01. Carbon Intensity\Raw Data')
import parse_report

folder = r'e:\Research\NLDC Dataset\01. Carbon Intensity\Raw Data'
out = r'e:\Research\NLDC Dataset\01. Carbon Intensity\Raw Data\json_outputs'
for path in sorted(glob.glob(os.path.join(folder, '*.xlsx'))):
    try:
        parse_report.parse_one(path, out)
        print('OK', os.path.basename(path))
    except Exception as e:
        print('FAIL', os.path.basename(path), type(e).__name__, e)
