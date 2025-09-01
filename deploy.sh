#!/bin/bash

# SUMO Traffic Management Dashboard - Deployment Script
# This script handles deployment for different environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
BUILD_MODE="fresh"
ENABLE_MONITORING=false
ENABLE_SUMO=false
ENABLE_REDIS=false

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}SUMO Traffic Dashboard Deployment${NC}"
    echo -e "${BLUE}================================${NC}"
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

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -e, --environment ENV    Deployment environment (development|production) [default: production]"
    echo "  -b, --build MODE         Build mode (fresh|rebuild|no-cache) [default: fresh]"
    echo "  -m, --monitoring         Enable monitoring stack (Prometheus + Grafana)"
    echo "  -s, --sumo              Enable SUMO simulation service"
    echo "  -r, --redis              Enable Redis cache service"
    echo "  -h, --help               Show this help message"
    echo
    echo "Examples:"
    echo "  $0                                      # Basic production deployment"
    echo "  $0 -e development -m                   # Development with monitoring"
    echo "  $0 -e production -m -s -r              # Full production stack"
    echo "  $0 --build no-cache                    # Force rebuild without cache"
}

check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

setup_environment() {
    print_info "Setting up environment for $ENVIRONMENT..."
    
    # Copy appropriate environment file
    if [ "$ENVIRONMENT" = "production" ]; then
        if [ -f ".env.production" ]; then
            cp .env.production .env
            print_success "Production environment file copied"
        else
            print_warning "No .env.production file found. Using defaults."
        fi
    elif [ "$ENVIRONMENT" = "development" ]; then
        if [ -f ".env.development" ]; then
            cp .env.development .env
            print_success "Development environment file copied"
        else
            print_warning "No .env.development file found. Creating basic development config."
            cat > .env << EOF
# Development Environment
FRONTEND_PORT=8080
BACKEND_PORT=3001
PYTHON_BRIDGE_PORT=8814
SUMO_PORT=8813
FRONTEND_API_BASE_URL=http://localhost:3001/api
FRONTEND_WEBSOCKET_URL=ws://localhost:3001/ws
ENABLE_DEBUG_LOGGING=true
MOCK_DATA_MODE=true
LOG_LEVEL=debug
EOF
        fi
    fi
}

build_services() {
    print_info "Building services..."
    
    local build_args=""
    if [ "$BUILD_MODE" = "no-cache" ]; then
        build_args="--no-cache"
    elif [ "$BUILD_MODE" = "rebuild" ]; then
        build_args="--force-recreate"
    fi
    
    # Build profiles
    local profiles=""
    if [ "$ENABLE_MONITORING" = true ]; then
        profiles="$profiles,monitoring"
    fi
    if [ "$ENABLE_SUMO" = true ]; then
        profiles="$profiles,with-sumo"
    fi
    if [ "$ENABLE_REDIS" = true ]; then
        profiles="$profiles,with-redis"
    fi
    
    # Remove leading comma
    profiles=${profiles#,}
    
    if [ -n "$profiles" ]; then
        export COMPOSE_PROFILES=$profiles
        print_info "Using profiles: $profiles"
    fi
    
    docker-compose build $build_args
    print_success "Services built successfully"
}

deploy_services() {
    print_info "Deploying services..."
    
    # Stop existing services
    docker-compose down --remove-orphans
    
    # Start services
    docker-compose up -d
    
    print_success "Services deployed successfully"
}

verify_deployment() {
    print_info "Verifying deployment..."
    
    # Wait for services to start
    sleep 10
    
    # Check frontend
    if curl -f http://localhost:${FRONTEND_PORT:-80}/health > /dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_warning "Frontend health check failed"
    fi
    
    # Check backend
    if curl -f http://localhost:${BACKEND_PORT:-3001}/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed"
    fi
    
    # Check Python bridge
    if curl -f http://localhost:${PYTHON_BRIDGE_PORT:-8814}/health > /dev/null 2>&1; then
        print_success "Python bridge is healthy"
    else
        print_warning "Python bridge health check failed"
    fi
    
    print_info "Deployment verification completed"
}

show_access_info() {
    echo
    print_header
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo
    echo "Access your application:"
    echo "  • Frontend:      http://localhost:${FRONTEND_PORT:-80}"
    echo "  • Backend API:   http://localhost:${BACKEND_PORT:-3001}"
    echo "  • Python Bridge: http://localhost:${PYTHON_BRIDGE_PORT:-8814}"
    echo
    
    if [ "$ENABLE_MONITORING" = true ]; then
        echo "Monitoring services:"
        echo "  • Prometheus:    http://localhost:${PROMETHEUS_PORT:-9090}"
        echo "  • Grafana:       http://localhost:${GRAFANA_PORT:-3000} (admin/admin)"
        echo
    fi
    
    if [ "$ENABLE_SUMO" = true ]; then
        echo "SUMO simulation:"
        echo "  • TraCI Port:    ${SUMO_PORT:-8813}"
        echo
    fi
    
    echo "Useful commands:"
    echo "  • View logs:     docker-compose logs -f"
    echo "  • Stop services: docker-compose down"
    echo "  • Restart:       docker-compose restart"
    echo "  • Update:        $0 --build rebuild"
    echo
}

cleanup_on_error() {
    print_error "Deployment failed! Cleaning up..."
    docker-compose down --remove-orphans
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--build)
            BUILD_MODE="$2"
            shift 2
            ;;
        -m|--monitoring)
            ENABLE_MONITORING=true
            shift
            ;;
        -s|--sumo)
            ENABLE_SUMO=true
            shift
            ;;
        -r|--redis)
            ENABLE_REDIS=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [ "$ENVIRONMENT" != "development" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'development' or 'production'"
    exit 1
fi

# Set up error handling
trap cleanup_on_error ERR

# Main deployment flow
print_header

check_dependencies
setup_environment
build_services
deploy_services
verify_deployment
show_access_info

print_success "Deployment script completed!"
