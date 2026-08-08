import glob
import os
import re

folder = r'e:\Research\NLDC Dataset\01. Carbon Intensity\Raw Data'
out = r'e:\Research\NLDC Dataset\01. Carbon Intensity\Raw Data\json_outputs'

xls_files = sorted(glob.glob(os.path.join(folder, '*.xlsx')))
json_files = sorted(glob.glob(os.path.join(out, '*.json')))

out_names = {os.path.splitext(os.path.basename(path))[0] for path in json_files}

missing = []
for path in xls_files:
    name = os.path.basename(path)
    match = re.search(r'(\d{4})[-_](\d{1,2})[-_](\d{1,2})', name)
    if match:
        year, month, day = match.groups()
        date_value = f'{year}-{int(month):02d}-{int(day):02d}'
        if date_value not in out_names:
            missing.append(name)

print('missing_count', len(missing))
for item in missing[:200]:
    print(item)
