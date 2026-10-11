@echo off
title Bhoomi Drishti GCS - Low-Latency Gateway
echo ===================================================
echo   BHOOMI DRISHTI GCS v2.4-RC3 (Autonomous Gateway)
echo   Hardware Telemetry Bridge (USB COM8 ^& Radio COM5)
echo ===================================================
echo.

set PY_PATH=C:\Users\meapu\AppData\Local\Programs\Python\Python312\python.exe

if exist "%PY_PATH%" (
    echo Starting Bhoomi Drishti Gateway via Python 3.12...
    "%PY_PATH%" bridge.py
) else (
    echo Starting Bhoomi Drishti Gateway via default Python...
    python bridge.py
)

pause
