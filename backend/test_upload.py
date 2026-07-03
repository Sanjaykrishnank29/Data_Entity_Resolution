import httpx
import time

url = "http://127.0.0.1:8001/api/ingest/csv"

files_to_upload = [
    r"c:\Users\DELL\Documents\Project\DNA\Data_Entity_Resolution\data\Source_A_Hospital (2).csv",
    r"c:\Users\DELL\Documents\Project\DNA\Data_Entity_Resolution\data\Source_B_Lab (2).csv"
]

print("Starting concurrent file upload to Infynd Engine...")

with httpx.Client() as client:
    for file_path in files_to_upload:
        with open(file_path, "rb") as f:
            print(f"Uploading {file_path}...")
            response = client.post(url, files={"file": (file_path.split("\\")[-1], f, "text/csv")})
            print("Response:", response.json())

print("Uploads initiated. Check uvicorn terminal for pipeline step-by-step logs.")
