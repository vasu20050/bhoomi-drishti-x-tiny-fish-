import time
from pymavlink import mavutil

master = mavutil.mavlink_connection('COM8', baud=115200)
print("Waiting for heartbeat on COM8...")
master.wait_heartbeat()
print(f"Connected to System ID: {master.target_system}, Component ID: {master.target_component}")

# Request data streams from ArduPilot (all streams @ 10Hz)
master.mav.request_data_stream_send(
    master.target_system, master.target_component,
    mavutil.mavlink.MAV_DATA_STREAM_ALL, 10, 1
)

start = time.time()
msg_types = set()
print("Reading incoming MAVLink messages for 3 seconds...")
while time.time() - start < 3:
    msg = master.recv_match(blocking=True, timeout=0.5)
    if msg:
        mtype = msg.get_type()
        msg_types.add(mtype)
        if mtype in ['ATTITUDE', 'VFR_HUD', 'SYS_STATUS', 'RC_CHANNELS', 'EKF_STATUS_REPORT', 'VIBRATION', 'GPS_RAW_INT']:
            print(f"[{mtype}]: {msg.to_dict()}")

print(f"\nAll message types seen: {sorted(list(msg_types))}")
master.close()
