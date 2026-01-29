# format-code.ps1 - PowerShell Script for Code Formatting
# All checks are NON-BLOCKING - you can commit and push regardless of warnings

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Code Quality Check and Formatting" -ForegroundColor Cyan
Write-Host "  (Non-blocking - for reference only)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$hasErrors = $false
$backendSuccess = $false
$frontendSuccess = $false

# Backend Formatting
if (Test-Path "backend") {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Formatting Backend Python Code" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # Check Python
    $pythonCheck = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCheck) {
        Write-Host "[WARNING] Python is not installed or not in PATH" -ForegroundColor Yellow
        Write-Host "Skipping backend formatting..." -ForegroundColor Yellow
    }
    else {
        Push-Location backend

        # Install tools
        Write-Host "[1/4] Installing/updating formatting tools..." -ForegroundColor Gray
        $null = python -m pip install black isort flake8 --quiet 2>&1

        # Black
        Write-Host "[2/4] Running black formatter..." -ForegroundColor Gray
        $blackResult = python -m black app/ --quiet 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Black formatting completed" -ForegroundColor Green
        }
        else {
            Write-Host "[WARNING] Black formatter not available or failed" -ForegroundColor Yellow
        }

        # isort
        Write-Host "[3/4] Running isort..." -ForegroundColor Gray
        $isortResult = python -m isort app/ --quiet 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Import sorting completed" -ForegroundColor Green
        }
        else {
            Write-Host "[WARNING] isort not available or failed" -ForegroundColor Yellow
        }

        # flake8
        Write-Host "[4/4] Running flake8 linting check..." -ForegroundColor Gray
        $flake8Result = python -m flake8 app/ --max-line-length=88 --extend-ignore=E203,W503 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] No linting issues found" -ForegroundColor Green
        }
        else {
            Write-Host "[INFO] Linting warnings found (non-blocking - safe to push)" -ForegroundColor Yellow
            Write-Host "[INFO] Run 'python -m flake8 app/' in backend folder to see details" -ForegroundColor Yellow
        }

        Pop-Location
        $backendSuccess = $true
    }
}
else {
    Write-Host "[WARNING] backend directory not found" -ForegroundColor Yellow
    Write-Host "Skipping backend formatting..." -ForegroundColor Yellow
}

# Frontend Formatting
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Formatting Frontend Code" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "frontend") {
    # Check Node.js
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCheck) {
        Write-Host "[WARNING] Node.js is not installed or not in PATH" -ForegroundColor Yellow
        Write-Host "Skipping frontend formatting..." -ForegroundColor Yellow
    }
    else {
        Push-Location frontend

        # Install prettier
        Write-Host "[1/2] Checking prettier installation..." -ForegroundColor Gray
        $prettierCheck = npm list prettier 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Installing prettier..." -ForegroundColor Gray
            $null = npm install --save-dev --silent prettier 2>&1
        }

        # Format
        Write-Host "[2/2] Running prettier formatter..." -ForegroundColor Gray
        $prettierResult = npx prettier --write "src/**/*.{js,jsx,json,css}" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Prettier formatting completed" -ForegroundColor Green
            $frontendSuccess = $true
        }
        else {
            Write-Host "[WARNING] Prettier formatting failed" -ForegroundColor Yellow
        }

        Pop-Location
    }
}
else {
    Write-Host "[WARNING] frontend directory not found" -ForegroundColor Yellow
    Write-Host "Skipping frontend formatting..." -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Code Formatting Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] All checks are NON-BLOCKING" -ForegroundColor Cyan
Write-Host "[INFO] You can commit and push your changes regardless of warnings" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Review any warnings above (optional)" -ForegroundColor Gray
Write-Host "  2. git add ." -ForegroundColor Gray
Write-Host "  3. git commit -m `"your message`"" -ForegroundColor Gray
Write-Host "  4. git push" -ForegroundColor Gray
Write-Host ""
