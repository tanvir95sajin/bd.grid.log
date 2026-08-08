import glob
import os
import re
import json

folder = r'e:\Research\NLDC Dataset\01. Carbon Intensity\Raw Data'
out_folder = r'e:\Research\NLDC Dataset\01. Carbon Intensity\Raw Data\json_outputs'

xlsx_files = sorted(glob.glob(os.path.join(folder, '*.xlsx')))
json_files = sorted(glob.glob(os.path.join(out_folder, '*.json')))


def parse_date_from_name(name):
    match = re.search(r'(\d{1,2})[-_ ](\d{1,2})[-_ ](\d{4})', name)
    if not match:
        return None
    day, month, year = match.groups()
    return f'{year}-{int(month):02d}-{int(day):02d}'


source_dates = []
for path in xlsx_files:
    date_value = parse_date_from_name(os.path.basename(path))
    if date_value:
        source_dates.append(date_value)

json_dates = []
for path in json_files:
    base = os.path.splitext(os.path.basename(path))[0]
    if re.match(r'\d{4}-\d{2}-\d{2}$', base):
        json_dates.append(base)

source_unique = sorted(set(source_dates))
json_unique = sorted(set(json_dates))

print('xlsx_files', len(xlsx_files))
print('source_unique_dates', len(source_unique))
print('json_files', len(json_files))
print('json_unique_dates', len(json_unique))
print('source_date_range', source_unique[0] if source_unique else None, 'to', source_unique[-1] if source_unique else None)
print('json_date_range', json_unique[0] if json_unique else None, 'to', json_unique[-1] if json_unique else None)
print('duplicate_source_dates', len(source_dates) - len(source_unique))
print('source_dates_sample', source_unique[:10])
print('json_dates_sample', json_unique[:10])
