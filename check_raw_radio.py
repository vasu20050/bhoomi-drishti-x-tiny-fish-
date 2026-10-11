import serial
import time

print("Opening COM5 at 57600 baud to check raw radio traffic...")
try:
    ser = serial.Serial('COM5', 57600, timeout=1)
    print("Port COM5 opened successfully!")
    start = time.time()
    total_bytes = 0
    raw_data = b""
    while time.time() - start < 5:
        data = ser.read(ser.in_waiting or 1)
        if data:
            total_bytes += len(data)
            raw_data += data
            print(f"Read {len(data)} bytes: {data[:20]}")
    ser.close()
    print(f"\nTotal bytes received in 5s: {total_bytes}")
    if total_bytes == 0:
        print("ALERT: 0 bytes received! Radio link is silent.")
    else:
        print("Hex sample:", raw_data[:50].hex())
except Exception as e:
    print(f"Failed to open COM5: {e}")
