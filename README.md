# RescueAI
### AI-Powered Disaster Intelligence & Emergency Decision Support Platform
**HackHazards 2026 Submission · Solo Track · Machine Learning**

RescueAI is a mission-control intelligence suite designed to streamline disaster response, automate incident prioritization, and forecast regional risks during extreme weather events. It integrates zero-shot NLP classification, YOLOv8 computer vision object detection, XGBoost priority scoring with SHAP explainability, sentence-transformer duplicate clustering, and time-horizon risk forecasting.

---

## System Architecture

```
┌─────────────────────────┐        ┌──────────────────────────────────────┐
│   Citizen Portal (Web)  │        │        Authority Dashboard (Web)      │
│  - Report form           │        │  - Live map, incident feed, analytics │
│  - Image upload           │        │  - Assign team / resolve incident     │
└─────────────┬────────────┘        └───────────────────┬────────────────────┘
              │  REST (JSON + multipart)                 │  REST + WebSocket
              ▼                                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                             FastAPI Backend                                │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│  │ NLP Pipeline  │ │ CV Pipeline    │ │ Priority Model│ │ Forecast Model│ │
│  │ (extraction)  │ │ (YOLOv8)       │ │ (XGBoost)     │ │ (XGBoost)     │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ │
│                    ┌────────────────────────┐                             │
│                    │ Duplicate Detection     │                             │
│                    │ (Sentence-Transformers) │                             │
│                    └────────────────────────┘                             │
│  Orchestration layer: /reports POST → runs NLP → CV → dedup → priority     │
│  → resource recommendation → saves to Mongo → pushes WebSocket event       │
└───────────────────────────────┬───────────────────────────────────────────┘
                                 ▼
                     ┌─────────────────────┐
                     │  MongoDB (Database)  │
                     │  reports, teams,     │
                     │  regions, forecasts  │
                     └─────────────────────┘
```

---

## The Five ML Core Systems

### 1. NLP Emergency Understanding
Processes free-text emergency descriptions. Uses zero-shot classification pipelines (distilbart-mnli-12-1 or bart-large-mnli) to categorize disaster types and medical emergencies. Extracts critical entities (vulnerabilities like children/elderly/disabled, water-level phrases, and road blocks) using Regex phrase matchers. Fully degrades to deterministic keywords if offline.

### 2. Computer Vision Verification
Detects survivors, vehicles, and disaster severity markers from uploaded photos. Utilizes a pre-trained YOLOv8 nano model to count people and cars. Falls back to a PIL-based color distribution index (fire/smoke red pixel ratio vs flood blue-gray water ratio) to grade visual threat levels when running in offline/no-GPU modes.

### 3. XGBoost Explainable Priority Scoring (Centerpiece)
Computes a normalized `priority_score` (0-100) using a trained XGBoost Regressor model. Per-prediction feature contributions are extracted using XGBoost's built-in `pred_contribs` parameter (exact SHAP values for trees). The top positive feature weights are automatically translated into human-readable operations reasons (e.g., "Children present in distress zone").

### 4. Duplicate Proximity Clustering
Uses a Sentence-Transformer model (`all-MiniLM-L6-v2`) to compute semantic similarity embeddings. Every incoming report is compared against recent incidents within a 1km geographic radius. Proximity matches exceeding a cosine similarity threshold of 0.82 are clustered under the parent report, preventing dispatch duplicate noise.

### 5. Multi-Horizon Risk Forecasting
Predicts whether regional zones will escalate to critical states. Implements 4 separate trained XGBoost binary classifiers to estimate risk probabilities over 1-hour, 3-hour, 6-hour, and 24-hour time horizons. Operators can dynamically test forecast metrics by adjusting rainfall and river gauge height sliders.

---

## Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| **Frontend** | React 18 + TS + Vite | Dark theme, Leaflet maps, and Zustard state |
| **Backend** | FastAPI (Python 3.14) | Async endpoint routing with Pydantic v2 validation |
| **Database** | MongoDB / Mock DB | Motor driver connector with automatic in-memory mock fallback |
| **Priority ML** | XGBoost Regressor | Saved to `.joblib` with built-in SHAP contributors |
| **Forecast ML** | XGBoost Classifiers | 4 trained models for 1h, 3h, 6h, and 24h horizons |
| **NLP** | zero-shot + spaCy | zero-shot classification with distilled BART model |
| **CV** | YOLOv8 nano | Ultralytics YOLOv8n object detection |
| **DEDUP** | sentence-transformers | `all-MiniLM-L6-v2` cosine semantic similarity |

---

## Local Setup Instructions

### Prerequisites
- Node.js (v24+)
- Python (3.11 - 3.14)

### 1. Model Training
To train the models and generate synthetic training data:
```bash
# Setup virtual environment
python -m venv venv
.\venv\Scripts\activate.ps1

# Install basic ML packages
pip install numpy pandas xgboost scikit-learn joblib

# Run data generation & model training
python ml/generate_synthetic_data.py
python ml/train_priority_model.py
python ml/train_forecast_model.py
```

### 2. Backend Server Setup
To install remaining requirements and run the FastAPI server:
```bash
# Install requirements
pip install -r backend/requirements.txt

# Run FastAPI server
uvicorn backend.app.main:app --reload
```
*Note: If no local MongoDB is running, the backend will automatically initialize an in-memory Mock Database and populate it with realistic mock data for Jaipur zones.*

### 3. Frontend Web Setup
To build and run the operator dashboard:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Monorepo Directory Layout
```
rescueai/
├── backend/
│   ├── app/
│   │   ├── db/              # mongo connector & seeder
│   │   ├── models/          # pydantic validation schemas
│   │   ├── routers/         # REST & WebSocket routes
│   │   ├── services/        # NLP, CV, Priority, Forecast, Dedup & Resource logic
│   │   └── main.py          # application startup loading
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # map, layouts, incident drawers
│   │   ├── pages/           # dashboard, analytics, forecast panels
│   │   ├── store/           # zustand state store
│   │   ├── types/           # typescript types
│   │   └── App.tsx
│   └── tailwind.config.js
├── ml/
│   ├── artifacts/           # trained priority & forecast joblib models
│   ├── data/                # synthetic dataset CSV files
│   ├── generate_synthetic_data.py
│   ├── train_priority_model.py
│   └── train_forecast_model.py
└── README.md
```