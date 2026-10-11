import time
from pymavlink import mavutil

baud_rates = [57600, 115200, 38400, 19200, 9600]

print("Testing COM5 Telemetry Radio across baud rates...")

for baud in baud_rates:
    print(f"\nAttempting COM5 @ {baud}...")
    try:
        conn = mavutil.mavlink_connection('COM5', baud=baud, timeout=2)
        start = time.time()
        hb = None
        while time.time() - start < 3:
            msg = conn.recv_match(blocking=True, timeout=0.5)
            if msg:
                print(f"[{baud}] Received: {msg.get_type()}")
                if msg.get_type() == 'HEARTBEAT':
                    hb = msg
                    break
        if hb:
            print(f"--> SUCCESS: Heartbeat found on COM5 @ {baud}!")
            print(f"Target system: {conn.target_system}, component: {conn.target_component}")
            conn.close()
            break
        else:
            print(f"No heartbeat received on COM5 @ {baud}")
        conn.close()
    except Exception as e:
        print(f"Error on COM5 @ {baud}: {e}")
