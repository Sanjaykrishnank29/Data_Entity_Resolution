# Infynd Data DNA 🧬

Data DNA is a robust, end-to-end Healthcare Entity Resolution Engine and Master Data Management (MDM) dashboard. It consumes raw, unstandardized clinical data from assorted sources, resolves conflicts, and produces unified Golden Records.

## 🌟 Key Features

### 1. Unified Identity Engine
- **Schema Unification**: Intelligently auto-maps inconsistent column styles (e.g., `Date_of_Birth`, `DOB`, `birthdate`) into canonical formats.
- **Probabilistic Scoring**: Leverages advanced field normalization, phonetic algorithms (like metaphone), and multi-stage blocking to accurately flag matching identities (even amidst transcription errors or name changes).
- **Golden Record Creation**: Merges duplicate subsets using conflict resolution algorithms to elect the highest-confidence values across `name`, `address`, `insurance_id`, `diagnosis`, and `allergy`.

### 2. Live Interactive Dashboards
- **Command Center**: Provides high-level statistical observability over identity unification rates, duplicate catch rates, unresolved pending conflict pairs, and aggregate Data Quality Scores.
- **Intelligence Hub**: A review queue designed for data stewards to manually accept, investigate, or reject identity matches that fall within the threshold of uncertainty (typically between `60% - 90%` confidence).
- **Live Monitoring**: Establishes a WebSocket connection with the backend telemetry loop to broadcast ingestion and engine processing events continuously in real-time.

### 3. Integrated Analytics & Data Exploitation
- **AI Chat Assistant**: Provides queryable, context-aware analytics allowing users to "chat" directly with their underlying data structures.
- **Data Explorer**: Allows data stewards to search, view granular resolution lineage, unmask privacy-locked data points, and view exact match provenance across individual source files.

## 🛠 Tech Stack

### Backend
- **Framework**: `FastAPI`
- **Database**: `SQLAlchemy` (SQLite) 
- **Algorithms**: Custom Union-Find deterministic/probabilistic conflict resolvers, Metaphone Phonetics, Edit Distance, TF-IDF Blocking
- **Real-Time Log Pipeline**: WebSockets
- **Data Processing**: `Pandas`

### Frontend
- **Framework**: `React` (Vite)
- **Styling**: `TailwindCSS`
- **Charting Engine**: `Recharts`, `D3.js`, `react-force-graph-2d`
- **Routing**: `React Router`

## Usage

See [instructions.md](./instructions.md) for how to set up the development environment, execute the engine, and open the application to begin unifying patient identities.
