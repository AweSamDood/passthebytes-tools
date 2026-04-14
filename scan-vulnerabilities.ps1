#!/usr/bin/env pwsh
# Trivy vulnerability scanner script for passthebytes-tools
# Uses Docker by default (no installation required)

param(
    [switch]$SkipBuild,
    [switch]$HtmlReport,
    [switch]$JsonReport,
    [switch]$UseLocal,
    [string]$Severity = "CRITICAL,HIGH"
)

$ImageName = "passthebytes-tools-backend:latest"
$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Trivy Vulnerability Scanner" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Determine which Trivy to use
$useDocker = $true
$trivyCommand = ""

if ($UseLocal) {
    # User explicitly requested local Trivy
    $localTrivy = Get-Command trivy -ErrorAction SilentlyContinue
    if ($localTrivy) {
        $useDocker = $false
        $trivyCommand = "trivy"
        Write-Host "Using locally installed Trivy" -ForegroundColor Cyan
    } else {
        Write-Host "WARNING: -UseLocal specified but Trivy not found locally" -ForegroundColor Yellow
        Write-Host "Falling back to Docker mode..." -ForegroundColor Yellow
        $useDocker = $true
    }
}

if ($useDocker) {
    # Check if Docker is available
    try {
        docker ps | Out-Null
        Write-Host "Using Trivy via Docker (no installation required)" -ForegroundColor Cyan

        # Pull latest Trivy image
        Write-Host "Pulling latest Trivy image..." -ForegroundColor Gray
        docker pull aquasec/trivy:latest 2>&1 | Out-Null

        $trivyCommand = "docker run --rm -v //var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest"
    } catch {
        Write-Host ""
        Write-Host "ERROR: Docker is not available!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Yellow
        Write-Host "  1. Start Docker Desktop" -ForegroundColor White
        Write-Host "  2. Install Trivy locally and use -UseLocal flag" -ForegroundColor White
        Write-Host "     - Chocolatey: choco install trivy" -ForegroundColor Gray
        Write-Host "     - Scoop: scoop install trivy" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
}

Write-Host ""
if (-not $SkipBuild) {
    Write-Host "[1/3] Building Docker image (no cache)..." -ForegroundColor Cyan
    docker-compose build --no-cache backend
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Build completed" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[1/3] Skipping build (using existing image)" -ForegroundColor Yellow
    Write-Host ""
}

# Scan for vulnerabilities
Write-Host "[2/3] Scanning for vulnerabilities..." -ForegroundColor Cyan
Write-Host "Severity filter: $Severity" -ForegroundColor Gray
Write-Host ""

if ($useDocker) {
    Invoke-Expression "$trivyCommand image --severity $Severity $ImageName"
} else {
    & trivy image --severity $Severity $ImageName
}

# Check specific CVEs
Write-Host ""
Write-Host "[3/3] Checking for specific CVEs..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking CVE-2025-15467 (OpenSSL RCE/DoS):" -ForegroundColor Yellow
if ($useDocker) {
    $cve1 = Invoke-Expression "$trivyCommand image $ImageName 2>&1" | Select-String "CVE-2025-15467"
} else {
    $cve1 = trivy image $ImageName 2>&1 | Select-String "CVE-2025-15467"
}
if ($cve1) {
    Write-Host "  [X] FOUND - Action Required!" -ForegroundColor Red
    $cve1
} else {
    Write-Host "  [OK] NOT FOUND - Fixed or not applicable" -ForegroundColor Green
}

Write-Host ""
Write-Host "Checking CVE-2025-13836 (Python 3.13 DoS):" -ForegroundColor Yellow
if ($useDocker) {
    $cve2 = Invoke-Expression "$trivyCommand image $ImageName 2>&1" | Select-String "CVE-2025-13836"
} else {
    $cve2 = trivy image $ImageName 2>&1 | Select-String "CVE-2025-13836"
}
if ($cve2) {
    Write-Host "  [X] FOUND - Action Required!" -ForegroundColor Red
    $cve2
    Write-Host ""
    Write-Host "  Note: This affects Python 3.13. You're using Python 3.11." -ForegroundColor Cyan
    Write-Host "  Check if python3.13-minimal is a dependency:" -ForegroundColor Cyan
    Write-Host "    docker run --rm $ImageName dpkg -l | grep python3.13" -ForegroundColor Gray
} else {
    Write-Host "  [OK] NOT FOUND - Fixed or not applicable" -ForegroundColor Green
}

# Generate HTML report if requested
if ($HtmlReport) {
    Write-Host ""
    Write-Host "[4/4] Generating HTML report..." -ForegroundColor Cyan
    $reportPath = "trivy-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').html"

    if ($useDocker) {
        # For Docker mode, we need to mount the current directory
        $currentDir = (Get-Location).Path.Replace('\', '/').Replace(':', '')
        docker run --rm `
            -v //var/run/docker.sock:/var/run/docker.sock `
            -v "/${currentDir}:/output" `
            aquasec/trivy:latest `
            image --format template --template "@contrib/html.tpl" -o "/output/$reportPath" $ImageName
    } else {
        & trivy image --format template --template "@contrib/html.tpl" -o $reportPath $ImageName
    }
    Write-Host "[OK] HTML report saved to: $reportPath" -ForegroundColor Green
}

# Generate JSON report if requested
if ($JsonReport) {
    Write-Host ""
    Write-Host "[4/4] Generating JSON report..." -ForegroundColor Cyan
    $jsonPath = "trivy-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"

    if ($useDocker) {
        # For Docker mode, we need to mount the current directory
        $currentDir = (Get-Location).Path.Replace('\', '/').Replace(':', '')
        docker run --rm `
            -v //var/run/docker.sock:/var/run/docker.sock `
            -v "/${currentDir}:/output" `
            aquasec/trivy:latest `
            image --format json -o "/output/$jsonPath" $ImageName
    } else {
        & trivy image --format json -o $jsonPath $ImageName
    }
    Write-Host "[OK] JSON report saved to: $jsonPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Scan Complete!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usage examples:" -ForegroundColor Gray
Write-Host '  .\scan-vulnerabilities.ps1                    # Full scan with rebuild (Docker mode)' -ForegroundColor White
Write-Host '  .\scan-vulnerabilities.ps1 -SkipBuild         # Scan existing image' -ForegroundColor White
Write-Host '  .\scan-vulnerabilities.ps1 -HtmlReport        # Generate HTML report' -ForegroundColor White
Write-Host '  .\scan-vulnerabilities.ps1 -JsonReport        # Generate JSON report' -ForegroundColor White
Write-Host '  .\scan-vulnerabilities.ps1 -Severity CRITICAL # Only critical vulns' -ForegroundColor White
Write-Host '  .\scan-vulnerabilities.ps1 -UseLocal          # Use locally installed Trivy' -ForegroundColor White
Write-Host ""
