# DataDNA 🧬 - Project Context for AI Assistants

This document contains a comprehensive technical and functional overview of the **DataDNA** project. It is uniquely structured to be provided to Large Language Models (LLMs) to grant them deep contextual understanding for generating content—such as LinkedIn posts, technical blogs, tweets, or architectural documents.

## 🎯 1. High-Level Overview
**DataDNA** is a robust, end-to-end **Healthcare Entity Resolution Engine and Master Data Management (MDM) platform**. It ingests raw, unstructured, and fragmented clinical data from assorted sources, resolves conflicts (duplicate records, misspellings, varying schemas), and produces unified, perfectly reconciled **Golden Records**. 

The core value proposition is **Master Patient Indexing (MPI)**—ensuring that a healthcare provider or enterprise has one unified, single source of truth for every patient, regardless of where the data originated.

## 🏗️ 2. Core Architecture & Tech Stack

### Backend (The Engine)
- **Framework:** FastAPI (Python 3.9+)
- **Database:** SQLite via SQLAlchemy ORM
- **Data Processing:** Pandas (for batch data normalization and schema matching)
- **Concurrency & Telemetry:** `asyncio` and WebSockets for real-time pipeline telemetry and live-feed monitoring.
- **Key Modules:** Auto-Schema Matching, Configurable Normalization, Multi-Stage Blocking, Probabilistic Scoring, Conflict Resolution, Golden Record Generation.

### Frontend (The Dashboard)
- **Framework:** React 19 (via Vite)
- **Styling:** TailwindCSS
- **Routing:** React Router DOM v7
- **Data Visualization & Analytics:** Recharts, D3.js, `react-force-graph-2d` for Identity Graph rendering, Lucide-React for rich iconography.
- **Key Interfaces:** Command Center, Data Explorer, Live Monitoring, Intelligence Hub (Review Queue).

## 🧠 3. Advanced Algorithmic Pipeline
The data ingestion pipeline follows a strict, highly optimized sequence:

1. **Auto-Schema Matching:** Intelligently maps varying column names across organizations (e.g., `Date_of_Birth`, `DOB`, `birthdate`) into unified canonical formats using comprehensive alias dictionaries.
2. **Standardization & Normalization:** Cleans and formats data systematically (e.g., standardizing phone numbers, stripping whitespace, casing fixes).
3. **Multi-Stage Blocking:** Triggers an initial reduction of the search space (blocking by deterministic keys like `primary_bucket` and `insurance_bucket`) to avoid $O(N^2)$ comparisons on large datasets.
4. **Probabilistic Scoring:** Compares filtered candidate pairs using advanced ML and heuristics:
   - *Phonetic Algorithms:* Metaphone (via `jellyfish`) to catch transcription errors, typos, and auditory similarities.
   - *String Distance Metrics:* Levenshtein Edit Distance, TF-IDF.
   - *Decay detection:* Evaluates if data is stale or recently altered over time.
5. **Union-Find Clustering:** Uses a deterministic Union-Find algorithm (Disjoint Set) to confidently cluster networks of duplicate identities representing the same physical human (typically for comparisons >90% confidence).
6. **Conflict Resolution & Golden Records:** Elects the highest-confidence values across all sources for fields like name, address, insurance_id, diagnosis, and allergies. Synthesizes a single `GoldenRecord`.
7. **Human-in-the-Loop (Intelligence Hub):** Pairs falling into the uncertainty threshold (60%-89%) are safely placed in a queue for manual steward review. Their decisions update the model's `FeedbackWeight` for continuous improvement.

## 📈 4. Key Platform Features

- **Unified Identity Engine:** The AI-driven heart of the system operating the deduplication and reconciliation logic in the background.
- **Live Interactive Dashboards (Command Center):** High-level statistical observability over unification rates, overall data quality scores, duplicate catch rates, and unresolved anomalies.
- **Intelligence Hub:** A bespoke UI layer intentionally built for data stewards to accept, reject, or investigate uncertain identity matches.
- **Live Monitoring:** A real-time WebSocket connection to the backend telemetry loop, broadcasting incoming records, auto-merges, algorithm execution times, and processing latencies live.
- **Identity Graph:** A dynamic, force-directed 2D node graph showing lineage, visually connecting Source Records to their resolved Golden nodes and edge confidences.
- **AI Chat Assistant:** A global floating chat window empowering users to query their underlying data structures and platform statistics using Natural Language.

## 🔐 5. Security, Provenance & Auditability
- **Data Lineage:** Every Golden Record strictly tracks the precise origin of each field (the `field_sources` and `lineage` JSON columns), enabling deep provenance tracking down to the exact CSV/API source.
- **Audit Logs:** Every algorithmic pipeline action, whether automatic or human-triggered, is persistently tracked in `audit_logs`.
- **Privacy Fingerprinting:** Records are passively "fingerprinted" using irreversible probabilistic privacy functions (e.g., hashing DOB + Insurance + Metaphone Name) to measure network overlap.

## 📝 6. Guidance for LLMs (Metadata Generation)
When generating content (like LinkedIn posts) about DataDNA, heavily emphasize its **scale, enterprise-grade architecture, and the complexity of the identity resolution algorithms**. It is not just a standard CRUD app; it is a high-performance clinical data pipeline that elegantly handles probabilistic matching, phonetic deduplication, union-find clustering, and streaming WebSocket telemetry, all beautifully wrapped in a fast, analytic-heavy React SPA dashboard.
