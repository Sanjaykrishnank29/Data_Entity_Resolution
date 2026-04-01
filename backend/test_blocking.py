import sys
import os
import pandas as pd

sys.path.insert(0, r"c:\Users\Jenilia Karen\Documents\Projects\Hackathon Projects\Infynd\datadna\backend")
from blocking import get_candidate_pairs
from main import auto_schema_match
from normalize import normalize_all

csv_path = r"c:\Users\Jenilia Karen\Documents\Projects\Hackathon Projects\Infynd\datadna\data\Source_A_Hospital (2).csv"
print(f"Loading {csv_path}...")
df = pd.read_csv(csv_path)
print(f"Shape: {df.shape}")

df = auto_schema_match(df)
fn = df.get("first_name", pd.Series([""] * len(df)))
ln = df.get("last_name", pd.Series([""] * len(df)))
df["full_name"] = fn.astype(str) + " " + ln.astype(str)

print("Normalizing...")
df = normalize_all(df)
df["id"] = [str(i) for i in range(len(df))]

print("Blocking...")
import time
t0 = time.time()
pairs = get_candidate_pairs(df)
t1 = time.time()

print(f"Generated {len(pairs)} pairs in {t1-t0:.2f} seconds.")
