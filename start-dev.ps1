# SUMO Traffic Management Dashboard - Development Startup Script for Windows
# This script starts all services required for development

Write-Host "========================================" -ForegroundColor Blue
Write-Host "SUMO Traffic Dashboard - Starting..." -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue

# Function to show info messages
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Blue
}

# Function to show success messages
function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

# Function to show warning messages
function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

# Function to show error messages
function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Function to cleanup background jobs on exit
function Cleanup {
    Write-Info "Shutting down services..."
    Get-Job | Stop-Job
    Get-Job | Remove-Job -Force
    Write-Success "All services stopped."
    exit 0
}

# Set up signal handlers
trap { Cleanup } INT

Write-Info "Starting SUMO Traffic Dashboard in development mode..."

try {
    # Start backend server
    Write-Info "Starting backend server..."
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD\backend
        npm run dev 2>&1
    } -Name "Backend"
    
    # Wait a moment for backend to initialize
    Start-Sleep -Seconds 3
    Write-Success "Backend server started (Job ID: $($backendJob.Id))"
    
    # Start Python bridge
    Write-Info "Starting Python bridge..."
    $pythonJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD\backend\python-bridge
        python sumo_bridge.py 2>&1
    } -Name "PythonBridge"
    
    # Wait a moment for Python bridge to initialize
    Start-Sleep -Seconds 2
    Write-Success "Python bridge started (Job ID: $($pythonJob.Id))"
    
    # Start frontend development server
    Write-Info "Starting frontend development server..."
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run dev 2>&1
    } -Name "Frontend"
    
    Start-Sleep -Seconds 2
    Write-Success "Frontend server started (Job ID: $($frontendJob.Id))"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Success "All services started successfully!"
    Write-Host ""
    Write-Host "Access your application:" -ForegroundColor White
    Write-Host "  • Frontend:      http://localhost:8080" -ForegroundColor Cyan
    Write-Host "  • Backend API:   http://localhost:3001" -ForegroundColor Cyan
    Write-Host "  • Python Bridge: http://localhost:8814" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Useful commands:" -ForegroundColor White
    Write-Host "  • View logs:     Get-Job | Receive-Job" -ForegroundColor Gray
    Write-Host "  • Stop services: Ctrl+C" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Blue
    
    # Keep the script running and show job status
    while ($true) {
        Start-Sleep -Seconds 30
        
        # Check job status
        $jobs = Get-Job
        $runningJobs = $jobs | Where-Object { $_.State -eq "Running" }
        $failedJobs = $jobs | Where-Object { $_.State -eq "Failed" }
        
        if ($failedJobs.Count -gt 0) {
            Write-Warning "Some services have failed:"
            foreach ($job in $failedJobs) {
                Write-Error "  $($job.Name) has failed"
                Write-Host "  Error details:" -ForegroundColor Red
                $job | Receive-Job | Write-Host -ForegroundColor Red
            }
        }
        
        if ($runningJobs.Count -eq 0) {
            Write-Warning "All services have stopped."
            break
        }
    }
    
} catch {
    Write-Error "Failed to start services: $_"
    Cleanup
    exit 1
}
