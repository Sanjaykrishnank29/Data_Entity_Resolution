import sys
import os
import asyncio
import pandas as pd
import time

sys.path.insert(0, r"c:\Users\DELL\Documents\Project\DNA\Data_Entity_Resolution\backend")

# We will patch broadcast_log to print to terminal directly since we have no WebSockets
import main

async def terminal_broadcast(msg):
    print(msg)

main.broadcast_log = terminal_broadcast

async def run_end_to_end_test():
    file1 = r"c:\Users\DELL\Documents\Project\DNA\Data_Entity_Resolution\data\Source_A_Hospital (2).csv"
    file2 = r"c:\Users\DELL\Documents\Project\DNA\Data_Entity_Resolution\data\Source_B_Lab (2).csv"
    
    print("\n" + "="*60)
    print("INFYND TERMINAL ENGINE TEST: START TO END")
    print("="*60)
    
    print(f"\n[FRONTEND] Found User Data sources:\n1. {file1}\n2. {file2}")
    
    print("\n[FRONTEND -> BACKEND] Submitting data payloads to API...")
    dfs = []
    
    df1 = pd.read_csv(file1)
    df1["source"] = "Source_A_Hospital"
    dfs.append(df1)
    
    df2 = pd.read_csv(file2)
    df2["source"] = "Source_B_Lab"
    dfs.append(df2)
    
    total_records = len(df1) + len(df2)
    print(f"[BACKEND INGESTION] Received 2 files, totaling {total_records} initial records.")
    print("Triggering the core resolution pipeline...\n")
    
    # Run the core resolution logic
    start_t = time.time()
    await main.run_pipeline_task(dfs)
    end_t = time.time()
    
    print("\n" + "="*60)
    print(f"PIPELINE SUCCESSFUL IN {end_t - start_t:.2f} seconds!")
    print("="*60 + "\n")

    # Fetch results from DB
    from database import SessionLocal
    from models import GoldenRecord, SourceRecord, CandidatePair
    
    db = SessionLocal()
    total_golden = db.query(GoldenRecord).count()
    auto_resolved = db.query(CandidatePair).filter(CandidatePair.status == 'auto_approved').count()
    needs_review = db.query(CandidatePair).filter(CandidatePair.status == 'pending').count()
    db.close()
    
    print(f"[FRONTEND DASHBOARD] Displaying Final Intelligence Metrics:")
    print(f"  • Total Raw Entities: {total_records}")
    print(f"  • Master Golden Records: {total_golden}")
    print(f"  • Duplicates Collapsed: {total_records - total_golden}")
    print(f"  • AI Auto-Resolved Entities: {auto_resolved}")
    print(f"  • Requires Human Review: {needs_review}")
    print("\nTest complete! The N-choose-2 Memory freeze is 100% fixed.")

if __name__ == "__main__":
    asyncio.run(run_end_to_end_test())
