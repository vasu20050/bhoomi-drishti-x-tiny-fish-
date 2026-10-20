# 🛰️ BHOOMI DRISHTI × TINYFISH AI | Autonomous UAV Ground Control Station (GCS v2.8-AI)

> **"See the Land. Map the Truth. Commanded by AI."**  
> An enterprise-grade, browser-based UAV Ground Control Station tailored for cadastral land mapping (SVAMITVA Scheme), real-time Pixhawk / ArduPilot telemetry, 3D digital twin visualization, and **TinyFish Autonomous Web & AI/ML Agents**.

---

## 🌟 Key Features

### 1. 🤖 TinyFish Autonomous Web Agent (SSE Streaming)
- **Official TinyFish SDK Integration**: Powered by `@tiny-fish/sdk` / Python `tinyfish`.
- **Live Server-Sent Events (SSE) Streaming**: Terminal runner streaming live agent navigation, DOM extraction, and reasoning steps directly into the GCS UI.
- **One-Click Mission Presets**:
  - 🇮🇳 **DGCA Green Zone Clearance**: Live airspace classification and regulatory check.
  - 📜 **SVAMITVA Survey SOP**: Survey of India GSD tolerances and cadastral parcel norms.
  - 🗺️ **UP Bhulekh Circulars**: Real-time land revenue circulars & boundary dispute protocols.
  - 🌤️ **Aviation Weather & Microburst Scout**: Live boundary layer wind profile (0-120m AGL).

### 2. 🩺 AI/ML Telemetry Anomaly Diagnostics
- **Vibration Severity Classifier (ISO 10816)**: Composite 3-axis vibration magnitude ($\sqrt{x^2 + y^2 + z^2}$), accelerometer clipping detection, and dynamic propeller/motor balance index.
- **Predictive Battery Degradation & Safe Endurance**: Calculates internal resistance ($\Delta V / I$) under current load to project safe remaining flight minutes before the 20% RTL threshold.
- **EKF3 Multi-Lane Innovation Variance**: Evaluates velocity, position, and compass innovation variances to detect GPS spoofing and filter divergence.
- **Unified AI Flight Readiness Index**: Continuous 0-100% composite avionic safety rating.

### 3. 🗺️ Land Mapping & Cadastral Workspace (GIS / SVAMITVA)
- **Interactive Leaflet Mapping**: Live drone GPS tracking with auto-follow, parcel fitting, and multi-source basemaps (OSM, Satellite Ortho, Cadastre Vector).
- **Cadastral Polygon Visualizer**: SVAMITVA Khasra parcel overlays with area calculation and GeoJSON export.
- **Optimal Survey Altitude Calculator**: Automatically calculates required flight altitude ($78.5\text{m AGL}$) for Sony $\alpha$7R IV (61MP) to achieve $1.2\text{ cm/pixel}$ GSD.

### 4. 🎙️ AI Drone Flight Copilot (Voice & Text)
- **50Hz Telemetry-Aware Intelligence**: Conversational copilot aware of live altitude, battery, GPS fix, flight mode, and EKF status.
- **Speech Synthesis (Web Speech API)**: Speaks audio briefings, checklist confirmations, and warnings directly to the pilot.

### 5. 🛩️ Real-Time 3D Drone Digital Twin (AHRS)
- **Three.js Lighting Rig**: High-contrast surveyor airframe with dynamic 6-DOF roll, pitch, and yaw fed from MAVLink `ATTITUDE` and `VFR_HUD`.
- **6-Axis Visual Calibration Wizard**: Safe client-side display alignment wizard leaving flight controller parameters untouched.

### 6. 📻 Hardware Connectivity & Low-Latency Bridge
- **Ultra-Low Latency**: 50Hz WebSocket broadcast loop with serial buffer drain.
- **Dual Connection Modes**: Seamless switching between Telemetry Radio (`COM5` @ 57600 baud) and USB Direct (`COM8` @ 115200 baud), with automatic fallback to high-fidelity bench simulation when hardware is disconnected.

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** (Python 3.12 / 3.14 compatible)
- Modern web browser (Chrome, Edge, Firefox, Brave)

### Dependencies
Install the required packages:
```bash
pip install fastapi uvicorn pyserial pymavlink websockets httpx pydantic tinyfish python-dotenv
```

### Environment Configuration (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your API keys (optional — the application operates with smart simulation fallback out-of-the-box):
- `TINYFISH_API_KEY`: Get yours at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)
- `GEMINI_API_KEY`: Get yours at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### Running the GCS
Launch the server:
```bash
python bridge.py
```
Or double-click `run_bhoomigcs.bat`.

Open your browser and navigate to:
```text
http://localhost:8000
```

---

## 📁 Repository Structure

```text
├── bridge.py                # FastAPI MAVLink, WebSocket & TinyFish SSE Gateway
├── tinyfish_service.py      # Official TinyFish SDK client, AI/ML diagnostics & scout
├── index.html               # Main GCS Single Page Application shell (View 01 to View 09)
├── run_bhoomigcs.bat        # Windows one-click startup script
├── .env.example             # Configuration template for TinyFish & LLM keys
├── css/
│   └── styles.css           # Lovable dark theme styles, glassmorphism & Leaflet CSS
├── js/
│   ├── app.js               # Global state, router, and 50Hz WebSocket telemetry stream
│   └── views/
│       ├── tinyfishAgent.js # TinyFish Agent SSE runner, ML diagnostics & AI Copilot
│       ├── overview.js      # Cockpit dashboard, FPV HUD & avionic subsystems
│       ├── telemetry.js     # Live telemetry graphs & gauges
│       ├── fcHealth.js      # EKF3 Kalman filter & 16-channel RC monitor
│       ├── orientation.js   # Three.js 3D drone digital twin & calibration wizard
│       ├── mapping.js       # Leaflet GIS cadastral map planner
│       ├── surveyHistory.js # Cadastral mission logs & reports
│       ├── alerts.js        # STATUSTEXT event feed & alarms
│       └── settings.js      # Radio bus switcher & TinyFish API config
└── tinyfish_cookbook_repo/  # Complete TinyFish cookbook recipes & agent examples
```

---

## 📜 License
Distributed under the MIT License. Developed for enterprise survey operations, cadastral land mapping, and autonomous UAV telemetry intelligence.
