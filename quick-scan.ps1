#!/usr/bin/env pwsh
# Quick Trivy scanner using Docker (no installation required)

$ErrorActionPreference = "Stop"
$ImageName = "passthebytes-tools-backend:latest"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Quick Trivy Scanner (Docker Mode)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
Write-Host "Checking Docker availability..." -ForegroundColor Cyan
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "ERROR: Docker is not running or not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "[1/3] Building Docker image (no cache)..." -ForegroundColor Cyan
docker-compose build --no-cache backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Build completed" -ForegroundColor Green

Write-Host ""
Write-Host "[2/3] Pulling Trivy Docker image..." -ForegroundColor Cyan
docker pull aquasec/trivy:latest | Out-Null
Write-Host "[OK] Trivy image ready" -ForegroundColor Green

Write-Host ""
Write-Host "[3/3] Scanning for vulnerabilities..." -ForegroundColor Cyan
Write-Host "Using Trivy via Docker (no local installation needed)" -ForegroundColor Gray
Write-Host ""

# Run Trivy through Docker
docker run --rm `
    -v //var/run/docker.sock:/var/run/docker.sock `
    aquasec/trivy:latest `
    image --severity CRITICAL,HIGH $ImageName

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Scan Complete!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host 'For more options, use: .\scan-vulnerabilities.ps1' -ForegroundColor Gray
Write-Host ""
