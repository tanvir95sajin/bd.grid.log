import datetime
import glob
import os
import re

folder = r'e:\Research\NLDC Dataset\01. Carbon Intensity\Raw Data'
out = r'e:\Research\NLDC Dataset\01. Carbon Intensity\Raw Data\json_outputs'

xls_files = sorted(glob.glob(os.path.join(folder, '*.xlsx')))
json_files = sorted(glob.glob(os.path.join(out, '*.json')))


def parse_date_from_name(name):
    match = re.search(r'(\d{4})[-_](\d{1,2})[-_](\d{1,2})', name)
    if match:
        year, month, day = match.groups()
        try:
            return datetime.date(int(year), int(month), int(day)).strftime('%Y-%m-%d')
        except ValueError:
            return None
    return None

xls_dates = []
for path in xls_files:
    date_value = parse_date_from_name(os.path.basename(path))
    if date_value:
        xls_dates.append(date_value)

json_dates = [os.path.splitext(os.path.basename(path))[0] for path in json_files]
missing = [date_value for date_value in xls_dates if date_value not in json_dates]

print('xlsx count', len(xls_dates))
print('json count', len(json_dates))
print('missing count', len(missing))
for item in missing[:200]:
    print(item)
