# PowerShell script to run Windows platform-specific tests using Docker
# Note: Requires Windows containers enabled in Docker Desktop

param(
    [switch]$Force,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Windows Platform Tests Runner
============================

This script runs Windows-specific tests using Windows Docker containers.

REQUIREMENTS:
- Docker Desktop for Windows with Windows containers enabled
- Windows 10/11 or Windows Server 2016+
- Must be running on Windows host (Windows containers cannot run on Linux/macOS)

USAGE:
    .\run-windows-tests.ps1           # Run Windows tests
    .\run-windows-tests.ps1 -Force    # Force rebuild container
    .\run-windows-tests.ps1 -Help     # Show this help

"@
    exit 0
}

# Check if running on Windows
if ($PSVersionTable.Platform -and $PSVersionTable.Platform -ne "Win32NT") {
    Write-Error "❌ Windows containers can only run on Windows hosts"
    Write-Host "💡 Use run-linux-tests.sh for Linux/macOS testing"
    exit 1
}

# Check if Docker is available
try {
    docker --version | Out-Null
} catch {
    Write-Error "❌ Docker is not installed or not in PATH"
    exit 1
}

# Check if Windows containers are enabled
try {
    $dockerInfo = docker system info --format "{{.OSType}}" 2>$null
    if ($dockerInfo -ne "windows") {
        Write-Warning "⚠️  Docker is not in Windows container mode"
        Write-Host "💡 Switch to Windows containers in Docker Desktop settings"
        Write-Host "   Right-click Docker Desktop tray icon > 'Switch to Windows containers'"
        exit 1
    }
} catch {
    Write-Warning "⚠️  Could not determine Docker container mode"
}

Write-Host "🪟 Running Windows Platform Tests in Docker" -ForegroundColor Blue
Write-Host "=============================================="

# Create results directories
New-Item -ItemType Directory -Force -Path "TestResults\Windows" | Out-Null
New-Item -ItemType Directory -Force -Path "coverage\Windows" | Out-Null

# Build and run Windows tests
Write-Host "📦 Building Windows test container..." -ForegroundColor Yellow

$buildArgs = @("docker-compose", "-f", "docker-compose.tests.yml", "build")
if ($Force) {
    $buildArgs += "--no-cache"
}
$buildArgs += "windows-tests"

& $buildArgs[0] $buildArgs[1..$buildArgs.Length]

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to build Windows test container"
    exit 1
}

Write-Host "🧪 Running Windows-specific integration tests..." -ForegroundColor Yellow

docker-compose -f docker-compose.tests.yml run --rm windows-tests

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Windows platform tests passed!" -ForegroundColor Green
    
    # Show test results if available
    if (Test-Path "TestResults\Windows" -PathType Container) {
        $trxFiles = Get-ChildItem -Path "TestResults\Windows" -Filter "*.trx" -Recurse
        if ($trxFiles.Count -gt 0) {
            Write-Host "📊 Test Results Summary:" -ForegroundColor Blue
            foreach ($file in $trxFiles) {
                Write-Host "  📄 $($file.FullName)"
            }
        }
    }
} else {
    Write-Error "❌ Windows platform tests failed"
    exit 1
}