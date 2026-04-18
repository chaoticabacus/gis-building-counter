# GIS Building Counter

A professional satellite imagery analysis dashboard that uses **Meta SAM 3** to count and segment buildings in satellite images. Designed for open-source geospatial research — clean, fast, and built to a professional standard.

---

## Features

### Core Analysis
- **SAM 3 Building Detection** — Upload satellite images and detect buildings using Meta's Segment Anything Model 3 with open-vocabulary text prompts (e.g. `"building"`, `"military installation"`, `"tent"`)
- **Per-Building Metadata** — View confidence score, bounding box area, and centroid for every detected structure in a sortable table
- **Adjustable Parameters** — Fine-tune detection with custom text prompts, confidence threshold slider, and min/max area filters
- **Batch Processing** — Queue and analyze multiple satellite images in sequence

### Map & Tiles
- **Interactive Map** — Full MapLibre GL JS map with CARTO dark/light basemaps and ESRI World Imagery satellite layer
- **Basemap Toggle** — Switch between streets and satellite views with one click
- **Polygon Drawing** — Click-to-draw polygon tool for selecting areas of interest
- **Tile Capture** — Backend stitches ESRI satellite tiles for any drawn area into a single image for SAM 3 analysis

### Temporal Comparison
- **Multi-Year Analysis** — Draw a polygon and compare building counts across years (2015–2026) using Google Earth Engine data
- **Google Open Buildings** — Queries building footprint polygons within selected areas (strongest coverage: Africa, S/SE Asia)
- **Microsoft/Overture Fallback** — Automatic fallback to Microsoft Building Footprints (~1.3B globally) for regions with low Google coverage (Central Asia, Ukraine, Middle East)
- **Dynamic World Time Series** — Charts built-up area percentage over time using Google's Dynamic World land-cover dataset
- **Growth Statistics** — Absolute and percentage change in building count between two selected years, rendered as an SVG area chart

### Export
- **GeoJSON** — Building footprints as a GeoJSON FeatureCollection with per-feature properties
- **CSV** — Tabular export with Building ID, Confidence, Area, Center X/Y
- **Annotated Image** — Download a PNG of the analyzed image with mask overlays

### UI/UX
- **Dark / Light Mode** — Toggle between Bloomberg-style dark and light themes with a single button; persists across sessions via localStorage
- **SAM 3 Status Indicator** — Real-time connection status badge with health-check polling every 30 seconds
- **Settings Modal** — Configure the SAM 3 Colab tunnel URL with a built-in connection test
- **Coordinate Readout** — Live cursor coordinates and zoom level in the status bar
- **Loading States** — Shimmer skeletons, progress bars, and spinners for all async operations
- **Prompt Suggestions** — Autocomplete dropdown for common detection prompts

---

## Architecture

```
┌─────────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Frontend (Vercel)      │────▶│  Backend API (Render) │────▶│  SAM 3 (Colab GPU)  │
│  Vite + React           │     │  Python FastAPI       │     │  T4 via tunnel      │
│  MapLibre GL JS         │     │                      │     └─────────────────────┘
│  Vanilla CSS            │     │  ┌──────────────┐    │
└─────────────────────────┘     │  │ GEE Service  │    │──▶ Google Open Buildings
                                │  │ Overture Svc │    │──▶ Microsoft Footprints
                                │  │ Tile Service │    │──▶ ESRI World Imagery
                                │  │ Export Svc   │    │──▶ Dynamic World
                                │  └──────────────┘    │──▶ Sentinel-2
                                └──────────────────────┘
```

| Layer | Technology | Deployment | Cost |
|-------|-----------|------------|------|
| Frontend | Vite + React + MapLibre GL JS | Vercel | Free |
| Styling | Vanilla CSS with custom properties (dark/light tokens) | — | — |
| Backend API | Python FastAPI | Render (free tier) | Free |
| SAM 3 Inference | Google Colab (T4 GPU) via cloudflared/ngrok tunnel | User-initiated | Free |
| Building Footprints | Google Open Buildings v3 + Microsoft/Overture | GEE API | Free |
| Temporal Data | Dynamic World v1 (built-up area %) | GEE API | Free |
| Satellite Imagery | Sentinel-2 composites, ESRI World Imagery tiles | GEE API / ESRI | Free |
| Map Tiles | CARTO (dark/light) + ESRI satellite | Public tile servers | Free |

---

## Project Structure

```
GIS v1/
├── frontend/                          # Vite + React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Analysis/
│   │   │   │   ├── ParameterBar.jsx   # Text prompt, confidence slider, area filters
│   │   │   │   ├── ResultsPanel.jsx   # Count display, stats, confidence histogram
│   │   │   │   └── BuildingTable.jsx  # Sortable per-building metadata table
│   │   │   ├── Export/
│   │   │   │   └── ExportMenu.jsx     # GeoJSON / CSV / PNG download dropdown
│   │   │   ├── Layout/
│   │   │   │   ├── Header.jsx         # Logo, SAM status badge, theme toggle
│   │   │   │   ├── Sidebar.jsx        # Mode tabs (Upload / Map / Temporal)
│   │   │   │   ├── StatusBar.jsx      # Coordinates, zoom, processing status
│   │   │   │   └── SettingsModal.jsx  # Colab URL config with connection test
│   │   │   ├── Map/
│   │   │   │   └── MapView.jsx        # MapLibre GL JS with draw tools & layers
│   │   │   ├── Temporal/
│   │   │   │   ├── TimeSlider.jsx     # Year pill selector (2015–2026)
│   │   │   │   ├── ComparisonView.jsx # Side-by-side building count comparison
│   │   │   │   └── GrowthChart.jsx    # SVG line/area chart with growth stats
│   │   │   └── Upload/
│   │   │       ├── UploadZone.jsx     # Drag-and-drop with file list
│   │   │       └── ImagePreview.jsx   # Canvas viewer with mask overlay & zoom
│   │   ├── hooks/
│   │   │   ├── useTheme.js           # Dark/light toggle with localStorage
│   │   │   ├── useSAM.js             # Colab connection, inference, health polling
│   │   │   └── useGEE.js             # GEE temporal query hooks
│   │   ├── services/
│   │   │   ├── api.js                # Backend API client
│   │   │   └── mapStyles.js          # CARTO dark/light + ESRI satellite styles
│   │   ├── styles/
│   │   │   ├── index.css             # Reset, base styles, animations
│   │   │   ├── themes.css            # Dark + light theme CSS custom properties
│   │   │   └── components.css        # Buttons, cards, tables, modals, inputs
│   │   ├── App.jsx                   # Root component — mode routing & state
│   │   └── main.jsx                  # Entry point with theme init
│   ├── .env                          # Local dev environment vars
│   ├── .env.production               # Production API URL
│   ├── index.html                    # SEO meta tags, anti-FOUC styles
│   └── vite.config.js
│
├── backend/                           # Python FastAPI application
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze.py            # SAM 3 proxy (single + batch)
│   │   │   ├── temporal.py           # GEE building footprints & time series
│   │   │   ├── tiles.py              # ESRI tile fetch & stitch
│   │   │   └── export.py             # GeoJSON & CSV generation
│   │   ├── services/
│   │   │   ├── gee_service.py        # Earth Engine: Open Buildings, Dynamic World, Sentinel-2
│   │   │   └── overture_service.py   # Microsoft Building Footprints fallback
│   │   ├── core/
│   │   │   └── config.py             # Environment variable config
│   │   └── main.py                   # FastAPI app, CORS, lifespan, routers
│   ├── requirements.txt
│   ├── render.yaml                   # Render free-tier deployment config
│   └── Dockerfile                    # Container deployment alternative
│
├── colab/
│   └── sam3_server.py                # SAM 3 Flask server for Google Colab
│
├── vercel.json                       # Vercel deployment with API proxy rewrites
├── .gitignore
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 18+ (for frontend)
- Python 3.9+ (for backend)
- A [Google Earth Engine](https://earthengine.google.com/) account (free for research)
- [Hugging Face](https://huggingface.co/facebook/sam3.1) access to SAM 3.1 checkpoints

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
export GEE_SERVICE_ACCOUNT_KEY=/path/to/your/gee-service-account-key.json
export ALLOWED_ORIGINS=http://localhost:5173

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 3. SAM 3 Colab Server

1. Open [Google Colab](https://colab.research.google.com/) and set runtime to **GPU (T4)**
2. Run the setup cell:
   ```python
   !pip install -q git+https://github.com/facebookresearch/sam3.git
   !pip install -q flask pyngrok cloudflared
   !huggingface-cli login  # Enter your HF access token
   ```
3. Upload `colab/sam3_server.py` and run it
4. Copy the public tunnel URL printed in the output
5. Paste the URL into the dashboard **Settings** modal (gear icon, top right)
6. The status badge should change from "SAM 3 Offline" → "SAM 3 Connected"

### 4. Google Earth Engine Setup

> Required for the **Temporal** tab (building footprint queries and time-series analysis).

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a service account
2. Grant it the **Earth Engine** role and download the JSON key file
3. Register the service account at [code.earthengine.google.com](https://code.earthengine.google.com)
4. Set the `GEE_SERVICE_ACCOUNT_KEY` environment variable to the key file path

---

## Deployment

### Frontend → Vercel

```bash
# From the project root
npx vercel
```

The `vercel.json` config proxies `/api/*` requests to the Render backend automatically.

### Backend → Render

1. Push the repository to GitHub
2. Connect the repo at [render.com](https://render.com)
3. Render auto-detects `backend/render.yaml` and provisions a free web service
4. Set the `GEE_SERVICE_ACCOUNT_KEY` secret in the Render dashboard
5. Update `frontend/.env.production` with the Render URL if it differs from the default

---

## Data Sources

| Dataset | Coverage | Used For | Region Strength |
|---------|----------|----------|-----------------|
| Google Open Buildings v3 | Africa, S/SE Asia, Latin America | Building footprint polygons | East Africa ✅ |
| Microsoft Building Footprints | Global (~1.3B buildings) | Fallback footprints | Central Asia, Ukraine, Middle East ✅ |
| Dynamic World v1 | Global (2015–present) | Built-up area % time series | All regions ✅ |
| Sentinel-2 | Global (2015–present, 10m) | True-color satellite composites | All regions ✅ |
| ESRI World Imagery | Global | High-res basemap tiles | All regions ✅ |
| CARTO Basemaps | Global | Dark/light street map tiles | All regions ✅ |

**Fallback strategy**: The backend queries Google Open Buildings first. If coverage is insufficient (< 50% of the polygon area), it automatically falls back to Microsoft/Overture Building Footprints.

---

## Environment Variables

| Variable | Where | Description | Default |
|----------|-------|-------------|---------|
| `VITE_API_URL` | Frontend | Backend API base URL | `http://localhost:8000` |
| `GEE_SERVICE_ACCOUNT_KEY` | Backend | Path to GEE service account JSON key | — |
| `COLAB_URL` | Backend | SAM 3 tunnel URL (optional, can also be set via UI) | — |
| `ALLOWED_ORIGINS` | Backend | CORS allowed origins (comma-separated) | `http://localhost:5173` |
| `MAX_UPLOAD_SIZE_MB` | Backend | Maximum upload file size | `50` |
| `TILE_CACHE_DIR` | Backend | Directory for cached tile images | `/tmp/gis_tiles` |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check + GEE status |
| `POST` | `/api/analyze` | Proxy image to SAM 3 for building detection |
| `POST` | `/api/analyze/batch` | Batch image analysis |
| `POST` | `/api/temporal/buildings` | Query building footprints within a polygon |
| `POST` | `/api/temporal/landcover` | Dynamic World built-up area time series |
| `POST` | `/api/temporal/imagery` | Sentinel-2 composite for a polygon + date range |
| `POST` | `/api/tiles/capture` | Fetch + stitch ESRI tiles for a bounding box |
| `POST` | `/api/export/geojson` | Export results as GeoJSON |
| `POST` | `/api/export/csv` | Export results as CSV |

---

## Design

- **Aesthetic**: Clean, minimal Bloomberg-style — subtle borders, generous whitespace, no heavy shadows
- **Typography**: Inter (UI) + JetBrains Mono (data/code)
- **Theming**: CSS custom properties with `[data-theme="dark"]` / `[data-theme="light"]` selectors
- **Accent palette**: Muted blue (`hsl(210, 50%, 55%)`) with success/warning/danger semantic colors
- **Animations**: Fade-in, slide-in, shimmer skeletons, spinner — all via CSS `@keyframes`

---

## License

For research and educational use. SAM 3 is licensed under the [SAM License](https://github.com/facebookresearch/sam3/blob/main/LICENSE). Building footprint datasets are subject to their respective licenses ([Google Open Buildings](https://sites.research.google/open-buildings/), [Microsoft Building Footprints](https://github.com/microsoft/GlobalMLBuildingFootprints)).
