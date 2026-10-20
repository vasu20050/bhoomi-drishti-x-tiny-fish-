"""
Bhoomi Drishti x TinyFish - Vercel Serverless Gateway
Exposes FastAPI REST and SSE endpoints on Vercel Cloud Runtime.
"""

import os
import sys
import time
import math
from typing import Dict, Any, Optional

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request, Body
from fastapi.responses import StreamingResponse, JSONResponse
import tinyfish_service

app = FastAPI(title="Bhoomi Drishti x TinyFish Serverless API")

def get_cloud_telemetry() -> Dict[str, Any]:
    t = time.time()
    return {
        "connected": True,
        "connection_type": "CLOUD NODE (VERCEL)",
        "port": "CLOUD",
        "target_port": "AUTO",
        "baud": 57600,
        "status_message": "Vercel Cloud Node Active",
        "system_id": 1,
        "component_id": 1,
        "flight_mode": "STANDBY",
        "armed": False,
        "roll": round(1.8 * math.sin(t * 0.7), 2),
        "pitch": round(1.2 * math.cos(t * 0.6), 2),
        "yaw": round((t * 4) % 360, 2),
        "airspeed": round(8.5 + 0.5 * math.cos(t * 0.5), 1),
        "groundspeed": round(8.2 + 0.6 * math.cos(t * 0.5), 1),
        "heading": int((t * 4) % 360),
        "throttle": int(48 + 2 * math.sin(t * 0.4)),
        "alt_msl": round(78.4 + 1.2 * math.sin(t * 0.4), 1),
        "alt_agl": round(78.4 + 1.2 * math.sin(t * 0.4), 1),
        "climb_rate": round(0.1 + 0.25 * math.sin(t * 0.3), 2),
        "lat": 28.4701886,
        "lon": 77.4941820,
        "gps_fix_type": 6,
        "satellites_visible": 26,
        "hdop": 0.65,
        "vdop": 0.85,
        "cpu_load": 35.2,
        "voltage_battery": 24.6,
        "current_battery": round(14.2 + 0.8 * math.sin(t * 0.5), 1),
        "battery_remaining": 88,
        "vibration_x": round(0.02 + 0.008 * math.sin(t * 2.1), 3),
        "vibration_y": round(0.02 + 0.008 * math.cos(t * 2.3), 3),
        "vibration_z": round(0.03 + 0.008 * math.sin(t * 1.9), 3),
        "clipping_0": 0,
        "imu_temp": 38.6,
        "rssi": 94,
        "rf_dbm": -68.0,
        "packets_received": 1024,
        "last_update": t
    }

@app.get("/api/telemetry")
async def api_telemetry():
    return get_cloud_telemetry()

@app.get("/api/ports")
async def api_ports():
    return {
        "ports": [
            {"device": "CLOUD", "description": "Vercel Cloud Node", "recommended_baud": 57600, "type": "CLOUD SIMULATION"}
        ],
        "current_active": "CLOUD",
        "target_port": "AUTO",
        "baud": 57600,
        "connected": True
    }

@app.post("/api/switch-port")
async def api_switch_port(payload: Dict[str, Any] = Body(...)):
    port = payload.get("port", "AUTO")
    return {"status": "ok", "target_port": port, "message": f"Cloud node operating on {port}"}

@app.get("/api/tinyfish/status")
async def api_tinyfish_status():
    return {
        "installed": tinyfish_service.TINYFISH_INSTALLED,
        "has_tinyfish_key": bool(tinyfish_service.CONFIG["tinyfish_api_key"]),
        "has_gemini_key": bool(tinyfish_service.CONFIG["gemini_api_key"]),
        "agent_mode": tinyfish_service.CONFIG["agent_mode"],
        "version": getattr(tinyfish_service, "__version__", "0.9.0")
    }

@app.post("/api/tinyfish/config")
async def api_tinyfish_config(payload: Dict[str, Any] = Body(...)):
    if "tinyfish_api_key" in payload:
        tinyfish_service.CONFIG["tinyfish_api_key"] = payload["tinyfish_api_key"].strip()
    if "gemini_api_key" in payload:
        tinyfish_service.CONFIG["gemini_api_key"] = payload["gemini_api_key"].strip()
    if "agent_mode" in payload:
        tinyfish_service.CONFIG["agent_mode"] = payload["agent_mode"]
    return {
        "status": "success",
        "config": {
            "has_tinyfish_key": bool(tinyfish_service.CONFIG["tinyfish_api_key"]),
            "has_gemini_key": bool(tinyfish_service.CONFIG["gemini_api_key"]),
            "agent_mode": tinyfish_service.CONFIG["agent_mode"]
        }
    }

@app.post("/api/tinyfish/search")
async def api_tinyfish_search(payload: Dict[str, Any] = Body(...)):
    query = payload.get("query", "")
    limit = int(payload.get("limit", 5))
    location = payload.get("location", "IN")
    results = await tinyfish_service.tinyfish_search(query=query, limit=limit, location=location)
    return {"query": query, "count": len(results), "results": results}

@app.post("/api/tinyfish/fetch")
async def api_tinyfish_fetch(payload: Dict[str, Any] = Body(...)):
    url = payload.get("url", "")
    return await tinyfish_service.tinyfish_fetch(url=url)

@app.get("/api/tinyfish/agent/stream")
@app.post("/api/tinyfish/agent/stream")
async def api_tinyfish_agent_stream(request: Request):
    goal = request.query_params.get("goal")
    url = request.query_params.get("url")
    if request.method == "POST":
        try:
            body = await request.json()
            goal = body.get("goal") or goal
            url = body.get("url") or url
        except Exception:
            pass
    resolved_goal = goal or "Scout cadastral mapping guidelines and airspace safety"
    return StreamingResponse(
        tinyfish_service.stream_tinyfish_agent(goal=resolved_goal, target_url=url),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/aiml/diagnostics")
async def api_aiml_diagnostics():
    return tinyfish_service.analyze_telemetry_ml(get_cloud_telemetry())

@app.post("/api/aiml/cadastral-scout")
async def api_aiml_cadastral_scout(payload: Dict[str, Any] = Body(...)):
    lat = float(payload.get("lat", 28.4701886))
    lon = float(payload.get("lon", 77.4941820))
    parcel_id = payload.get("parcel_id")
    return await tinyfish_service.scout_cadastral_parcel(lat=lat, lon=lon, parcel_id=parcel_id)

@app.post("/api/aiml/copilot")
async def api_aiml_copilot(payload: Dict[str, Any] = Body(...)):
    message = payload.get("message", "What is my flight status?")
    history = payload.get("history", [])
    return await tinyfish_service.copilot_chat_response(message=message, mav_state=get_cloud_telemetry(), history=history)
