#!/usr/bin/env python3
"""
Fixed SUMO Bridge for TraCI connections that properly loads route files and vehicles.
This version uses traci.start() instead of manual server initialization.
"""

import os
import sys
import time
import threading
import subprocess
import json
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS

# Add SUMO tools to path
if 'SUMO_HOME' in os.environ:
    tools = os.path.join(os.environ['SUMO_HOME'], 'tools')
    sys.path.append(tools)
else:
    sys.exit("Please declare environment variable 'SUMO_HOME'")

import traci
import sumolib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SUMOBridge:
    def __init__(self):
        self.connected = False
        self.simulation_running = False
        self.sumo_process = None
        self.update_thread = None
        self.stop_updates = False
        self.current_data = {
            'time': 0,
            'vehicles': [],
            'traffic_lights': [],
            'statistics': {}
        }
        
    def connect_to_sumo_fixed(self, config_path, use_gui=False):
        """
        Fixed connection method using traci.start() for proper route loading.
        
        Args:
            config_path: Path to SUMO config file (.sumocfg)
            use_gui: Whether to use SUMO GUI or headless mode
        """
        try:
            # Disconnect any existing connection
            if self.connected:
                self.disconnect_from_sumo()
            
            # Get absolute paths
            config_path = os.path.abspath(config_path)
            config_dir = os.path.dirname(config_path)
            config_file = os.path.basename(config_path)
            
            # Verify config file exists
            if not os.path.exists(config_path):
                raise FileNotFoundError(f"Config file not found: {config_path}")
            
            logger.info(f"Using SUMO config: {config_path}")
            
            # Determine SUMO binary
            if 'SUMO_HOME' in os.environ:
                sumo_home = os.environ['SUMO_HOME']
                if use_gui:
                    sumo_binary = os.path.join(sumo_home, 'bin', 'sumo-gui.exe' if os.name == 'nt' else 'sumo-gui')
                else:
                    sumo_binary = os.path.join(sumo_home, 'bin', 'sumo.exe' if os.name == 'nt' else 'sumo')
                    
                if not os.path.exists(sumo_binary):
                    # Fallback to PATH
                    sumo_binary = "sumo-gui" if use_gui else "sumo"
            else:
                sumo_binary = "sumo-gui" if use_gui else "sumo"
            
            # Build SUMO command - CRITICAL: Don't use --start flag
            sumo_cmd = [
                sumo_binary,
                "-c", config_file,
                "--step-length", "1.0",
                "--no-warnings",
                "--no-step-log",
                "--duration-log.statistics",
                "--quit-on-end"
                # DO NOT include --start flag - let TraCI control the simulation
            ]
            
            # Additional parameters for large networks
            if not use_gui:
                sumo_cmd.extend([
                    "--xml-validation", "never",
                    "--ignore-route-errors",
                    "--eager-insert",
                    "--max-depart-delay", "3600",
                    "--time-to-teleport", "300"
                ])
            
            logger.info(f"Starting SUMO with command: {' '.join(sumo_cmd)}")
            logger.info(f"Working directory: {config_dir}")
            
            # Store original working directory
            original_cwd = os.getcwd()
            
            try:
                # CRITICAL: Change to config directory for relative paths in config file
                os.chdir(config_dir)
                
                # Use traci.start() which handles the connection properly
                traci.start(sumo_cmd, label="default")
                
                # Wait for initialization
                time.sleep(0.5)
                
                # Verify connection
                sim_time = traci.simulation.getTime()
                loaded = traci.simulation.getLoadedNumber()
                departed = traci.simulation.getDepartedNumber()
                
                logger.info(f"Connected to SUMO successfully!")
                logger.info(f"Initial state - Time: {sim_time}, Loaded: {loaded}, Departed: {departed}")
                
                # Check for route file issues
                if loaded == 0:
                    logger.warning("No vehicles loaded initially. Checking route files...")
                    
                    # Run a few steps to see if vehicles appear
                    for i in range(5):
                        traci.simulationStep()
                        loaded = traci.simulation.getLoadedNumber()
                        if loaded > 0:
                            logger.info(f"Vehicles appeared after {i+1} steps: {loaded}")
                            break
                
                self.connected = True
                self.simulation_running = True
                
                # Start data update thread
                self.start_data_updates()
                
                return True
                
            finally:
                # Restore original directory
                os.chdir(original_cwd)
                
        except Exception as e:
            logger.error(f"Failed to connect to SUMO: {e}")
            self.connected = False
            return False
    
    def disconnect_from_sumo(self):
        """Disconnect from SUMO"""
        try:
            self.stop_data_updates()
            
            if self.connected:
                traci.close()
                self.connected = False
                self.simulation_running = False
                logger.info("Disconnected from SUMO")
                
        except Exception as e:
            logger.error(f"Error during disconnection: {e}")
    
    def start_data_updates(self):
        """Start the data update thread"""
        if self.update_thread is None or not self.update_thread.is_alive():
            self.stop_updates = False
            self.update_thread = threading.Thread(target=self.update_data_loop)
            self.update_thread.daemon = True
            self.update_thread.start()
            logger.info("Started data update thread")
    
    def stop_data_updates(self):
        """Stop the data update thread"""
        self.stop_updates = True
        if self.update_thread and self.update_thread.is_alive():
            self.update_thread.join(timeout=2)
            logger.info("Stopped data update thread")
    
    def update_data_loop(self):
        """Main loop for updating simulation data"""
        while not self.stop_updates and self.connected:
            try:
                if self.simulation_running:
                    # Advance simulation
                    traci.simulationStep()
                    
                    # Update current data
                    self.current_data = {
                        'time': traci.simulation.getTime(),
                        'vehicles': self.get_vehicle_data(),
                        'traffic_lights': self.get_traffic_light_data(),
                        'statistics': self.get_statistics()
                    }
                    
                time.sleep(0.1)  # 100ms update interval
                
            except Exception as e:
                logger.error(f"Error in update loop: {e}")
                break
    
    def get_vehicle_data(self):
        """Get current vehicle data"""
        vehicles = []
        try:
            for veh_id in traci.vehicle.getIDList():
                vehicles.append({
                    'id': veh_id,
                    'position': traci.vehicle.getPosition(veh_id),
                    'speed': traci.vehicle.getSpeed(veh_id),
                    'route': traci.vehicle.getRoute(veh_id),
                    'edge': traci.vehicle.getRoadID(veh_id)
                })
        except Exception as e:
            logger.error(f"Error getting vehicle data: {e}")
        return vehicles
    
    def get_traffic_light_data(self):
        """Get current traffic light data"""
        lights = []
        try:
            for tl_id in traci.trafficlight.getIDList():
                lights.append({
                    'id': tl_id,
                    'state': traci.trafficlight.getRedYellowGreenState(tl_id),
                    'phase': traci.trafficlight.getPhase(tl_id),
                    'program': traci.trafficlight.getProgram(tl_id)
                })
        except Exception as e:
            logger.error(f"Error getting traffic light data: {e}")
        return lights
    
    def get_statistics(self):
        """Get simulation statistics"""
        try:
            return {
                'loaded': traci.simulation.getLoadedNumber(),
                'departed': traci.simulation.getDepartedNumber(),
                'arrived': traci.simulation.getArrivedNumber(),
                'active': len(traci.vehicle.getIDList()),
                'waiting': traci.simulation.getWaitingVehicleNumber(),
                'teleports': traci.simulation.getStartingTeleportNumber()
            }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
    
    def step_simulation(self, steps=1):
        """Manually step the simulation"""
        if not self.connected:
            return False
            
        try:
            for _ in range(steps):
                traci.simulationStep()
            return True
        except Exception as e:
            logger.error(f"Error stepping simulation: {e}")
            return False
    
    def set_simulation_speed(self, speed):
        """Set simulation speed (delay between steps in ms)"""
        # This would be implemented based on your needs
        pass
    
    def pause_simulation(self):
        """Pause the simulation"""
        self.simulation_running = False
        logger.info("Simulation paused")
    
    def resume_simulation(self):
        """Resume the simulation"""
        if self.connected:
            self.simulation_running = True
            logger.info("Simulation resumed")
    
    def get_current_data(self):
        """Get the current simulation data"""
        return self.current_data

# Flask API
app = Flask(__name__)
CORS(app)
bridge = SUMOBridge()

@app.route('/connect', methods=['POST'])
def connect():
    """Connect to SUMO with specified config"""
    data = request.json
    config_path = data.get('config', 'AddisAbabaSumo/AddisAbaba.sumocfg')
    use_gui = data.get('gui', False)
    
    success = bridge.connect_to_sumo_fixed(config_path, use_gui)
    
    return jsonify({
        'success': success,
        'connected': bridge.connected
    })

@app.route('/disconnect', methods=['POST'])
def disconnect():
    """Disconnect from SUMO"""
    bridge.disconnect_from_sumo()
    return jsonify({'success': True})

@app.route('/status', methods=['GET'])
def status():
    """Get connection and simulation status"""
    return jsonify({
        'connected': bridge.connected,
        'running': bridge.simulation_running,
        'data': bridge.get_current_data()
    })

@app.route('/step', methods=['POST'])
def step():
    """Step the simulation"""
    data = request.json
    steps = data.get('steps', 1)
    success = bridge.step_simulation(steps)
    return jsonify({'success': success})

@app.route('/pause', methods=['POST'])
def pause():
    """Pause the simulation"""
    bridge.pause_simulation()
    return jsonify({'success': True})

@app.route('/resume', methods=['POST'])
def resume():
    """Resume the simulation"""
    bridge.resume_simulation()
    return jsonify({'success': True})

@app.route('/data', methods=['GET'])
def get_data():
    """Get current simulation data"""
    return jsonify(bridge.get_current_data())

if __name__ == '__main__':
    # Test connection
    print("Testing SUMO Bridge...")
    
    # Try to connect to default config
    config_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        '../../AddisAbabaSumo/AddisAbaba.sumocfg'
    )
    
    if os.path.exists(config_path):
        print(f"Testing with config: {config_path}")
        
        success = bridge.connect_to_sumo_fixed(config_path, use_gui=True)
        
        if success:
            print("✅ Connection successful!")
            
            # Run for a few seconds
            time.sleep(5)
            
            # Print statistics
            stats = bridge.get_statistics()
            print(f"Statistics: {stats}")
            
            # Disconnect
            bridge.disconnect_from_sumo()
        else:
            print("❌ Connection failed!")
    else:
        print(f"Config file not found: {config_path}")
        print("Starting Flask server instead...")
        app.run(host='0.0.0.0', port=5000, debug=True)
