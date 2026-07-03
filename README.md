# 🧬 DataDNA — Healthcare Entity Resolution Engine

<div align="center">

![DataDNA Banner](https://img.shields.io/badge/DataDNA-Healthcare%20MDM%20Platform-6366f1?style=for-the-badge&logo=dna&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python%203.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A robust, end-to-end Master Data Management (MDM) platform that ingests fragmented clinical data, resolves conflicts using advanced probabilistic algorithms, and produces unified Golden Records.**

[Features](#-key-features) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Setup](#-getting-started) • [Usage](#-how-to-use)

</div>

---

## 🎯 What is DataDNA?

**DataDNA** is an enterprise-grade **Healthcare Entity Resolution Engine** built to solve one of the most critical problems in healthcare data management — **patient identity duplication**.

Healthcare organizations ingest data from dozens of disconnected systems (EHRs, labs, insurance portals, pharmacies), each with its own schema, formatting conventions, and inconsistencies. DataDNA intelligently unifies all of this into a single, authoritative **Golden Record** per patient — the foundation of **Master Patient Indexing (MPI)**.

> 💡 *It is not a standard CRUD app. It is a high-performance clinical data pipeline that handles probabilistic matching, phonetic deduplication, union-find clustering, and streaming WebSocket telemetry — all wrapped in a fast, analytics-heavy React SPA dashboard.*

---

## ✨ Key Features

### 🔗 1. Unified Identity Engine
| Feature | Description |
|---|---|
| **Auto-Schema Matching** | Intelligently maps varying column names (e.g., `Date_of_Birth`, `DOB`, `birthdate`) into canonical formats using alias dictionaries |
| **Probabilistic Scoring** | Uses phonetic algorithms (Metaphone), Levenshtein Edit Distance, and TF-IDF to accurately flag matching identities even with typos or name changes |
| **Union-Find Clustering** | Groups networks of duplicate identities using a deterministic Disjoint Set algorithm for high-confidence (>90%) matches |
| **Golden Record Creation** | Merges duplicate subsets by electing the highest-confidence value across `name`, `address`, `insurance_id`, `diagnosis`, and `allergy` |

### 📊 2. Live Interactive Dashboards
| Dashboard | Description |
|---|---|
| **Command Center** | High-level statistical observability over identity unification rates, duplicate catch rates, and aggregate Data Quality Scores |
| **Intelligence Hub** | Review queue for data stewards to manually accept, investigate, or reject uncertain identity matches (60%–90% confidence range) |
| **Live Monitoring** | Real-time WebSocket connection to backend telemetry, broadcasting ingestion events, processing times, and pipeline logs live |
| **Identity Graph** | Force-directed 2D node graph showing lineage — connecting Source Records to their resolved Golden Nodes with edge confidence scores |

### 🤖 3. Integrated AI Analytics
- **AI Chat Assistant** — Query your data using Natural Language directly in the dashboard
- **Data Explorer** — Search, view resolution lineage, unmask privacy-locked data points, and trace exact match provenance
- **Audit Logs** — Every algorithmic action (automatic or human-triggered) is persistently tracked for compliance

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        DataDNA Platform                      │
│                                                              │
│  ┌─────────────┐    ┌──────────────────────────────────┐    │
│  │  React SPA  │◄──►│         FastAPI Backend           │    │
│  │  (Vite)     │    │                                  │    │
│  │             │    │  ┌──────────────────────────┐    │    │
│  │ • Command   │    │  │   Entity Resolution      │    │    │
│  │   Center    │    │  │   Pipeline               │    │    │
│  │ • Intel Hub │    │  │                          │    │    │
│  │ • Live Feed │    │  │  1. Schema Matching      │    │    │
│  │ • Identity  │    │  │  2. Normalization        │    │    │
│  │   Graph     │    │  │  3. Multi-Stage Blocking │    │    │
│  │ • AI Chat   │    │  │  4. Probabilistic Score  │    │    │
│  └─────────────┘    │  │  5. Union-Find Cluster   │    │    │
│         ▲           │  │  6. Conflict Resolution  │    │    │
│         │           │  │  7. Golden Record Gen    │    │    │
│    WebSocket        │  └──────────────────────────┘    │    │
│    REST API         │           │                       │    │
│                     │    ┌──────▼──────┐                │    │
│                     │    │   SQLite DB │                │    │
│                     │    │ (SQLAlchemy)│                │    │
│                     │    └─────────────┘                │    │
│                     └──────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧠 Algorithmic Pipeline

The ingestion pipeline follows a strict, highly optimized 7-stage sequence:

```
Raw CSV Data
     │
     ▼
┌─────────────────────────┐
│ 1. Auto-Schema Matching │  ← Maps inconsistent columns to canonical fields
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 2. Normalization        │  ← Cleans phones, dates, names, addresses
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 3. Multi-Stage Blocking │  ← Reduces O(N²) to manageable candidate pairs
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 4. Probabilistic Scoring│  ← Metaphone + Levenshtein + TF-IDF
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 5. Union-Find Clustering│  ← Confident matches (>90%) are auto-merged
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 6. Conflict Resolution  │  ← Elects best field values per cluster
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 7. Golden Record        │  ← Single source of truth per patient
└─────────────────────────┘
        ↕ (60-89% confidence)
┌─────────────────────────┐
│ Intelligence Hub Queue  │  ← Human-in-the-loop review
└─────────────────────────┘
```

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | High-performance async REST API framework |
| **SQLAlchemy + SQLite** | ORM-based relational data persistence |
| **Pandas** | Batch data normalization and schema processing |
| **jellyfish** | Phonetic algorithms (Metaphone) for fuzzy name matching |
| **asyncio + WebSockets** | Real-time pipeline telemetry streaming |
| **Custom Algorithms** | Union-Find, Edit Distance, TF-IDF Blocking |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19 + Vite** | Fast, modern SPA framework |
| **TailwindCSS** | Utility-first styling |
| **Recharts + D3.js** | Interactive data visualization and charting |
| **react-force-graph-2d** | Dynamic Identity Graph rendering |
| **React Router v7** | Client-side routing |
| **Lucide React** | Rich icon library |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- **uv** (Python package manager) or **pip**

### 1. Clone the Repository

```bash
git clone https://github.com/Sanjaykrishnank29/Data_Entity_Resolution.git
cd Data_Entity_Resolution
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server (port 8001)
uvicorn main:app --reload --port 8001
```

> ✅ Backend is now running at `http://localhost:8001`

### 3. Frontend Setup

```bash
# Open a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

> ✅ Frontend is now running at `http://localhost:5173`

---

## 📖 How to Use

| Step | Action |
|---|---|
| **1. Ingest Data** | Go to the **Data Ingestion** tab → upload CSVs or trigger the pipeline with sample data from `data2/` |
| **2. Monitor Processing** | Open **Live Monitoring** to watch real-time WebSocket telemetry as records are processed |
| **3. Review Matches** | Visit **Intelligence Hub** to approve or reject uncertain identity pairs (60–89% confidence) |
| **4. Explore Results** | Use **Data Explorer** to search patients, view Golden Records, and trace resolution lineage |
| **5. Chat with Data** | Open the **AI Chat Assistant** to query statistics and insights using natural language |

---

## 🔐 Security & Auditability

- **Data Lineage** — Every Golden Record tracks the precise origin of each field via `field_sources` and `lineage` JSON columns
- **Audit Logs** — All pipeline actions (auto-merge, manual reviews, rejections) are persistently logged
- **Privacy Fingerprinting** — Records are passively fingerprinted using irreversible probabilistic hashing (DOB + Insurance + Metaphone Name) to measure network overlap without exposing raw PII

---

## 📁 Project Structure

```
Data_Entity_Resolution/
├── backend/                  # FastAPI engine & core algorithms
│   ├── main.py               # API entry point
│   ├── ai_service.py         # AI Chat assistant service
│   ├── conflict_resolver.py  # Conflict resolution & Golden Record logic
│   ├── file_watcher.py       # File ingestion watcher
│   └── live_feed.py          # WebSocket telemetry service
├── frontend/                 # React + Vite dashboard
│   └── src/
│       ├── pages/            # Command Center, Intel Hub, Explorer, etc.
│       └── components/       # Reusable UI components
├── data/                     # Sample datasets
├── data2/                    # Additional sample CSVs for testing
├── EXPLAINMD/                # Deep-dive documentation
├── instructions.md           # Detailed setup guide
├── AI_CONTEXT.md             # AI assistant context document
└── README.md                 # This file
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [Sanjay Krishna](https://github.com/Sanjaykrishnank29)**

⭐ Star this repo if you find it useful!

</div>
