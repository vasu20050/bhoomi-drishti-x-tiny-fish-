"""
Bhoomi Drishti Ultra-Low-Latency MAVLink Telemetry Bridge (v2.8 Hexacopter)
Optimized for <15ms response time over Wireless Telemetry (SiK / 3DR Radio) & USB (Pixhawk).
- Dynamic auto-detection of all physical COM ports & CP2102/FTDI telemetry radios.
- Support for MAVLink over UDP (14550) for SITL / WiFi / Mission Planner mirror.
- Truthful hardware status reporting: No fake 'Live' badges when dongle is disconnected.
- 50Hz WebSocket broadcast loop.
"""

import os
import time
import math
import json
import asyncio
import threading
from typing import Set, Dict, Any

from pymavlink import mavutil
import serial.tools.list_ports
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

mav_state: Dict[str, Any] = {
    "connected": False,
    "connection_type": "SEARCHING",
    "port": "AUTO",
    "target_port": "AUTO",
    "baud": 57600,
    "status_message": "Scanning for telemetry module...",
    "system_id": 1,
    "component_id": 1,
    "flight_mode": "STANDBY",
    "armed": False,
    "simulation_mode": False,
    # Attitude (Euler in degrees)
    "roll": 0.0,
    "pitch": 0.0,
    "yaw": 0.0,
    "rollspeed": 0.0,
    "pitchspeed": 0.0,
    "yawspeed": 0.0,
    # VFR HUD
    "airspeed": 0.0,
    "groundspeed": 0.0,
    "heading": 0,
    "throttle": 0,
    "alt_msl": 0.0,
    "alt_agl": 0.0,
    "climb_rate": 0.0,
    # Global Position
    "lat": 0.0,
    "lon": 0.0,
    # GPS Raw Int
    "gps_fix_type": 0,
    "satellites_visible": 0,
    "hdop": 0.0,
    "vdop": 0.0,
    # System Status & Battery
    "cpu_load": 0.0,
    "voltage_battery": 0.0,
    "current_battery": 0.0,
    "battery_remaining": -1,
    # EKF Status Report
    "ekf_flags": 0,
    "velocity_variance": 0.0,
    "pos_horiz_variance": 0.0,
    "pos_vert_variance": 0.0,
    "compass_variance": 0.0,
    "terrain_alt_variance": 0.0,
    # Vibration
    "vibration_x": 0.0,
    "vibration_y": 0.0,
    "vibration_z": 0.0,
    "clipping_0": 0,
    # Hexacopter 6-Channel Motor PWMs (microseconds 1000-2000)
    "motor_pwms": [1000] * 6,
    # RC Channels 1-16 (PWM in microseconds)
    "rc_channels": [1500] * 16,
    # Radio Link Quality (SiK Radio)
    "rssi": 0,
    "remrssi": 0,
    "noise": 0,
    "remnoise": 0,
    "rf_dbm": -120.0,
    "packets_received": 0,
    "last_update": 0,
    "status_logs": []
}

connected_clients: Set[WebSocket] = set()
lock = threading.Lock()
running = True
switch_event = threading.Event()

app = FastAPI(title="Bhoomi Drishti Ultra-Low-Latency Gateway")

@app.middleware("http")
async def add_no_cache_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

def configure_stream_rates(conn, is_wireless):
    """
    Request discrete stream rates tailored to the link bandwidth.
    Prevents 57600 baud radio link saturation.
    """
    att_rate = 25 if is_wireless else 50 # Attitude rate (Hz)
    hud_rate = 5 if is_wireless else 10   # VFR HUD (Hz)
    pos_rate = 4 if is_wireless else 10   # GPS / Position (Hz)
    ext_rate = 2 if is_wireless else 5    # System status & battery (Hz)
    rc_rate  = 5 if is_wireless else 10   # RC channels (Hz)
    raw_rate = 5 if is_wireless else 10   # Vibration & raw IMU (Hz)

    try:
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_EXTRA1, att_rate, 1)
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_EXTRA2, hud_rate, 1)
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_POSITION, pos_rate, 1)
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_EXTENDED_STATUS, ext_rate, 1)
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_RC_CHANNELS, rc_rate, 1)
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_RAW_SENSORS, raw_rate, 1)
    except Exception as e:
        print(f"[MAVLink] Stream config notice: {e}")

def get_ports_to_try():
    """Dynamically scan all physical COM ports and configured endpoints."""
    target = mav_state.get("target_port", "AUTO")
    baud = mav_state.get("baud", 57600)

    # If user explicitly specified a port
    if target and target != "AUTO":
        if target.startswith("udp") or target.startswith("tcp"):
            return [(target, 115200, f"NETWORK LINK ({target})")]
        return [(target, baud or 57600, f"PORT {target}")]

    # Auto-detect mode: scan all active serial devices
    detected = []
    try:
        for p in serial.tools.list_ports.comports():
            desc = p.description or ""
            is_radio = any(k in desc.upper() for k in ["CP210", "FTDI", "UART", "RADIO", "SILICON", "SERIAL"])
            rec_baud = 57600 if is_radio else 115200
            detected.append((p.device, rec_baud, f"{p.device} ({desc})"))
    except Exception:
        pass

    # Also test common UDP broadcast endpoint for SITL / Mission Planner
    detected.append(("udpin:0.0.0.0:14550", 115200, "MAVLink UDP 14550 (SITL / WiFi)"))

    return detected

def mavlink_worker():
    global mav_state, running

    while running:
        # Check if user has explicitly enabled simulation mode
        if mav_state.get("simulation_mode", False):
            with lock:
                sim_t = time.time()
                mav_state["connected"] = True
                mav_state["is_bench_sim"] = True
                mav_state["flight_mode"] = "AUTO SURVEY"
                mav_state["alt_agl"] = round(78.4 + 1.2 * math.sin(sim_t * 0.4), 1)
                mav_state["alt_msl"] = round(142.4 + 1.2 * math.sin(sim_t * 0.4), 1)
                mav_state["groundspeed"] = round(8.2 + 0.6 * math.cos(sim_t * 0.5), 1)
                mav_state["airspeed"] = round(8.5 + 0.5 * math.cos(sim_t * 0.5), 1)
                mav_state["climb_rate"] = round(0.1 + 0.25 * math.sin(sim_t * 0.3), 2)
                mav_state["throttle"] = int(48 + 2 * math.sin(sim_t * 0.4))
                mav_state["heading"] = int((sim_t * 4) % 360)
                mav_state["roll"] = round(1.8 * math.sin(sim_t * 0.7), 2)
                mav_state["pitch"] = round(1.2 * math.cos(sim_t * 0.6), 2)
                mav_state["yaw"] = round((sim_t * 4) % 360, 2)
                mav_state["voltage_battery"] = 24.6
                mav_state["current_battery"] = round(14.2 + 0.8 * math.sin(sim_t * 0.5), 1)
                mav_state["battery_remaining"] = 88
                mav_state["satellites_visible"] = 26
                mav_state["gps_fix_type"] = 6
                mav_state["hdop"] = 0.65
                mav_state["vdop"] = 0.85
                mav_state["cpu_load"] = 35.2
                mav_state["vibration_x"] = round(0.02 + 0.008 * math.sin(sim_t * 2.1), 3)
                mav_state["vibration_y"] = round(0.02 + 0.008 * math.cos(sim_t * 2.3), 3)
                mav_state["vibration_z"] = round(0.03 + 0.008 * math.sin(sim_t * 1.9), 3)
                mav_state["imu_temp"] = 38.6
                mav_state["rssi"] = 94
                mav_state["rf_dbm"] = -68.0
                mav_state["packets_received"] += 1
                base_lat = mav_state.get("base_lat", 28.4701886)
                base_lon = mav_state.get("base_lon", 77.4941820)
                mav_state["lat"] = round(base_lat + 0.00015 * math.sin(sim_t * 0.2), 7)
                mav_state["lon"] = round(base_lon + 0.00015 * math.cos(sim_t * 0.2), 7)
                mav_state["status_message"] = "DEMO SIMULATION ACTIVE"
            time.sleep(0.04)
            continue

        ports = get_ports_to_try()
        master = None

        if not ports:
            with lock:
                mav_state["connected"] = False
                mav_state["is_bench_sim"] = False
                target_p = mav_state.get("target_port", "AUTO")
                mav_state["status_message"] = f"No Telemetry Radio Dongle Detected ({target_p})"
            time.sleep(1.0)
            continue

        for port, baud, desc in ports:
            if switch_event.is_set():
                switch_event.clear()
                break

            try:
                with lock:
                    mav_state["status_message"] = f"Probing {port} @ {baud}..."
                
                conn = mavutil.mavlink_connection(port, baud=baud, timeout=0.8)
                hb = conn.wait_heartbeat(timeout=1.2)
                if hb:
                    master = conn
                    is_wireless = ("COM5" in port or "Radio" in desc or baud == 57600)
                    with lock:
                        mav_state["connected"] = True
                        mav_state["is_bench_sim"] = False
                        mav_state["port"] = port
                        mav_state["baud"] = baud
                        mav_state["connection_type"] = desc
                        mav_state["system_id"] = conn.target_system
                        mav_state["component_id"] = conn.target_component
                        mav_state["status_message"] = f"Connected to {desc}"
                    print(f"[MAVLink] Connected to {desc} on {port} @ {baud}!")
                    configure_stream_rates(conn, is_wireless)
                    break
                else:
                    conn.close()
            except Exception as e:
                with lock:
                    mav_state["status_message"] = f"{port}: {e}"

        # If no active physical MAVLink connection was established
        if not master:
            with lock:
                mav_state["connected"] = False
                mav_state["is_bench_sim"] = False
                avail = [p.device for p in serial.tools.list_ports.comports()]
                if avail:
                    mav_state["status_message"] = f"Detected {', '.join(avail)} - Awaiting MAVLink Heartbeat from Hexacopter"
                else:
                    target_p = mav_state.get("target_port", "AUTO")
                    mav_state["status_message"] = f"No COM Port Found for Telemetry ({target_p}) - Plug in USB Radio Dongle"
            time.sleep(1.2)
            continue

        # Active telemetry message pump loop (<15ms latency)
        is_wireless = ("COM5" in master.address or master.baud == 57600)
        last_req = time.time()

        while running and master:
            if switch_event.is_set():
                switch_event.clear()
                break

            try:
                now = time.time()
                if now - last_req > 15:
                    configure_stream_rates(master, is_wireless)
                    last_req = now

                has_msgs = False
                for _ in range(50):
                    msg = master.recv_msg()
                    if msg is None:
                        break

                    has_msgs = True
                    mtype = msg.get_type()
                    mav_state["packets_received"] += 1
                    mav_state["last_update"] = now

                    with lock:
                        mav_state["connected"] = True
                        if mtype == 'HEARTBEAT':
                            base_mode = msg.base_mode
                            mav_state["armed"] = bool(base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
                            try:
                                mav_state["flight_mode"] = mavutil.mode_string_v10(msg)
                            except Exception:
                                mav_state["flight_mode"] = f"MODE {msg.custom_mode}"

                        elif mtype == 'ATTITUDE':
                            mav_state["roll"] = round(math.degrees(msg.roll), 2)
                            mav_state["pitch"] = round(math.degrees(msg.pitch), 2)
                            yaw_deg = math.degrees(msg.yaw)
                            if yaw_deg < 0:
                                yaw_deg += 360
                            mav_state["yaw"] = round(yaw_deg, 2)
                            mav_state["rollspeed"] = round(math.degrees(msg.rollspeed), 2)
                            mav_state["pitchspeed"] = round(math.degrees(msg.pitchspeed), 2)
                            mav_state["yawspeed"] = round(math.degrees(msg.yawspeed), 2)

                        elif mtype == 'VFR_HUD':
                            mav_state["airspeed"] = round(msg.airspeed, 2)
                            mav_state["groundspeed"] = round(msg.groundspeed, 2)
                            mav_state["heading"] = int(msg.heading)
                            mav_state["throttle"] = int(msg.throttle)
                            mav_state["alt_msl"] = round(msg.alt, 2)
                            mav_state["climb_rate"] = round(msg.climb, 2)

                        elif mtype == 'GLOBAL_POSITION_INT':
                            mav_state["lat"] = msg.lat / 1e7
                            mav_state["lon"] = msg.lon / 1e7
                            mav_state["alt_agl"] = round(msg.relative_alt / 1000.0, 2)

                        elif mtype == 'GPS_RAW_INT':
                            mav_state["gps_fix_type"] = msg.fix_type
                            mav_state["satellites_visible"] = msg.satellites_visible
                            mav_state["hdop"] = round(msg.eph / 100.0, 2) if hasattr(msg, 'eph') else 0.0
                            mav_state["vdop"] = round(msg.epv / 100.0, 2) if hasattr(msg, 'epv') else 0.0
                            if mav_state["lat"] == 0.0 and msg.lat != 0:
                                mav_state["lat"] = msg.lat / 1e7
                                mav_state["lon"] = msg.lon / 1e7

                        elif mtype == 'SYS_STATUS':
                            mav_state["cpu_load"] = round(msg.load / 10.0, 1)
                            if msg.voltage_battery > 0:
                                mav_state["voltage_battery"] = round(msg.voltage_battery / 1000.0, 2)
                            if msg.current_battery > 0:
                                mav_state["current_battery"] = round(msg.current_battery / 1000.0, 2)
                            mav_state["battery_remaining"] = msg.battery_remaining

                        elif mtype == 'SERVO_OUTPUT_RAW':
                            # Hexacopter: 6 motor PWM outputs
                            mav_state["motor_pwms"] = [
                                getattr(msg, f'servo{i}_raw', 1000) for i in range(1, 7)
                            ]

                        elif mtype == 'RADIO_STATUS':
                            mav_state["rssi"] = msg.rssi
                            mav_state["remrssi"] = msg.remrssi
                            mav_state["noise"] = msg.noise
                            mav_state["remnoise"] = msg.remnoise
                            mav_state["rf_dbm"] = round((msg.rssi / 1.9) - 127, 1)

                        elif mtype == 'STATUSTEXT':
                            t_str = getattr(msg, 'text', '')
                            if t_str:
                                mav_state["status_logs"].append({
                                    "time": time.strftime("%H:%M:%S"),
                                    "text": t_str
                                })
                                if len(mav_state["status_logs"]) > 40:
                                    mav_state["status_logs"].pop(0)

                if not has_msgs:
                    time.sleep(0.002)

            except Exception as e:
                print(f"[MAVLink] Connection lost: {e}")
                mav_state["connected"] = False
                break

        if master:
            try:
                master.close()
            except Exception:
                pass
        time.sleep(0.5)

# Start MAVLink worker thread
mav_thread = threading.Thread(target=mavlink_worker, daemon=True)
mav_thread.start()

# REST Endpoints
@app.get("/api/ports")
async def list_available_ports():
    ports = []
    real_ports_count = 0
    try:
        for p in serial.tools.list_ports.comports():
            desc = p.description or ""
            is_radio = any(k in desc.upper() for k in ["CP210", "FTDI", "UART", "RADIO", "SILICON", "SERIAL", "USB"])
            rec_baud = 57600 if is_radio else 115200
            ports.append({
                "port": p.device,
                "device": p.device,
                "description": desc or p.device,
                "recommended_baud": rec_baud,
                "is_radio": is_radio,
                "type": "TELEMETRY RADIO (SiK/RFD)" if is_radio else "PIXHAWK USB"
            })
            real_ports_count += 1
    except Exception as e:
        print(f"[Ports] Scan error: {e}")

    # Include Network UDP option for SITL / Mission Planner mirror
    ports.append({
        "port": "udpin:0.0.0.0:14550",
        "device": "udpin:0.0.0.0:14550",
        "description": "Network MAVLink UDP (Port 14550)",
        "recommended_baud": 115200,
        "is_radio": False,
        "type": "SITL / WiFi / Mission Planner Mirror"
    })

    with lock:
        return {
            "ports": ports,
            "has_real_ports": real_ports_count > 0,
            "real_ports_count": real_ports_count,
            "current_active": mav_state.get("port"),
            "target_port": mav_state.get("target_port"),
            "baud": mav_state.get("baud"),
            "connected": mav_state.get("connected"),
            "status_message": mav_state.get("status_message"),
            "simulation_mode": mav_state.get("simulation_mode", False),
            "driver_available": True
        }

@app.post("/api/launch-driver-installer")
async def launch_driver_installer():
    candidate_paths = [
        os.path.join(workspace_dir, "cp2102_driver", "pololu-cp2102-windows", "pololu-cp2102-setup-x64.exe"),
        r"c:\vaibhav_program\Dhristi_bhoomi\cp2102_driver\pololu-cp2102-windows\pololu-cp2102-setup-x64.exe",
        r"c:\vaibhav_program\bhoomi drishti x tiny fish\cp2102_driver\pololu-cp2102-windows\pololu-cp2102-setup-x64.exe"
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            try:
                os.startfile(p)
                return {"status": "ok", "message": "CP2102 Driver installer launched. Please follow the on-screen installer."}
            except Exception as e:
                return {"status": "error", "message": f"Could not launch installer: {e}"}
    return {"status": "error", "message": "Driver installer executable not found."}

@app.post("/api/switch-port")
async def switch_port(payload: Dict[str, Any] = Body(...)):
    new_port = payload.get("port", "AUTO")
    new_baud = int(payload.get("baud", 57600 if "5" in str(new_port) else 115200))

    with lock:
        mav_state["target_port"] = new_port
        mav_state["baud"] = new_baud
        mav_state["connected"] = False
        mav_state["status_message"] = f"Switching target to {new_port} @ {new_baud}..."

    switch_event.set()
    return {
        "status": "switching",
        "target_port": new_port,
        "baud": new_baud,
        "message": f"Target port changed to {new_port} @ {new_baud} baud"
    }

@app.post("/api/toggle-simulation")
async def toggle_sim(payload: Dict[str, Any] = Body(default={})):
    with lock:
        if "enabled" in payload:
            mav_state["simulation_mode"] = bool(payload["enabled"])
        else:
            mav_state["simulation_mode"] = not mav_state.get("simulation_mode", False)
        curr = mav_state["simulation_mode"]
    return {"status": "ok", "simulation_mode": curr}

@app.get("/api/telemetry")
async def get_telemetry():
    with lock:
        return mav_state

@app.post("/api/set-location")
async def set_sim_location(payload: Dict[str, Any] = Body(...)):
    new_lat = float(payload.get("lat", 0.0))
    new_lon = float(payload.get("lon", 0.0))
    with lock:
        mav_state["lat"] = new_lat
        mav_state["lon"] = new_lon
        mav_state["base_lat"] = new_lat
        mav_state["base_lon"] = new_lon
    return {"status": "ok", "lat": new_lat, "lon": new_lon}

# Ultra-Low-Latency 50Hz WebSocket broadcast (20ms interval)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            with lock:
                payload = json.dumps(mav_state)
            await websocket.send_text(payload)
            await asyncio.sleep(0.02) # 50Hz
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
    except Exception:
        if websocket in connected_clients:
            connected_clients.remove(websocket)

workspace_dir = os.path.dirname(os.path.abspath(__file__))
app.mount("/css", StaticFiles(directory=os.path.join(workspace_dir, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(workspace_dir, "js")), name="js")

@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(workspace_dir, "index.html"))

if __name__ == "__main__":
    import sys
    port = int(os.environ.get("PORT", 8000))
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    print(f"Starting Bhoomi Drishti Low-Latency Gateway on http://localhost:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
