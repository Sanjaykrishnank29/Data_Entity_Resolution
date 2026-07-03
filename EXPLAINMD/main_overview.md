# `main.py` - Architectural Overview

The `main.py` file is the absolute core of the DataDNA application. It is over 1,200 lines long, but you don't need to read it line-by-line to understand it. 

Think of `main.py` as the **Grand Orchestrator** of the system. It doesn't do all the detailed math itself—instead, it provides the web server, handles the data coming in, delegates the hard work to the other files (like `scorer.py` and `normalize.py`), and then routes the final answers back to the user interface.

Here is a conceptual breakdown of exactly what `main.py` is doing and how it is organized.

---

## 1. The FastAPI Web Server Setup
At its foundation, `main.py` is a FastAPI application. 
*   **Startup Lifespan:** When you run the app, it automatically spins up two background tasks:
    1.  A **File Watcher** (from `file_watcher.py`) that constantly monitors the `data2/` directory for new CSV files.
    2.  A **Live Feed Generator** that simulates fake patient data flowing in every 3 seconds for the dashboard.
*   **Database Init:** It connects to the SQLite database (using `database.py`) and ensures all tables are created.

## 2. API Endpoints (The "Doors" to the Engine)
`main.py` defines all the URLs that the React frontend calls to interact with the backend. These are split into logical groups:
*   **Ingestion APIs (`/ingest/...`)**: Endpoints that accept CSV uploads, single JSON patient records, or entire folders of data. When these are called, they trigger the core pipeline.
*   **Dashboard Stats (`/dashboard-stats`)**: Quickly calculates how many records exist, how many duplicates were caught, and the overall data quality score.
*   **Real-time Checks (`/check-duplicate`)**: An instant API that takes a single patient record, normalizes it, scores it against the database, and returns `true` if a duplicate exists within 200 milliseconds.
*   **Golden Record APIs**: Fetches the final, resolved master entities and their "breakdown lineage" (which shows exactly which hospital provided which piece of data).

## 3. WebSockets (Live Telemetry)
The frontend dashboard looks alive because `main.py` maintains active, persistent connections.
*   `/ws/engine-log`: As the backend processes thousands of records, it streams text logs here so the UI can show a live terminal.
*   `/ws/live-feed`: Pushes the simulated 3-second patient data straight to the Live Monitoring screen.

## 4. The Core Pipeline: `run_pipeline_task()`
This is the most critical function in the file (around line 315). When a CSV is uploaded, this async task takes over. It acts as the manager connecting all the other files together:
1.  **Schema Match & Combine:** It standardizes the CSV columns.
2.  **Delegates to `normalize.py`:** Tells it to clean all the messy data.
3.  **Saves Source Records:** Writes the raw data to the database.
4.  **Delegates to `blocking.py`:** Generates keys to group similar records together.
5.  **Delegates to `scorer.py`:** Loops through the candidate pairs and mathematical scores their similarity.
6.  **Union-Find Clustering:** `main.py` actually contains a mathematical class called `UnionFind`. If pairs score above 90%, it mathematically chains them together into a "cluster" (meaning they are all the exact same person).
7.  **Delegates to `golden_record.py`:** Tells the conflict resolver to look at the cluster, pick the best values, and create the final Master Entity.

## Summary of Connections
If you look at the imports at the top of `main.py`, you can see its connections perfectly:
*   It talks to the **Database**: `database.py`, `models.py`
*   It talks to the **Algorithms**: `normalize.py`, `blocking.py`, `scorer.py`, `conflict_resolver.py`
*   It handles **Security/Provenance**: `audit.py`
*   It manages **AI/Analytics**: `ai_service.py`, `intelligence.py`

By understanding `main.py` as an orchestrator and traffic cop, the 1,200 lines become much easier to navigate!
