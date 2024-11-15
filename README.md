# Cosmic Clash!!
## Overview
This project integrates a BioPoint wristband with a game built using Python and Node.js. The wristband captures real-time motion and EMG (Electromyography) data to control game dynamics, while collisions detected in the game trigger a motor activation mechanism.

## Key Features:
Motion-Based Controls: Uses IMU (Inertial Measurement Unit) data from the wristband for player movement.
Shooting Mechanism: Triggered by EMG signals processed from the wristband.
Motor Activation: Upon detecting a collision, the motor activates for 2 seconds.
Real-Time Communication: Facilitates seamless interaction between Python, Node.js, and the game.
## System Architecture
The system consists of the following components:

1. BioPoint Wristband
Captures IMU and EMG data.
Sends raw data packets to the Python script for processing.
2. Python Script
Processes IMU and EMG data to control movement and shooting.
Listens for collisionDetected events from the server.
Activates the motor using the SiFi bridge library.
3. Node.js Server
Hosts the game using Express.js.
Updates player positions and detects collisions.
Emits collision events to the Python script.
4. Socket.IO
Facilitates bi-directional communication between Python and Node.js.
5. Client1.html and client2.html
Visual showcase of the server.js data, they run their own client1.js & client2.js files seperately
## Installation and Setup
Prerequisites

This project is made using SifiLabs dependencies found here: https://github.com/SiFiLabs/sifi-bridge-pub https://github.com/SiFiLabs/sifi-bridge-py

### Hardware: 

BioPoint wristband.

### Software:

Python 3.8+ with required libraries.

Node.js (16+ recommended).

SiFi Bridge CLI tool.

Installation:

git clone https://github.com/tom-oldfield/game_project.game
in the project folder: npm install
it will install the necessary node modules to run.

download the latest release in sifi-bridge-pub windows recommended: sifibridge-1.1.3-x86_64-pc-windows-msvc.zip

make sure you have python version 3.12

make sure you have the application version 1.1.3 because 1.2.0 is not currently supported make sure the sifi-bridge-py is 1.1.3, if you have python version 3.12 it will support 1.1.3

use the command: PIP install sifi-bridge-py

pip install python-socketio

copy the executable from pub examples into the sifi folder

first start the server using: node server.js
then visit the server.js website in the script address, default localhost:3000 

Ensure the wristband is paired with your system.
Confirm the connection using the SiFi Bridge tool.
## Usage
1. Game Controls:
Player Movement: Controlled using wrist motion (IMU data).
Shooting: Triggered by strong EMG signals (e.g., clenching your fist).
2. Collision Handling:
When a player collides with an obstacle:
The server emits a collisionDetected event.
The Python script receives the event and activates the motor for 2 seconds.
Files and Structure
1. server.js
Hosts the game.
Detects collisions and emits collisionDetected events.
2. sensor_to_keypresses.py
Processes IMU and EMG data.
Sends movement and shooting commands to the server.
Activates the motor upon collision.
3. public/client1.js and public/client2.js
Handle game visuals and interactions for two players.
4. sifi_bridge.py
Interface for interacting with the BioPoint wristband and motor.
## Troubleshooting
Common Issues:
Server Not Responding:

Ensure Node.js is installed and running on the correct port (3000 by default).
Python Script Errors:

Check that the SiFi bridge is properly configured and the wristband is connected.
No Motor Activation:

Verify the collisionDetected event is being emitted by the server.
Ensure the motor is properly wired and controlled via the SiFi bridge.
Future Improvements
Enhance collision detection with more complex algorithms.
Support multiple players with independent motor controls.
Integrate additional sensor-based features like gesture recognition.
