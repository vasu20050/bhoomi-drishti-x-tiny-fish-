import time
from pymavlink import mavutil

print("Querying ArduPilot TELEM serial parameters via COM8...")
conn = mavutil.mavlink_connection('COM8', baud=115200)
conn.wait_heartbeat()

params_to_check = ['SERIAL1_PROTOCOL', 'SERIAL1_BAUD', 'SERIAL2_PROTOCOL', 'SERIAL2_BAUD', 'TELEM_DELAY']
results = {}

for p in params_to_check:
    conn.mav.param_request_read_send(conn.target_system, conn.target_component, p.encode('utf-8'), -1)

start = time.time()
while time.time() - start < 4:
    msg = conn.recv_match(type='PARAM_VALUE', blocking=True, timeout=0.5)
    if msg:
        pname = msg.param_id
        results[pname] = msg.param_value

for k, v in results.items():
    print(f"PARAM: {k} = {v}")

conn.close()
