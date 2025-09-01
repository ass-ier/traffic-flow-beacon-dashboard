#!/bin/bash

# SUMO Traffic Management Dashboard - Development Setup Script
# This script sets up the development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# System detection
OS=$(uname -s)
ARCH=$(uname -m)

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}SUMO Traffic Dashboard - Dev Setup${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_warning "$1 is not installed"
        return 1
    fi
}

install_node() {
    print_info "Installing Node.js..."
    
    if [[ "$OS" == "Darwin" ]]; then
        if command -v brew &> /dev/null; then
            brew install node
        else
            print_error "Homebrew not found. Please install Node.js manually from https://nodejs.org/"
            return 1
        fi
    elif [[ "$OS" == "Linux" ]]; then
        # Use NodeSource repository for latest Node.js
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        print_error "Unsupported OS. Please install Node.js manually from https://nodejs.org/"
        return 1
    fi
}

install_python_deps() {
    print_info "Installing Python dependencies..."
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not installed"
        return 1
    fi
    
    # Install pip if not available
    if ! command -v pip3 &> /dev/null; then
        if [[ "$OS" == "Darwin" ]]; then
            curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
            python3 get-pip.py
            rm get-pip.py
        elif [[ "$OS" == "Linux" ]]; then
            sudo apt-get update
            sudo apt-get install -y python3-pip
        fi
    fi
    
    # Install Python bridge dependencies
    cd backend/python-bridge
    pip3 install -r requirements.txt
    cd ../..
}

install_sumo() {
    print_info "Installing SUMO..."
    
    if [[ "$OS" == "Darwin" ]]; then
        if command -v brew &> /dev/null; then
            brew tap dlr-ts/sumo
            brew install sumo
        else
            print_warning "Homebrew not found. Please install SUMO manually from https://sumo.dlr.de/"
        fi
    elif [[ "$OS" == "Linux" ]]; then
        # Add SUMO repository
        sudo add-apt-repository ppa:sumo/stable -y
        sudo apt-get update
        sudo apt-get install -y sumo sumo-tools sumo-doc
        
        # Set SUMO_HOME environment variable
        echo 'export SUMO_HOME="/usr/share/sumo"' >> ~/.bashrc
        export SUMO_HOME="/usr/share/sumo"
    else
        print_warning "Please install SUMO manually from https://sumo.dlr.de/"
    fi
}

setup_environment_files() {
    print_info "Setting up environment files..."
    
    # Frontend environment
    if [ ! -f ".env.local" ]; then
        cp .env.example .env.local
        print_success "Created .env.local for frontend"
    fi
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        print_success "Created backend/.env"
    fi
    
    # Development environment for Docker
    if [ ! -f ".env.development" ]; then
        cat > .env.development << EOF
# Development Environment
FRONTEND_PORT=8080
BACKEND_PORT=3001
PYTHON_BRIDGE_PORT=8814
SUMO_PORT=8813
FRONTEND_API_BASE_URL=http://localhost:3001/api
FRONTEND_WEBSOCKET_URL=ws://localhost:3001/ws
MAP_DEFAULT_ZOOM=13
MAP_DEFAULT_LAT=9.0331
MAP_DEFAULT_LNG=38.7500
ENABLE_DEBUG_LOGGING=true
MOCK_DATA_MODE=false
ENABLE_EMERGENCY_VEHICLES=true
ENABLE_TRAFFIC_LIGHT_CONTROL=true
ENABLE_ANALYTICS=true
LOG_LEVEL=debug
CORS_ORIGINS=http://localhost:8080,http://localhost:5173
EOF
        print_success "Created .env.development"
    fi
}

install_dependencies() {
    print_info "Installing project dependencies..."
    
    # Frontend dependencies
    print_info "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed"
    
    # Backend dependencies
    print_info "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
    
    # Python dependencies
    install_python_deps
    print_success "Python dependencies installed"
}

setup_git_hooks() {
    print_info "Setting up Git hooks..."
    
    if [ -d ".git" ]; then
        # Pre-commit hook for linting
        cat > .git/hooks/pre-commit << EOF
#!/bin/bash
# Pre-commit hook for linting

echo "Running pre-commit checks..."

# Check frontend
echo "Linting frontend..."
npm run lint
if [ \$? -ne 0 ]; then
    echo "Frontend linting failed"
    exit 1
fi

# Check backend
echo "Linting backend..."
cd backend && npm run lint
if [ \$? -ne 0 ]; then
    echo "Backend linting failed"
    exit 1
fi

echo "All checks passed!"
EOF
        chmod +x .git/hooks/pre-commit
        print_success "Git hooks set up"
    else
        print_warning "Not a Git repository, skipping Git hooks setup"
    fi
}

create_development_scripts() {
    print_info "Creating development scripts..."
    
    # Create start script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
# Development startup script

print_info() {
    echo -e "\033[0;34mℹ $1\033[0m"
}

print_success() {
    echo -e "\033[0;32m✓ $1\033[0m"
}

print_info "Starting SUMO Traffic Dashboard in development mode..."

# Function to kill background processes
cleanup() {
    print_info "Shutting down services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
print_info "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start Python bridge
print_info "Starting Python bridge..."
cd backend/python-bridge
python sumo_bridge.py &
PYTHON_PID=$!
cd ../..

# Wait for Python bridge to start
sleep 2

# Start frontend
print_info "Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

print_success "All services started!"
echo
echo "Access your application:"
echo "  • Frontend:      http://localhost:8080"
echo "  • Backend API:   http://localhost:3001"
echo "  • Python Bridge: http://localhost:8814"
echo
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait
EOF
    
    chmod +x start-dev.sh
    print_success "Development start script created"
    
    # Create test script
    cat > test-all.sh << 'EOF'
#!/bin/bash
# Run all tests

echo "Running all tests..."

echo "Frontend tests..."
npm test

echo "Backend tests..."
cd backend && npm test
cd ..

echo "Python bridge tests..."
cd backend/python-bridge
python -m pytest . || echo "No Python tests found"
cd ../..

echo "All tests completed!"
EOF
    
    chmod +x test-all.sh
    print_success "Test script created"
}

verify_installation() {
    print_info "Verifying installation..."
    
    local errors=0
    
    # Check Node.js
    if ! check_command node; then
        ((errors++))
    fi
    
    # Check npm
    if ! check_command npm; then
        ((errors++))
    fi
    
    # Check Python
    if ! check_command python3; then
        ((errors++))
    fi
    
    # Check pip
    if ! check_command pip3; then
        ((errors++))
    fi
    
    # Check SUMO (optional)
    if ! check_command sumo; then
        print_warning "SUMO is not installed or not in PATH"
        print_info "You can still develop with mock data mode"
    fi
    
    if [ $errors -eq 0 ]; then
        print_success "All required dependencies are installed"
        return 0
    else
        print_error "$errors dependencies are missing"
        return 1
    fi
}

show_next_steps() {
    echo
    print_header
    echo -e "${GREEN}Development environment setup completed!${NC}"
    echo
    echo "Next steps:"
    echo "  1. Start the development servers:"
    echo "     ${BLUE}./start-dev.sh${NC}"
    echo
    echo "  2. Or start services individually:"
    echo "     ${BLUE}cd backend && npm run dev${NC}          # Backend server"
    echo "     ${BLUE}cd backend/python-bridge && python sumo_bridge.py${NC}  # Python bridge"
    echo "     ${BLUE}npm run dev${NC}                       # Frontend server"
    echo
    echo "  3. Run tests:"
    echo "     ${BLUE}./test-all.sh${NC}                     # All tests"
    echo "     ${BLUE}npm test${NC}                          # Frontend tests only"
    echo
    echo "  4. With SUMO simulation:"
    echo "     ${BLUE}cd AddisAbabaSumo${NC}"
    echo "     ${BLUE}sumo-gui -c AddisAbaba.sumocfg --remote-port 8813${NC}"
    echo
    echo "  5. Access the application:"
    echo "     • Frontend:      http://localhost:8080"
    echo "     • Backend API:   http://localhost:3001"
    echo "     • Python Bridge: http://localhost:8814"
    echo
    echo "For production deployment, use: ${BLUE}./deploy.sh${NC}"
    echo
}

# Main setup flow
main() {
    print_header
    
    print_info "Starting development environment setup..."
    echo "OS: $OS $ARCH"
    echo
    
    # Check if Node.js is installed, install if not
    if ! check_command node; then
        install_node || exit 1
    fi
    
    # Set up environment files
    setup_environment_files
    
    # Install project dependencies
    install_dependencies
    
    # Install SUMO (optional)
    if ! check_command sumo; then
        read -p "Install SUMO simulation software? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_sumo
        fi
    fi
    
    # Set up Git hooks
    setup_git_hooks
    
    # Create development scripts
    create_development_scripts
    
    # Verify installation
    if verify_installation; then
        show_next_steps
        print_success "Setup completed successfully!"
    else
        print_error "Setup completed with some issues. Please check the warnings above."
        exit 1
    fi
}

# Run main function
main "$@"
