REM format-code.bat - Windows Batch Script for Code Formatting
@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Code Quality Check and Formatting
echo   (Non-blocking - for reference only)
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo [WARNING] backend directory not found. Please run this script from the project root.
    echo Skipping backend formatting...
    goto FRONTEND
)

echo ========================================
echo   Formatting Backend Python Code
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Python is not installed or not in PATH
    echo Skipping backend formatting...
    goto FRONTEND
)

cd backend

REM Install formatting tools if not present
echo [1/4] Installing/updating formatting tools...
python -m pip install black isort flake8 --quiet >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Failed to install formatting tools. Attempting to use existing installations...
)

REM Format with black
echo [2/4] Running black formatter...
python -m black app/ --quiet >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Black formatter not available or failed. Skipping...
) else (
    echo [SUCCESS] Black formatting completed
)

REM Sort imports with isort
echo [3/4] Running isort...
python -m isort app/ --quiet >nul 2>&1
if errorlevel 1 (
    echo [WARNING] isort not available or failed. Skipping...
) else (
    echo [SUCCESS] Import sorting completed
)

REM Check linting (optional - will show warnings but not fail)
echo [4/4] Running flake8 linting check...
python -m flake8 app/ --max-line-length=88 --extend-ignore=E203,W503 >nul 2>&1
if errorlevel 1 (
    echo [INFO] Linting warnings found (non-blocking - safe to push)
    echo [INFO] Run 'python -m flake8 app/' in backend folder to see details
) else (
    echo [SUCCESS] No linting issues found
)

cd ..

:FRONTEND
echo.
echo ========================================
echo   Formatting Frontend Code
echo ========================================
echo.

if not exist "frontend" (
    echo [WARNING] frontend directory not found.
    echo Skipping frontend formatting...
    goto COMPLETE
)

cd frontend

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Node.js is not installed or not in PATH
    echo Skipping frontend formatting...
    cd ..
    goto COMPLETE
)

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] npm is not available
    echo Skipping frontend formatting...
    cd ..
    goto COMPLETE
)

REM Install prettier if not present
echo [1/2] Checking prettier installation...
npm list prettier >nul 2>&1
if errorlevel 1 (
    echo Installing prettier...
    npm install --save-dev --silent prettier >nul 2>&1
)

REM Format with prettier
echo [2/2] Running prettier formatter...
npx prettier --write "src/**/*.{js,jsx,json,css}" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Prettier formatting failed. Skipping...
) else (
    echo [SUCCESS] Prettier formatting completed
)

cd ..

:COMPLETE
echo.
echo ========================================
echo   Code Formatting Complete!
echo ========================================
echo.
echo [INFO] All checks are NON-BLOCKING
echo [INFO] You can commit and push your changes regardless of warnings
echo.
echo Next steps:
echo   1. Review any warnings above (optional)
echo   2. git add .
echo   3. git commit -m "your message"
echo   4. git push
echo.
pause