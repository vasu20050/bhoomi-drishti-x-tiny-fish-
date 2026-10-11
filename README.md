# 🛰️ BHOOMI DRISHTI | Ground Control Station (GCS v2.4-RC3)

> **"See the Land. Map the Truth."**  
> An enterprise-grade, browser-based UAV Ground Control Station tailored for cadastral land mapping (SVAMITVA Scheme), real-time Pixhawk / ArduPilot telemetry, and 3D digital twin visualization with Lovable-inspired dark theme aesthetics.

---

## 🌟 Key Features

### 1. 🛩️ Real-Time 3D Drone Digital Twin (AHRS)
- **High-Visibility Airframe**: High-contrast surveyor matte white airframe with platinum canopy, anodized gold motor bells, and cyan/amber navigation LED strips.
- **Three.js Multi-Point Studio Lighting Rig**: Zenith overhead light, hemisphere soft fill, sun key, and rim lighting with ACES Filmic tone mapping.
- **Dynamic 6-DOF Synchronization**: Smooth pitch, roll, and yaw representation directly fed from MAVLink `ATTITUDE` and `VFR_HUD`.
- **Mission Planner-Style 6-Axis Alignment Wizard**: Safe, client-side visual display calibration wizard (Level, Nose Up, Nose Down, Left, Right, Upside Down) with zero writes to Pixhawk flight controller hardware parameters.
- **Camera Views & Quick Actions**: `NORTH-UP`, `TOP`, `CHASE`, `FRONT`, `ISO`, and `💡 BOOST LIGHT` mode toggle.

### 2. 🗺️ Land Mapping Workspace (GIS / SVAMITVA Scheme)
- **Interactive Leaflet Mapping**: Live drone GPS coordinates tracking with auto-follow and parcel fitting.
- **Cadastral Polygon Visualizer**: Interactive SVAMITVA Khasra parcel overlays with boundary calculation and area computation.
- **Multi-Source Basemaps**: Seamless switching between OpenStreetMap, Humanitarian OSM, Satellite Ortho, and Dark Cadastre Vector tiles.
- **GeoJSON Export**: Instant download of survey flight transects and parcel boundaries.

### 3. 📊 Full Telemetry & Sensor Suite
- **Primary Flight Instruments**: Airspeed, groundspeed, altitude AGL/MSL, vertical climb rate, and throttle gauges.
- **Vibration & Dynamics Analysis**: 3-axis accelerometer and gyro vibration time-series graphs (`VIBE` MAVLink message).
- **Power Monitoring**: Real-time battery voltage, current draw, remaining capacity, and estimated flight time.
- **Per-Rotor ESC Bus**: Live RPM, current, and temperature readouts for quadcopter propulsion systems.

### 4. 🩺 Flight Controller Health (Pixhawk & ArduPilot)
- **EKF3 Kalman Filter Diagnostics**: Multi-lane tracking for velocity, horizontal position, vertical height, compass magnetic variance, and terrain altitude.
- **Compute Core Metrics**: STM32 MCU load, free RAM, Flash CRC integrity, and sensor bus status (DroneCAN, SPI, I2C).
- **16-Channel Radio Monitor**: Live SBUS / CRSF PWM input bars for all 16 transmitter channels with link quality indicators.

### 5. 📻 Hardware Connectivity & Radio Bus
- **Dynamic Port Switcher**: Automatic switching between Telemetry Radio (`COM5` @ 57600 baud) and USB Direct (`COM8` @ 115200 baud).
- **Silicon Labs CP210x / RFD900X Support**: Real-time RSSI signal quality sparklines, FHSS Net ID configuration, and RF power output tuning.

### 6. 🖤 Lovable Dark Theme
- Inspired by modern SaaS design systems (Lovable.dev, Linear, Raycast).
- Deep obsidian dark palette (`#06070a` - `#111624`), electric sky cyan accents (`#38bdf8`), and emerald live indicators (`#34d399`).
- Frosted glassmorphic cards with subtle translucent borders and smooth micro-interactions.

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** (Python 3.12 recommended)
- **Pixhawk Autopilot** or **SITL Simulator** running ArduPilot 4.5+ or PX4

### Dependencies
Install the required Python packages:
```bash
pip install fastapi uvicorn pyserial pymavlink websockets
```

### Running the GCS
1. Launch the MAVLink telemetry bridge server:
   ```bash
   python bridge.py
   ```
   Or double-click `run_bhoomigcs.bat`.

2. Open your browser and navigate to:
   ```text
   http://localhost:8000
   ```

---

## 📁 Repository Structure

```text
├── bridge.py             # FastAPI WebSocket MAVLink serial telemetry bridge
├── index.html            # Main GCS Single Page Application shell
├── run_bhoomigcs.bat     # One-click Windows startup batch script
├── css/
│   └── styles.css        # Lovable dark theme styles, glassmorphism & Leaflet customization
├── js/
│   ├── app.js            # Global state, router, and WebSocket telemetry stream handler
│   └── views/
│       ├── overview.js   # Cockpit dashboard, FPV HUD & avionic subsystems
│       ├── telemetry.js  # Chart.js telemetry graphs & gauges
│       ├── fcHealth.js   # EKF3 lane variance & 16-channel RC monitor
│       ├── orientation.js# Three.js 3D drone digital twin & calibration wizard
│       ├── mapping.js    # Leaflet GIS cadastral map planner
│       ├── surveyHistory.js # Cadastral mission logs & reports
│       ├── alerts.js     # STATUSTEXT event feed & alarms
│       └── settings.js   # Radio transceiver bus & vehicle parameters
└── test_mavlink.py       # Diagnostic script for MAVLink telemetry ports
```

---

## 🔒 Safety Notice
All visual orientation display calibration, axes swapping, and offsets configured in the GCS are **strictly client-side in the browser**. Physical Pixhawk flight controller hardware calibration and ArduPilot onboard parameters are **100% untouched**.

---

## 📜 License
Distributed under the MIT License. Developed for advanced survey operations and drone telemetry monitoring.
