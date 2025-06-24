REM format-code.bat - Windows Batch Script for Code Formatting
@echo off
echo Starting code formatting...

REM Check if we're in the right directory
if not exist "backend" (
    echo Error: backend directory not found. Please run this script from the project root.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo Error: frontend directory not found. Please run this script from the project root.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Formatting Backend Python Code
echo ========================================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

cd backend

REM Install formatting tools if not present
echo Installing/updating formatting tools...
pip install black isort flake8 --quiet

REM Format with black
echo Running black formatter...
python -m black app/

REM Sort imports with isort
echo Running isort...
python -m isort app/

REM Check linting (optional - will show warnings but not fail)
echo Running flake8 linting check...
python -m flake8 app/ --max-line-length=88 --extend-ignore=E203,W503 || echo "Linting warnings found (non-blocking)"

cd ..

echo.
echo ========================================
echo   Formatting Frontend Code
echo ========================================

cd frontend

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Install prettier if not present
echo Installing prettier...
npm install --save-dev prettier --silent

REM Format with prettier
echo Running prettier formatter...
npx prettier --write src/ --config .prettierrc 2>nul || npx prettier --write src/

cd ..

echo.
echo ========================================
echo   Code Formatting Complete!
echo ========================================
echo Backend: Python code formatted with black and isort
echo Frontend: JavaScript/React code formatted with prettier
echo.
echo You can now commit your changes.
pause