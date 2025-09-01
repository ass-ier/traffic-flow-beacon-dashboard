#!/usr/bin/env python3
"""
SUMO TraCI Bridge Service
Connects to SUMO via TraCI and exposes data via HTTP API
"""

import traci
import sumolib
import json
import time
import threading
import subprocess
from flask import Flask, jsonify
from flask_cors import CORS
import logging
import sys
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SUMOBridge:
    def __init__(self, sumo_host='localhost', sumo_port=8813, api_port=8814):
        self.sumo_host = sumo_host
        self.sumo_port = sumo_port
        self.api_port = api_port
        self.connected = False
        self.simulation_running = False
        
        # SUMO process management
        self.sumo_process = None
        
        # Data cache
        self.vehicles_data = []
        self.intersections_data = []
        self.roads_data = []
        self.emergency_vehicles_data = []
        self.simulation_stats = {}
        
        # Flask app
        self.app = Flask(__name__)
        CORS(self.app)
        self.setup_routes()
        
        # Update thread
        self.update_thread = None
        self.stop_updates = False
        
    def safe_float(self, value, default=0.0):
        """Safely convert TraCI return value to float"""
        try:
            if isinstance(value, (tuple, list)):
                if len(value) > 0:
                    return float(value[0])
                else:
                    return default
            elif value is None:
                return default
            else:
                return float(value)
        except (ValueError, TypeError, IndexError, OverflowError):
            return default
    
    def safe_int(self, value, default=0):
        """Safely convert TraCI return value to int"""
        try:
            if isinstance(value, (tuple, list)):
                if len(value) > 0:
                    return int(value[0])
                else:
                    return default
            elif value is None:
                return default
            else:
                return int(value)
        except (ValueError, TypeError, IndexError, OverflowError):
            return default
        
    def setup_routes(self):
        """Setup Flask API routes"""
        
        @self.app.route('/health')
        def health():
            return jsonify({
                'status': 'healthy',
                'connected': self.connected,
                'simulation_running': self.simulation_running,
                'timestamp': time.time()
            })
        
        @self.app.route('/system-info')
        def system_info():
            """Provide comprehensive system information"""
            try:
                # Check SUMO availability
                import subprocess
                try:
                    result = subprocess.run(['sumo', '--version'], capture_output=True, text=True, timeout=5)
                    sumo_available = result.returncode == 0
                    sumo_version = result.stdout.split('\n')[0] if sumo_available else 'Not available'
                except:
                    sumo_available = False
                    sumo_version = 'Not available'
                
                return jsonify({
                    'status': 'success',
                    'data': {
                        'python_bridge': {
                            'running': True,
                            'port': self.api_port,
                            'connected_to_sumo': self.connected,
                            'simulation_running': self.simulation_running
                        },
                        'sumo': {
                            'available': sumo_available,
                            'version': sumo_version,
                            'traci_port': self.sumo_port,
                            'connected': self.connected
                        },
                        'vehicle_count': len(traci.vehicle.getIDList()) if self.connected else 0,
                        'simulation_time': self.safe_float(traci.simulation.getTime()) if self.connected else 0,
                        'timestamp': time.time()
                    }
                })
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': str(e),
                    'timestamp': time.time()
                }), 500
        
        @self.app.route('/connect', methods=['POST'])
        def connect():
            try:
                success = self.connect_to_sumo()
                return jsonify({
                    'status': 'success' if success else 'error',
                    'message': 'Connected to SUMO' if success else 'Failed to connect to SUMO',
                    'data': {
                        'connected': success,
                        'sumo_running': success,
                        'simulation_time': traci.simulation.getTime() if success else 0,
                        'vehicle_count': len(traci.vehicle.getIDList()) if success else 0
                    }
                })
            except Exception as e:
                logger.error(f"Connection error: {e}")
                return jsonify({
                    'status': 'error',
                    'message': str(e)
                }), 500
        
        @self.app.route('/start-sumo', methods=['POST'])
        def start_sumo():
            try:
                from flask import request
                data = request.get_json() or {}
                config_path = data.get('config_path', 'AddisAbaba.sumocfg')  # Use main config
                gui = data.get('gui', True)  # Default to GUI mode as per specifications
                
                # Use the fixed connect_to_sumo method which handles everything
                connected = self.connect_to_sumo(use_gui=gui)
                
                if connected:
                    # Wait a moment for SUMO to fully initialize
                    time.sleep(3)
                    
                    # Get initial statistics
                    current_time = self.safe_float(traci.simulation.getTime())
                    final_vehicle_count = len(traci.vehicle.getIDList())
                    loaded_count = traci.simulation.getLoadedNumber()
                    departed_count = traci.simulation.getDepartedNumber()
                    
                    logger.info(f"SUMO connected - Loaded: {loaded_count}, Active: {final_vehicle_count}, Departed: {departed_count}")
                    
                    # Return success with current state
                    return jsonify({
                        'status': 'success',
                        'message': f'SUMO connected successfully with {loaded_count} vehicles loaded',
                        'data': {
                            'sumo_started': True,
                            'connected': True,
                            'simulation_time': current_time,
                            'vehicle_count': final_vehicle_count,
                            'loaded_count': loaded_count,
                            'departed_count': departed_count
                        }
                    })
                else:
                    return jsonify({
                        'status': 'error',
                        'message': 'Failed to connect to SUMO'
                    }), 500
            except Exception as e:
                logger.error(f"SUMO start error: {e}")
                return jsonify({
                    'status': 'error',
                    'message': str(e)
                }), 500
        
        @self.app.route('/stop-sumo', methods=['POST'])
        def stop_sumo():
            try:
                self.stop_sumo_process()
                return jsonify({
                    'status': 'success',
                    'message': 'SUMO stopped successfully'
                })
            except Exception as e:
                logger.error(f"SUMO stop error: {e}")
                return jsonify({
                    'status': 'error',
                    'message': str(e)
                }), 500
        
        @self.app.route('/start-sumo-full', methods=['POST'])
        def start_sumo_full():
            """Start SUMO with the full AddisAbaba configuration (9,886 vehicles)"""
            try:
                from flask import request
                data = request.get_json() or {}
                config_path = 'dashboard_config.sumocfg'  # Force full configuration with working routes
                gui = data.get('gui', False)
                
                success = self.start_sumo_process(config_path, gui)
                if success:
                    # Wait longer for full configuration to initialize
                    logger.info("Waiting for SUMO full configuration to initialize (10 seconds)...")
                    time.sleep(10)
                    
                    # Try to connect
                    connected = self.connect_to_sumo()
                    
                    if connected:
                        # Wait for vehicles to load in full simulation
                        time.sleep(5)
                        final_vehicle_count = len(traci.vehicle.getIDList())
                        
                        # If no vehicles yet, try advancing more steps
                        if final_vehicle_count == 0:
                            logger.info("No vehicles found initially in full sim, advancing simulation...")
                            for _ in range(10):
                                traci.simulationStep()
                                final_vehicle_count = len(traci.vehicle.getIDList())
                                if final_vehicle_count > 0:
                                    break
                                time.sleep(1)
                    else:
                        final_vehicle_count = 0
                    
                    return jsonify({
                        'status': 'success' if connected else 'error',
                        'message': f'SUMO Full (9,886 vehicles) connected with {final_vehicle_count} active vehicles' if connected else 'SUMO started but connection failed',
                        'data': {
                            'sumo_started': True,
                            'connected': connected,
                            'simulation_time': self.safe_float(traci.simulation.getTime()) if connected else 0,
                            'vehicle_count': final_vehicle_count,
                            'configuration': 'full'
                        }
                    })
                else:
                    return jsonify({
                        'status': 'error',
                        'message': 'Failed to start SUMO process with full configuration'
                    }), 500
            except Exception as e:
                logger.error(f"SUMO full start error: {e}")
                return jsonify({
                    'status': 'error',
                    'message': str(e)
                }), 500
        
        @self.app.route('/disconnect', methods=['POST'])
        def disconnect():
            try:
                self.disconnect_from_sumo()
                return jsonify({
                    'status': 'success',
                    'message': 'Disconnected from SUMO'
                })
            except Exception as e:
                logger.error(f"Disconnection error: {e}")
                return jsonify({
                    'status': 'error',
                    'message': str(e)
                }), 500
        
        @self.app.route('/status')
        def get_status():
            try:
                if self.connected:
                    current_time = traci.simulation.getTime()
                    vehicle_count = len(traci.vehicle.getIDList())
                else:
                    current_time = 0
                    vehicle_count = 0
                    
                return jsonify({
                    'status': 'success',
                    'data': {
                        'connected': self.connected,
                        'sumo_running': self.simulation_running,
                        'simulation_time': current_time,
                        'vehicle_count': vehicle_count,
                        'last_update': time.time()
                    }
                })
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': str(e),
                    'data': {
                        'connected': False,
                        'sumo_running': False,
                        'simulation_time': 0,
                        'vehicle_count': 0,
                        'last_update': time.time()
                    }
                })
        
        @self.app.route('/vehicles')
        def get_vehicles():
            return jsonify({
                'status': 'success',
                'data': self.vehicles_data,
                'timestamp': time.time(),
                'count': len(self.vehicles_data)
            })
        
        @self.app.route('/intersections')
        def get_intersections():
            return jsonify({
                'status': 'success',
                'data': self.intersections_data,
                'timestamp': time.time(),
                'count': len(self.intersections_data)
            })
        
        @self.app.route('/roads')
        def get_roads():
            return jsonify({
                'roads': self.roads_data,
                'timestamp': time.time(),
                'count': len(self.roads_data)
            })
        
        @self.app.route('/emergency-vehicles')
        def get_emergency_vehicles():
            return jsonify({
                'emergency_vehicles': self.emergency_vehicles_data,
                'timestamp': time.time(),
                'count': len(self.emergency_vehicles_data)
            })
        
        @self.app.route('/simulation-stats')
        def get_simulation_stats():
            return jsonify({
                'stats': self.simulation_stats,
                'timestamp': time.time()
            })
        
        @self.app.route('/all-data')
        def get_all_data():
            return jsonify({
                'vehicles': self.vehicles_data,
                'intersections': self.intersections_data,
                'roads': self.roads_data,
                'emergency_vehicles': self.emergency_vehicles_data,
                'stats': self.simulation_stats,
                'timestamp': time.time()
            })
        
        @self.app.route('/command/traffic-light', methods=['POST'])
        def override_traffic_light():
            try:
                from flask import request
                data = request.get_json()
                intersection_id = data.get('intersectionId')
                phase = data.get('phase', 'green')
                duration = data.get('duration', 30)
                
                success = self.override_traffic_light(intersection_id, phase, duration)
                return jsonify({
                    'success': success,
                    'message': f'Traffic light {intersection_id} set to {phase}' if success else 'Command failed'
                })
            except Exception as e:
                return jsonify({'success': False, 'message': str(e)}), 500
                
        @self.app.route('/simulation/pause', methods=['POST'])
        def pause_simulation():
            try:
                if self.connected:
                    self.stop_data_updates()
                    return jsonify({
                        'status': 'success',
                        'message': 'Simulation paused'
                    })
                else:
                    return jsonify({
                        'status': 'error',
                        'message': 'Not connected to SUMO'
                    }), 400
            except Exception as e:
                logger.error(f"Pause error: {e}")
                return jsonify({
                    'status': 'error',
                    'message': str(e)
                }), 500
                
        @self.app.route('/simulation/resume', methods=['POST'])
        def resume_simulation():
            try:
                if self.connected:
                    self.start_data_updates()
                    return jsonify({
                        'status': 'success',
                        'message': 'Simulation resumed'
                    })
                else:
                    return jsonify({
                        'status': 'error',
                        'message': 'Not connected to SUMO'
                    }), 400
            except Exception as e:
                logger.error(f"Resume error: {e}")
                return jsonify({
                    'status': 'error',
                    'message': str(e)
                }), 500
    
    def connect_to_sumo(self, use_gui=False):
        """Connect to SUMO via TraCI using fixed approach with traci.start()"""
        try:
            logger.info("Connecting to SUMO via TraCI (using fixed method with traci.start())...")
            
            # Close any existing connection first
            try:
                traci.close()
            except Exception:
                pass
            
            # Determine config path to use
            config_to_use = None
            
            # Get project root
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(script_dir))
            
            # Use AddisAbaba.sumocfg as the main config (it has routes.xml)
            regular_config = os.path.join(project_root, 'AddisAbabaSumo', 'AddisAbaba.sumocfg')
            
            if os.path.exists(regular_config):
                config_to_use = regular_config
                logger.info(f"Using config: {regular_config}")
            else:
                raise Exception(f"SUMO config file not found: {regular_config}")
            
            # Get absolute paths
            config_path = os.path.abspath(config_to_use)
            config_dir = os.path.dirname(config_path)
            config_file = os.path.basename(config_path)
            
            # Determine SUMO binary
            sumo_home = os.environ.get('SUMO_HOME')
            if sumo_home:
                if use_gui:
                    sumo_binary = os.path.join(sumo_home, 'bin', 'sumo-gui.exe')
                else:
                    sumo_binary = os.path.join(sumo_home, 'bin', 'sumo.exe')
                    
                if not os.path.exists(sumo_binary):
                    sumo_binary = "sumo-gui" if use_gui else "sumo"
            else:
                sumo_binary = "sumo-gui" if use_gui else "sumo"
            
            # Build SUMO command - CRITICAL: Don't use --start flag with traci.start()
            sumo_cmd = [
                sumo_binary,
                "-c", config_file,
                "--step-length", "1.0",
                "--no-warnings",
                "--no-step-log",
                "--quit-on-end",
                "--delay", "0",  # No delay for headless mode
                "--begin", "0",  # Start from time 0
                "--end", "10800"  # 3 hour simulation as defined in config
            ]
            
            # Additional parameters for optimization
            if not use_gui:
                sumo_cmd.extend([
                    "--xml-validation", "never",
                    "--ignore-route-errors",
                    "--eager-insert",
                    "--max-depart-delay", "7200",
                    "--time-to-teleport", "600"
                ])
            
            logger.info(f"Starting SUMO with: {' '.join(sumo_cmd)}")
            logger.info(f"Working directory: {config_dir}")
            
            # Store original working directory
            original_cwd = os.getcwd()
            
            try:
                # CRITICAL: Change to config directory for relative paths
                os.chdir(config_dir)
                
                # Use traci.start() - the proper way to connect
                traci.start(sumo_cmd, label="default")
                
                # Wait for initialization
                import time
                time.sleep(2)
                
                # Verify connection
                current_time = self.safe_float(traci.simulation.getTime())
                loaded_vehicles = traci.simulation.getLoadedNumber()
                departed_vehicles = traci.simulation.getDepartedNumber()
                
                logger.info(f"Connected to SUMO successfully!")
                logger.info(f"Initial state - Time: {current_time}, Loaded: {loaded_vehicles}, Departed: {departed_vehicles}")
                
                # CRITICAL FIX: Advance simulation to load vehicles from routes.xml
                if loaded_vehicles == 0 or departed_vehicles == 0:
                    logger.warning("No vehicles loaded/departed initially, advancing simulation to load routes...")
                    steps_needed = 0
                    max_steps = 100  # Try up to 100 steps to get vehicles
                    
                    for i in range(max_steps):
                        traci.simulationStep()
                        steps_needed += 1
                        
                        # Check every 10 steps
                        if i % 10 == 0:
                            loaded_vehicles = traci.simulation.getLoadedNumber()
                            departed_vehicles = traci.simulation.getDepartedNumber()
                            active_vehicles = len(traci.vehicle.getIDList())
                            
                            logger.info(f"Step {i}: Loaded={loaded_vehicles}, Departed={departed_vehicles}, Active={active_vehicles}")
                            
                            # If we have active vehicles, routes are loading correctly
                            if active_vehicles > 0:
                                logger.info(f"✅ Vehicles detected after {steps_needed} steps! Active vehicles: {active_vehicles}")
                                break
                    
                    # Final check
                    final_active = len(traci.vehicle.getIDList())
                    if final_active == 0:
                        logger.warning(f"⚠️ No active vehicles after {max_steps} steps. Check route file: routes.xml")
                    else:
                        logger.info(f"✅ Simulation ready with {final_active} active vehicles")
                
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
            logger.error(f"Error details: {type(e).__name__}: {str(e)}")
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
    
    def start_sumo_process(self, config_path, use_gui=False):  # Default to headless
        """Start SUMO process with the given configuration"""
        try:
            # Stop any existing SUMO process
            self.stop_sumo_process()
            
            # Get the directory where this script is located
            script_dir = os.path.dirname(os.path.abspath(__file__))
            # Go up to project root
            project_root = os.path.dirname(os.path.dirname(script_dir))
            
            # Set working directory to AddisAbabaSumo for relative path compatibility
            sumo_dir = os.path.join(project_root, 'AddisAbabaSumo')
            
            # Use relative config file name when running from AddisAbabaSumo directory
            if os.path.isabs(config_path):
                # If absolute path provided, use as is
                actual_config_path = config_path
            else:
                # If relative path, it should be relative to AddisAbabaSumo directory
                config_filename = os.path.basename(config_path)
                actual_config_path = config_filename
            
            logger.info(f"Using SUMO config: {actual_config_path} in directory: {sumo_dir}")
            
            # Verify config file exists in the AddisAbabaSumo directory
            full_config_path = os.path.join(sumo_dir, actual_config_path)
            if not os.path.exists(full_config_path):
                raise Exception(f"SUMO config file not found: {full_config_path}")
            
            # Build SUMO command with full path from SUMO_HOME
            sumo_home = os.environ.get('SUMO_HOME')
            if sumo_home:
                if use_gui:
                    sumo_cmd = [os.path.join(sumo_home, 'bin', 'sumo-gui.exe')]
                else:
                    sumo_cmd = [os.path.join(sumo_home, 'bin', 'sumo.exe')]
            else:
                # Fallback to PATH-based commands
                if use_gui:
                    sumo_cmd = ['sumo-gui']
                else:
                    sumo_cmd = ['sumo']
            
            # Optimized command parameters for large network files
            sumo_cmd.extend([
                '-c', actual_config_path,
                '--remote-port', str(self.sumo_port),
                '--step-length', '1.0',
                '--start',  # Start simulation immediately
                
                # Memory optimization for large networks
                '--xml-validation', 'never',  # Skip XML validation for speed
                '--no-internal-links',        # Reduce memory usage
                '--threads', '1',             # Single thread for stability with large files
                '--step-method.ballistic',    # More efficient physics
                '--no-warnings',              # Reduce log noise
                '--no-step-log',              # Reduce logging overhead
                
                # Route processing optimization
                '--max-depart-delay', '7200', # Allow more time for large files
                '--ignore-route-errors',      # Skip problematic routes
                '--eager-insert',             # Insert vehicles ASAP
                '--time-to-teleport', '600',  # Longer teleport time
                
                # Performance monitoring
                '--duration-log.statistics'   # Monitor performance
            ])
            
            logger.info(f"Starting SUMO with command: {' '.join(sumo_cmd)} in directory: {sumo_dir}")
            
            # Start SUMO process with better output capture
            self.sumo_process = subprocess.Popen(
                sumo_cmd,
                cwd=sumo_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,  # Capture stderr to stdout
                text=True,
                bufsize=1,  # Line buffered
                universal_newlines=True
            )
            
            logger.info(f"SUMO process started with PID: {self.sumo_process.pid}")
            
            # Give SUMO a moment to initialize
            import time
            time.sleep(1)
            
            # Check if process is still running
            if self.sumo_process.poll() is not None:
                # Process has terminated, get output
                stdout, _ = self.sumo_process.communicate()
                logger.error(f"SUMO process terminated immediately. Output: {stdout}")
                return False
            
            logger.info("SUMO process appears to be running successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start SUMO process: {e}")
            return False
    
    def stop_sumo_process(self):
        """Stop the SUMO process"""
        try:
            # Disconnect first
            if self.connected:
                self.disconnect_from_sumo()
            
            # Terminate SUMO process
            if self.sumo_process:
                logger.info("Stopping SUMO process...")
                self.sumo_process.terminate()
                
                # Wait for graceful shutdown
                try:
                    self.sumo_process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    logger.warning("SUMO process didn't terminate gracefully, killing...")
                    self.sumo_process.kill()
                    self.sumo_process.wait()
                
                self.sumo_process = None
                logger.info("SUMO process stopped")
                
        except Exception as e:
            logger.error(f"Error stopping SUMO process: {e}")
    
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
        """Main data update loop - steps simulation and updates data"""
        logger.info("Data update loop started - controlling simulation")
        update_count = 0
        last_time = -1
        
        while not self.stop_updates and self.connected:
            try:
                update_count += 1
                
                # Get current simulation state BEFORE stepping
                current_time = self.safe_float(traci.simulation.getTime())
                vehicle_count = len(traci.vehicle.getIDList())
                
                # CRITICAL: Step the simulation to advance time
                # This is needed for vehicles to move and routes to be processed
                if self.simulation_running:
                    traci.simulationStep()
                    
                    # Check if time is advancing
                    new_time = self.safe_float(traci.simulation.getTime())
                    if new_time > last_time:
                        last_time = new_time
                    else:
                        logger.warning(f"Simulation time not advancing: {new_time}")
                
                # Log every 10 updates to monitor progress
                if update_count % 10 == 0:
                    loaded = traci.simulation.getLoadedNumber()
                    departed = traci.simulation.getDepartedNumber()
                    logger.info(f"Update {update_count}: Time={current_time:.1f}s, Active={vehicle_count}, Loaded={loaded}, Departed={departed}")
                
                # Update all simulation data after stepping
                self.update_simulation_data()
                
                # Control update rate (adjust as needed for performance)
                time.sleep(0.1)  # Update 10 times per second
                
            except Exception as e:
                logger.error(f"Error in data update loop (update {update_count}): {e}")
                logger.error(f"Error type: {type(e).__name__}")
                
                # Check if it's a connection error
                if "connection" in str(e).lower() or "socket" in str(e).lower():
                    logger.warning("TraCI connection lost in update loop")
                    self.connected = False
                    self.simulation_running = False
                    break
                    
                time.sleep(5)  # Wait before retrying
        
        logger.info(f"Data update loop stopped after {update_count} updates")
    
    def update_simulation_data(self):
        """Update all simulation data from SUMO"""
        if not self.connected:
            return
        
        try:
            # Update vehicles
            self.update_vehicles_data()
            
            # Update intersections (traffic lights)
            self.update_intersections_data()
            
            # Update roads (edges)
            self.update_roads_data()
            
            # Update simulation stats
            self.update_simulation_stats()
            
            # Check if simulation has ended
            if traci.simulation.getMinExpectedNumber() == 0:
                logger.info("Simulation completed - no more vehicles expected")
                
        except Exception as e:
            logger.error(f"Error updating simulation data: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            # Try to reconnect if connection is lost
            if "connection" in str(e).lower() or "socket" in str(e).lower():
                logger.warning("Connection lost, marking as disconnected")
                self.connected = False
                self.simulation_running = False
    
    def update_vehicles_data(self):
        """Update vehicle data from SUMO"""
        try:
            vehicle_ids = traci.vehicle.getIDList()
            vehicles = []
            emergency_vehicles = []
            
            for vehicle_id in vehicle_ids:
                try:
                    # Get vehicle data
                    position = traci.vehicle.getPosition(vehicle_id)
                    speed = self.safe_float(traci.vehicle.getSpeed(vehicle_id))
                    angle = self.safe_float(traci.vehicle.getAngle(vehicle_id))
                    vehicle_type = traci.vehicle.getTypeID(vehicle_id)
                    road_id = traci.vehicle.getRoadID(vehicle_id)
                    lane_id = traci.vehicle.getLaneID(vehicle_id)
                    route = traci.vehicle.getRoute(vehicle_id)
                    
                    # Convert SUMO coordinates to lat/lng for Addis Ababa
                    # Assuming SUMO coordinates are in meters from a reference point
                    # Adjust these offsets based on your network's actual coordinate system
                    lat = 9.0320 + (position[1] / 111320.0)  # Convert meters to degrees latitude
                    lng = 38.7469 + (position[0] / (111320.0 * 0.9))  # Convert meters to degrees longitude
                    
                    vehicle_data = {
                        'id': vehicle_id,
                        'type': self.map_vehicle_type(vehicle_type),
                        'position': {
                            'lat': lat,
                            'lng': lng,
                            'roadId': road_id,
                            'laneId': lane_id
                        },
                        'speed': speed * 3.6,  # Convert m/s to km/h
                        'angle': angle,
                        'route': list(route),
                        'timestamp': time.time() * 1000,  # Convert to milliseconds
                        'waitingTime': self.safe_float(traci.vehicle.getWaitingTime(vehicle_id)),
                        'distance': self.safe_float(traci.vehicle.getDistance(vehicle_id))
                    }
                    
                    # Check if it's an emergency vehicle
                    if self.is_emergency_vehicle(vehicle_id, vehicle_type):
                        emergency_data = vehicle_data.copy()
                        emergency_data.update({
                            'emergencyType': self.get_emergency_type(vehicle_id, vehicle_type),
                            'priority': 'high',
                            'status': 'responding'
                        })
                        emergency_vehicles.append(emergency_data)
                    else:
                        vehicles.append(vehicle_data)
                        
                except Exception as e:
                    logger.warning(f"Error getting data for vehicle {vehicle_id}: {e}")
                    continue
            
            self.vehicles_data = vehicles
            self.emergency_vehicles_data = emergency_vehicles
            
        except Exception as e:
            logger.error(f"Error updating vehicles data: {e}")
    
    def update_intersections_data(self):
        """Update intersection/traffic light data from SUMO"""
        try:
            tls_ids = traci.trafficlight.getIDList()
            intersections = []
            
            for tls_id in tls_ids:
                try:
                    # Get traffic light data
                    state = traci.trafficlight.getRedYellowGreenState(tls_id)
                    phase = self.safe_int(traci.trafficlight.getPhase(tls_id))
                    next_switch = self.safe_float(traci.trafficlight.getNextSwitch(tls_id))
                    program = traci.trafficlight.getProgram(tls_id)
                    
                    # Get controlled lanes
                    controlled_lanes = traci.trafficlight.getControlledLanes(tls_id)
                    
                    # Calculate position (average of controlled junctions)
                    # This is a simplified approach
                    lat = 9.0320 + (hash(tls_id) % 1000) / 100000.0
                    lng = 38.7469 + (hash(tls_id) % 1000) / 100000.0
                    
                    intersection_data = {
                        'id': tls_id,
                        'position': {
                            'lat': lat,
                            'lng': lng
                        },
                        'trafficLights': [{
                            'phase': self.map_tls_state(state[0] if state else 'r'),
                            'direction': 'all',
                            'remainingTime': max(0.0, next_switch - self.safe_float(traci.simulation.getTime())),
                            'nextPhase': 'green' if state and state[0] == 'r' else 'red'
                        }],
                        'queueLengths': {},
                        'waitingTimes': {},
                        'congestionLevel': 'low',
                        'timestamp': time.time() * 1000
                    }
                    
                    # Get queue lengths for controlled lanes
                    for lane_id in controlled_lanes[:5]:  # Limit to first 5 lanes
                        try:
                            queue_length = traci.lane.getLastStepHaltingNumber(lane_id)
                            waiting_time = traci.lane.getWaitingTime(lane_id)
                            intersection_data['queueLengths'][lane_id] = queue_length
                            intersection_data['waitingTimes'][lane_id] = waiting_time
                        except:
                            pass
                    
                    intersections.append(intersection_data)
                    
                except Exception as e:
                    logger.warning(f"Error getting data for intersection {tls_id}: {e}")
                    continue
            
            self.intersections_data = intersections
            
        except Exception as e:
            logger.error(f"Error updating intersections data: {e}")
    
    def update_roads_data(self):
        """Update road/edge data from SUMO"""
        try:
            edge_ids = traci.edge.getIDList()
            roads = []
            
            for edge_id in edge_ids[:50]:  # Limit to first 50 edges for performance
                try:
                    # Skip internal edges
                    if edge_id.startswith(':'):
                        continue
                    
                    # Get edge data
                    vehicle_count = self.safe_int(traci.edge.getLastStepVehicleNumber(edge_id))
                    mean_speed = self.safe_float(traci.edge.getLastStepMeanSpeed(edge_id))
                    vehicle_ids = traci.edge.getLastStepVehicleIDs(edge_id)
                    
                    # Get lane data
                    lane_count = self.safe_int(traci.edge.getLaneNumber(edge_id))
                    lanes = []
                    
                    for lane_index in range(lane_count):
                        lane_id = f"{edge_id}_{lane_index}"
                        try:
                            lane_vehicle_count = self.safe_int(traci.lane.getLastStepVehicleNumber(lane_id))
                            lane_mean_speed = self.safe_float(traci.lane.getLastStepMeanSpeed(lane_id))
                            lane_length = self.safe_float(traci.lane.getLength(lane_id))
                            
                            lanes.append({
                                'id': lane_id,
                                'vehicleCount': lane_vehicle_count,
                                'averageSpeed': lane_mean_speed * 3.6,  # Convert to km/h
                                'density': lane_vehicle_count / (lane_length / 1000) if lane_length > 0 else 0,
                                'flow': lane_vehicle_count * 3600 / max(1.0, lane_mean_speed) if lane_mean_speed > 0 else 0
                            })
                        except:
                            pass
                    
                    # Calculate congestion level
                    congestion_level = 'low'
                    if mean_speed < 5.0:
                        congestion_level = 'high'
                    elif mean_speed < 15.0:
                        congestion_level = 'medium'
                    
                    # Generate simplified coordinates (you may want to get actual geometry)
                    coordinates = [
                        [9.0320 + (hash(edge_id) % 100) / 10000.0, 38.7469 + (hash(edge_id) % 100) / 10000.0],
                        [9.0320 + (hash(edge_id + "_end") % 100) / 10000.0, 38.7469 + (hash(edge_id + "_end") % 100) / 10000.0]
                    ]
                    
                    road_data = {
                        'id': edge_id,
                        'coordinates': coordinates,
                        'lanes': lanes,
                        'congestionLevel': congestion_level,
                        'incidents': [],
                        'timestamp': time.time() * 1000
                    }
                    
                    roads.append(road_data)
                    
                except Exception as e:
                    logger.warning(f"Error getting data for edge {edge_id}: {e}")
                    continue
            
            self.roads_data = roads
            
        except Exception as e:
            logger.error(f"Error updating roads data: {e}")
    
    def update_simulation_stats(self):
        """Update simulation statistics"""
        try:
            current_time = traci.simulation.getTime()
            loaded_vehicles = traci.simulation.getLoadedNumber()
            departed_vehicles = traci.simulation.getDepartedNumber()
            arrived_vehicles = traci.simulation.getArrivedNumber()
            
            self.simulation_stats = {
                'currentTime': current_time,
                'loadedVehicles': loaded_vehicles,
                'departedVehicles': departed_vehicles,
                'arrivedVehicles': arrived_vehicles,
                'activeVehicles': len(self.vehicles_data) + len(self.emergency_vehicles_data),
                'timestamp': time.time() * 1000
            }
            
        except Exception as e:
            logger.error(f"Error updating simulation stats: {e}")
    
    def map_vehicle_type(self, sumo_type):
        """Map SUMO vehicle type to frontend type"""
        type_mapping = {
            'passenger': 'car',
            'bus': 'bus',
            'truck': 'truck',
            'motorcycle': 'motorcycle',
            'bicycle': 'bicycle',
            'emergency': 'emergency'
        }
        return type_mapping.get(sumo_type, 'car')
    
    def map_tls_state(self, state):
        """Map SUMO traffic light state to frontend state"""
        state_mapping = {
            'r': 'red',
            'y': 'yellow',
            'g': 'green',
            'G': 'green'
        }
        return state_mapping.get(state, 'red')
    
    def is_emergency_vehicle(self, vehicle_id, vehicle_type):
        """Check if vehicle is an emergency vehicle"""
        emergency_keywords = ['ambulance', 'police', 'fire', 'emergency', 'rescue']
        vehicle_id_lower = vehicle_id.lower()
        vehicle_type_lower = vehicle_type.lower()
        
        return any(keyword in vehicle_id_lower or keyword in vehicle_type_lower 
                  for keyword in emergency_keywords)
    
    def get_emergency_type(self, vehicle_id, vehicle_type):
        """Get emergency vehicle type"""
        vehicle_str = (vehicle_id + vehicle_type).lower()
        
        if 'ambulance' in vehicle_str:
            return 'ambulance'
        elif 'police' in vehicle_str:
            return 'police'
        elif 'fire' in vehicle_str:
            return 'fire'
        else:
            return 'rescue'
    
    def override_traffic_light(self, intersection_id, phase, duration=30):
        """Override traffic light phase via TraCI"""
        if not self.connected:
            return False
        
        try:
            # Map phase to SUMO traffic light state
            phase_mapping = {
                'red': 'r',
                'yellow': 'y', 
                'green': 'G'
            }
            
            sumo_phase = phase_mapping.get(phase, 'G')
            
            # Set traffic light state
            current_program = traci.trafficlight.getProgram(intersection_id)
            traci.trafficlight.setRedYellowGreenState(intersection_id, sumo_phase * 4)  # Assume 4 lanes
            
            logger.info(f"Traffic light {intersection_id} overridden to {phase} for {duration}s")
            return True
            
        except Exception as e:
            logger.error(f"Failed to override traffic light {intersection_id}: {e}")
            return False
    
    def run(self):
        """Run the Flask API server"""
        logger.info(f"Starting SUMO Bridge API server on port {self.api_port}")
        self.app.run(host='0.0.0.0', port=self.api_port, debug=False, threaded=True)

def main():
    """Main function"""
    # Parse command line arguments
    sumo_host = os.getenv('SUMO_HOST', 'localhost')
    sumo_port = int(os.getenv('SUMO_PORT', '8813'))
    api_port = int(os.getenv('API_PORT', '8814'))
    
    # Create and run bridge
    bridge = SUMOBridge(sumo_host=sumo_host, sumo_port=sumo_port, api_port=api_port)
    
    try:
        bridge.run()
    except KeyboardInterrupt:
        logger.info("Shutting down SUMO Bridge...")
        bridge.disconnect_from_sumo()
    except Exception as e:
        logger.error(f"Error running SUMO Bridge: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()