# Setup Instructions for Data DNA 🧬

This guide will walk you through setting up and running both the FastAPI backend engine and the React Vite frontend dashboard.

## Prerequisites
- **Python 3.9+** (for the backend)
- **Node.js 18+** (for the frontend)
- **Git** (optional, for version control)

---

## 1. Backend Setup

The backend handles the core logic for the healthcare entity resolution engine, data ingestion, probabilistic scoring, and identity graph creation.

1. **Open a terminal** and navigate to the backend folder:
   ```bash
   cd d:\Infynd\datadna\backend
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   - On Windows:
     ```bash
     .\venv\Scripts\activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the backend server**:
   We configure uvicorn to listen on port `8001`, as the frontend expects this default port:
   ```bash
   uvicorn main:app --reload --port 8001
   ```

Once running, the server provides real-time WebSocket logs and REST APIs on `http://localhost:8001`.

---

## 2. Frontend Setup

The frontend is a Vite-powered React application with visual dashboards, live monitoring stats, and an interactive NLP-assisted chat search.

1. **Open a separate, new terminal** and navigate to the frontend folder:
   ```bash
   cd d:\Infynd\datadna\frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to the URL displayed in the terminal (usually `http://localhost:5173`).

---

## 3. How to Use the App

- **Data Ingestion**: Head to the "Data Ingestion" tab to trigger the entity pipeline engine with sample CSV files from `data2/` directory or trigger specific endpoints.
- **Engine Processing**: The unified engine will standardize column names, normalize fields, cluster duplicate datasets, and build Identity Golden Records.
- **Live Monitoring**: Visit the "Live Monitoring" page to observe live incoming records via WebSocket and review real-time pipeline telemetry.
- **Intelligence Hub**: Used to approve/deny potential duplicate candidate pairs.
