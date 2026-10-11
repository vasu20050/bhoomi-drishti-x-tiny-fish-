import serial
import time

print("Listening on COM5 (57600 baud) for 10 seconds...")
try:
    ser = serial.Serial('COM5', 57600, timeout=1)
    start = time.time()
    count = 0
    while time.time() - start < 10:
        if ser.in_waiting > 0:
            b = ser.read(ser.in_waiting)
            count += len(b)
            print(f"[{time.time()-start:.1f}s] Received {len(b)} bytes: {b[:20]}")
        time.sleep(0.1)
    ser.close()
    print(f"Total received: {count} bytes.")
except Exception as e:
    print(f"Error: {e}")
