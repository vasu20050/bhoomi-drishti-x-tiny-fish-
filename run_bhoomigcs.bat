@echo off
title Bhoomi Drishti x TinyFish AI GCS
echo ======================================================================
echo   BHOOMI DRISHTI x TINYFISH AI/ML GROUND CONTROL STATION (v2.8-AI)
echo   Autonomous Web Agent, Real-Time MAVLink Telemetry, SVAMITVA Cadastre
echo ======================================================================
echo.

:: Launch default browser after 2 seconds in background
start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:8000"

:: Start the FastAPI + TinyFish + MAVLink Gateway
python bridge.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Python exited with error code %ERRORLEVEL%.
    pause
)
