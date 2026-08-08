import os
import glob

folder = r'e:\Research\NLDC Dataset\01. Carbon Intensity\Raw Data'
files = sorted(glob.glob(os.path.join(folder, '*.xlsx')))
print('total xlsx', len(files))
for name in files[:40]:
    print(os.path.basename(name))
