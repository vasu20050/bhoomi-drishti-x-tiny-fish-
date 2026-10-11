import serial
import time

print("Testing SiK Telemetry Radio AT commands on COM5...")

def test_at(baud):
    try:
        ser = serial.Serial('COM5', baud, timeout=1)
        time.sleep(1.2)
        ser.write(b'+++')
        time.sleep(1.2)
        resp = ser.read(ser.in_waiting or 100)
        print(f"Baud {baud} '+++' response: {resp}")
        if b'OK' in resp:
            ser.write(b'ATI\r\n')
            time.sleep(0.5)
            print("ATI:", ser.read(ser.in_waiting))
            ser.write(b'ATI5\r\n')
            time.sleep(0.5)
            print("ATI5 (Config):", ser.read(ser.in_waiting))
            ser.write(b'ATO\r\n') # exit command mode
            ser.close()
            return True
        ser.close()
    except Exception as e:
        print(f"Error at {baud}: {e}")
    return False

for b in [57600, 115200, 38400]:
    if test_at(b):
        break
