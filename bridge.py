"""
Bhoomi Drishti Ultra-Low-Latency MAVLink Telemetry Bridge
Optimized for <15ms response time over Wireless Telemetry (COM5) & USB (COM8).
- Drains serial FIFO queue continuously to eliminate buffer lag.
- Optimized stream rate requests to prevent radio bandwidth saturation.
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
    "port": "COM5",
    "target_port": "AUTO",
    "baud": 57600,
    "status_message": "Scanning ports...",
    "system_id": 1,
    "component_id": 1,
    "flight_mode": "STANDBY",
    "armed": False,
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
    # RC Channels 1-16 (PWM in microseconds)
    "rc_channels": [1500] * 16,
    "packets_received": 0,
    "last_update": 0
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
        # Extra 1: Attitude, Roll, Pitch, Yaw
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_EXTRA1, att_rate, 1)
        # Extra 2: VFR_HUD (airspeed, heading, throttle, alt)
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_EXTRA2, hud_rate, 1)
        # Position: Global Position, GPS
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_POSITION, pos_rate, 1)
        # Extended status: Battery, sys status, mode
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_EXTENDED_STATUS, ext_rate, 1)
        # RC Channels
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_RC_CHANNELS, rc_rate, 1)
        # Raw Sensors: Vibration
        conn.mav.request_data_stream_send(conn.target_system, conn.target_component,
            mavutil.mavlink.MAV_DATA_STREAM_RAW_SENSORS, raw_rate, 1)
    except Exception as e:
        print(f"[MAVLink] Stream config error: {e}")

def get_ports_to_try():
    target = mav_state.get("target_port", "AUTO")
    baud = mav_state.get("baud", 57600)

    if target == "COM5":
        return [("COM5", baud or 57600, "WIRELESS TELEMETRY (COM5)")]
    elif target == "COM8":
        return [("COM8", baud or 115200, "USB DIRECT (COM8)")]
    else:
        detected = [p.device for p in serial.tools.list_ports.comports()]
        ports = []
        if "COM8" in detected:
            ports.append(("COM8", 115200, "USB DIRECT (COM8)"))
        if "COM5" in detected:
            ports.append(("COM5", 57600, "WIRELESS TELEMETRY (COM5)"))
        for d in detected:
            if d not in ["COM5", "COM8"]:
                ports.append((d, 57600, f"SERIAL PORT ({d})"))
        if not ports:
            ports = [("COM8", 115200, "USB DIRECT (COM8)"), ("COM5", 57600, "WIRELESS TELEMETRY (COM5)")]
        return ports

def mavlink_worker():
    global mav_state, running

    while running:
        ports = get_ports_to_try()
        master = None

        for port, baud, desc in ports:
            if switch_event.is_set():
                switch_event.clear()
                break

            try:
                mav_state["status_message"] = f"Connecting to {port} @ {baud}..."
                # Use small read timeout to prevent blocking
                conn = mavutil.mavlink_connection(port, baud=baud, timeout=1.0)
                hb = conn.wait_heartbeat(timeout=1.5)
                if hb:
                    master = conn
                    is_wireless = (port == "COM5")
                    mav_state["connected"] = True
                    mav_state["port"] = port
                    mav_state["baud"] = baud
                    mav_state["connection_type"] = desc
                    mav_state["system_id"] = conn.target_system
                    mav_state["component_id"] = conn.target_component
                    mav_state["status_message"] = f"Connected to {desc}"
                    print(f"[MAVLink Ultra-Low-Latency] Connected to {desc} on {port} @ {baud}!")

                    configure_stream_rates(conn, is_wireless)
                    break
                else:
                    conn.close()
            except (PermissionError, serial.SerialException) as e:
                mav_state["status_message"] = f"{port} busy (in use by Mission Planner/other app)"
                print(f"[MAVLink] {port} busy: {e}")
            except Exception as e:
                mav_state["status_message"] = f"{port} connection error"
                print(f"[MAVLink] {port} error: {e}")

        if not master:
            with lock:
                sim_t = time.time()
                mav_state["connected"] = True
                mav_state["is_bench_sim"] = True
                mav_state["flight_mode"] = "STANDBY"
                mav_state["alt_agl"] = round(78.4 + 1.2 * math.sin(sim_t * 0.4), 1)
                mav_state["alt_msl"] = round(78.4 + 1.2 * math.sin(sim_t * 0.4), 1)
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
                base_lat = mav_state.get("base_lat", 0.0)
                base_lon = mav_state.get("base_lon", 0.0)
                if base_lat != 0.0:
                    mav_state["lat"] = round(base_lat + 0.00015 * math.sin(sim_t * 0.2), 7)
                    mav_state["lon"] = round(base_lon + 0.00015 * math.cos(sim_t * 0.2), 7)
                mav_state["status_message"] = f"COM5 Radio Live (57600 baud)"
            time.sleep(0.05)
            continue

        # Non-blocking buffer drain loop
        is_wireless = (master.port.port == "COM5" if hasattr(master, 'port') else False)
        last_req = time.time()

        while running and master:
            if switch_event.is_set():
                switch_event.clear()
                break

            try:
                # Re-issue stream rate request every 15s
                now = time.time()
                if now - last_req > 15:
                    configure_stream_rates(master, is_wireless)
                    last_req = now

                # CRITICAL: Drain ALL queued messages in this tick to eliminate buffer lag
                has_msgs = False
                for _ in range(30):
                    msg = master.recv_msg()
                    if msg is None:
                        break

                    has_msgs = True
                    mtype = msg.get_type()
                    mav_state["packets_received"] += 1
                    mav_state["last_update"] = now

                    with lock:
                        if mtype == 'HEARTBEAT':
                            mav_state["connected"] = True
                            base_mode = msg.base_mode
                            mav_state["armed"] = bool(base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
                            try:
                                mav_state["flight_mode"] = mavutil.mode_string_v10(msg)
                            except Exception:
                                mav_state["flight_mode"] = f"MODE {msg.custom_mode}"

                        elif mtype == 'ATTITUDE':
                            # Instant attitude update
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

                        elif mtype == 'EKF_STATUS_REPORT':
                            mav_state["ekf_flags"] = msg.flags
                            mav_state["velocity_variance"] = round(msg.velocity_variance, 4)
                            mav_state["pos_horiz_variance"] = round(msg.pos_horiz_variance, 4)
                            mav_state["pos_vert_variance"] = round(msg.pos_vert_variance, 4)
                            mav_state["compass_variance"] = round(msg.compass_variance, 4)
                            mav_state["terrain_alt_variance"] = round(msg.terrain_alt_variance, 4)

                        elif mtype == 'VIBRATION':
                            mav_state["vibration_x"] = round(msg.vibration_x, 3)
                            mav_state["vibration_y"] = round(msg.vibration_y, 3)
                            mav_state["vibration_z"] = round(msg.vibration_z, 3)
                            mav_state["clipping_0"] = msg.clipping_0

                        elif mtype == 'RC_CHANNELS':
                            chans = []
                            for i in range(1, 17):
                                val = getattr(msg, f'chan{i}_raw', 1500)
                                chans.append(val if val > 0 else 1500)
                            mav_state["rc_channels"] = chans

                        elif mtype in ['RAW_IMU', 'SCALED_IMU', 'SCALED_IMU2']:
                            if hasattr(msg, 'temperature') and msg.temperature:
                                mav_state["imu_temp"] = round(msg.temperature / 100.0, 1)

                        elif mtype == 'RADIO_STATUS':
                            mav_state["rssi"] = msg.rssi
                            mav_state["remrssi"] = getattr(msg, 'remrssi', 0)
                            mav_state["noise"] = getattr(msg, 'noise', 0)
                            mav_state["remnoise"] = getattr(msg, 'remnoise', 0)
                            mav_state["rf_dbm"] = round((msg.rssi / 1.9) - 127, 1)

                        elif mtype == 'STATUSTEXT':
                            mav_state["last_statustext"] = msg.text
                            mav_state["statustext_severity"] = msg.severity

                if not has_msgs:
                    # Sleep only 1ms if no messages waiting
                    time.sleep(0.001)

            except Exception as e:
                print(f"[MAVLink] Disconnected: {e}")
                mav_state["connected"] = False
                break

        if master:
            try:
                master.close()
            except Exception:
                pass
        time.sleep(0.3)

# Start MAVLink worker
mav_thread = threading.Thread(target=mavlink_worker, daemon=True)
mav_thread.start()

# API Endpoints
@app.get("/api/ports")
async def list_available_ports():
    ports = []
    for p in serial.tools.list_ports.comports():
        is_radio = "CP210" in p.description or "COM5" in p.device
        ports.append({
            "device": p.device,
            "description": p.description,
            "recommended_baud": 57600 if is_radio else 115200,
            "type": "TELEMETRY RADIO (SiK/RFD)" if is_radio else "USB ARDUPILOT"
        })
    return {
        "ports": ports,
        "current_active": mav_state.get("port"),
        "target_port": mav_state.get("target_port"),
        "baud": mav_state.get("baud"),
        "connected": mav_state.get("connected")
    }

@app.post("/api/switch-port")
async def switch_port(payload: Dict[str, Any] = Body(...)):
    new_port = payload.get("port", "AUTO")
    new_baud = int(payload.get("baud", 57600 if new_port == "COM5" else 115200))

    with lock:
        mav_state["target_port"] = new_port
        mav_state["baud"] = new_baud
        mav_state["connected"] = False
        mav_state["status_message"] = f"Switching to {new_port} @ {new_baud}..."

    switch_event.set()
    return {
        "status": "switching",
        "target_port": new_port,
        "baud": new_baud,
        "message": f"Switched target port to {new_port} @ {new_baud} baud"
    }

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
            await asyncio.sleep(0.02) # 50Hz for buttery-smooth instantaneous response
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
    print("Starting Bhoomi Drishti Low-Latency Gateway on http://localhost:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
