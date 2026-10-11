import sys
import time
from pymavlink import mavutil

ports_to_try = [
    ("COM8", 115200),
    ("COM8", 57600),
    ("COM5", 57600),
    ("COM5", 115200)
]

print("Scanning for Pixhawk / ArduPilot MAVLink on COM ports...")

found = False
for port, baud in ports_to_try:
    print(f"Trying {port} at {baud} baud...")
    try:
        master = mavutil.mavlink_connection(port, baud=baud, timeout=3)
        msg = master.wait_heartbeat(timeout=3)
        if msg:
            print(f"SUCCESS: Heartbeat received on {port} @ {baud}!")
            print(f"Type: {msg.type}, Autopilot: {msg.autopilot}, Base Mode: {msg.base_mode}, System Status: {msg.system_status}")
            master.close()
            found = True
            break
        else:
            print(f"No heartbeat on {port} @ {baud} within 3s")
            master.close()
    except Exception as e:
        print(f"Error on {port} @ {baud}: {e}")

if not found:
    print("Could not get heartbeat on attempted combinations.")
