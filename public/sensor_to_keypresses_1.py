import time
import math
import sifi_bridge_py as sbp
from sifi_bridge_py import SifiBridge, DeviceCommand
import socketio

# Initialize Socket.IO client
sio = socketio.Client()
MOVEMENT_THRESHOLD = 0.1  # Set the threshold for movement
EMG_THRESHOLD = 0.5       # Set the threshold for EMG

# Variables to store the initial calibration values
initial_pitch = None
initial_yaw = None

@sio.event
def connect():
    print("Connection established")
    sio.emit("setRole", "client1")  # Emit setRole only after connecting

@sio.event
def disconnect():
    print("Disconnected from server")

# Connect to the server
sio.connect("http://localhost:3000")

@sio.on("collisionDetected")
def on_collision_detected(data):
    print(f"Collision detected for player: {data['playerId']}")
    
    # Activate the motor for 2 seconds
    bridge.send_command(DeviceCommand.START_MOTOR)
    time.sleep(2)
    bridge.send_command(DeviceCommand.STOP_MOTOR)

    # print("Listening for collision events...")
    # sio.wait()

def quaternion_to_euler(qw, qx, qy, qz):
    roll = math.atan2(2 * (qw * qx + qy * qz), 1 - 2 * (qx * qx + qy * qy))
    sinp = 2 * (qw * qy - qz * qx)
    pitch = math.copysign(math.pi / 2, sinp) if abs(sinp) >= 1 else math.asin(sinp)
    yaw = math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz))
    return pitch, roll, yaw

def send_movement_command(relative_pitch, relative_yaw):
    """
    Sends movement commands only if relative pitch or yaw exceed the threshold.
    """
    if abs(relative_pitch) > MOVEMENT_THRESHOLD:
        direction = "down" if relative_pitch > 0 else "up"
        message = {"direction": direction}
        sio.emit("move", message)
        # print(f"Sent movement command: {message}")

    if abs(relative_yaw) > MOVEMENT_THRESHOLD:
        direction = "left" if relative_yaw > 0 else "right"
        message = {"direction": direction}
        sio.emit("move", message)
        # print(f"Sent movement command: {message}")

def process_imu_data(pitch, yaw):
    global initial_pitch, initial_yaw

    # Calibration step: Set initial values for pitch and yaw
    if initial_pitch is None or initial_yaw is None:
        initial_pitch = pitch
        initial_yaw = yaw
        print("Calibrated initial pitch and yaw:", initial_pitch, initial_yaw)
        return  # Skip this reading, start after calibration

    # Calculate relative pitch and yaw
    relative_pitch = pitch - initial_pitch
    relative_yaw = yaw - initial_yaw

    # Send movement command based on relative values
    send_movement_command(relative_pitch, relative_yaw)

EMG_THRESHOLD = 0.5  # Threshold for the averaged, scaled value
SCALING_FACTOR = 100000  # Factor to bring values roughly into the 0-1 range

def process_emg_data(emg_packet):
    """
    Processes EMG data by calculating the average of the packet, scaling,
    taking the absolute value, and checking against a threshold.
    Assumes EMG data is under the 'emg' key in the packet.
    """
    emg_values = emg_packet.get("emg", [])  # Safely get the list of EMG values
    if emg_values:
        try:
            # Calculate the average of the 8 values in the packet
            average_value = sum(emg_values) / len(emg_values)

            # Scale and take the absolute value of the averaged EMG signal
            scaled_average = abs(average_value * SCALING_FACTOR)

            # Compare against the threshold and send the appropriate message
            message = {"shoot": 1} if scaled_average > EMG_THRESHOLD else {"shoot": 0}
            sio.emit("EMG", message)
            #print(f"Sent EMG command: {message} with averaged, scaled value: {scaled_average}")
        except (ValueError, TypeError):
            # Handle any unexpected data formats
            print("Error processing EMG data in packet.")






# Existing streaming function and remaining code as previously set up...

def stream_data(bridge, number_of_seconds_to_stream=1200, device_type=sbp.DeviceType.BIOPOINT_V1_3):
    # Connect to BioPoint device
    devices = bridge.list_devices(sbp.ListSources.BLE)
    print("Available devices:", devices)
    connected = False
    while not connected:
        try:
            connected = bridge.connect(device_type)
            if not connected:
                print("Failed to connect... retrying")
                time.sleep(1)
        except Exception as e:
            print(f"Exception while connecting: {e}")
            time.sleep(1)

    print("Connected to BioPoint device!")
    bridge.set_channels(imu=True, emg=True)
    bridge.set_low_latency_mode(on=True)
    bridge.start()
    start_time = time.time()
    first_packet_ignored = False  # Ignore the first packet if needed

    print(f"Streaming IMU and EMG data for {number_of_seconds_to_stream} seconds...")
    try:
        while time.time() - start_time < number_of_seconds_to_stream:
            packet = bridge.get_data_with_key("data")
            if packet["packet_type"] == "imu":
                if not first_packet_ignored:
                    first_packet_ignored = True
                    continue  # Ignore first packet to avoid initial noise

                imu = packet["data"]
                if all(param in imu and len(imu[param]) == 8 for param in ["qw", "qx", "qy", "qz"]):
                    for i in range(8):
                        qw, qx, qy, qz = imu["qw"][i], imu["qx"][i], imu["qy"][i], imu["qz"][i]
                        pitch, roll, yaw = quaternion_to_euler(qw, qx, qy, qz)
                        process_imu_data(pitch, yaw)
                        # print(pitch, yaw)

            elif packet["packet_type"] == "emg":
                emg_values = packet["data"]
                # print(f"Raw EMG data received: {emg_values}")  # Debugging line to check EMG structure
                process_emg_data(emg_values)

    except KeyboardInterrupt:
        print("Streaming interrupted by user.")
    except Exception as e:
        print(f"Error during streaming: {e}")
    finally:
        bridge.stop()
        bridge.disconnect()
        print("Streaming stopped and bridge disconnected.")


if __name__ == '__main__':
    EXECUTABLE_PATH = "./sifibridge.exe"
    bridge = sbp.SifiBridge(EXECUTABLE_PATH)
    stream_data(bridge=bridge)