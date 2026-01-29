@echo off
REM view-lint-details.bat - Show detailed linting results

echo.
echo ========================================
echo   Detailed Code Quality Report
echo ========================================
echo.

if not exist "backend" (
    echo Error: backend directory not found.
    pause
    exit /b 1
)

cd backend

echo Checking if Python is available...
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Flake8 Linting Details
echo ========================================
echo.
python -m flake8 app/ --max-line-length=88 --extend-ignore=E203,W503 --statistics

echo.
echo ========================================
echo   Black Formatting Check
echo ========================================
echo.
python -m black --check app/ --verbose

echo.
echo ========================================
echo   Import Sorting Check
echo ========================================
echo.
python -m isort --check-only app/ --verbose

cd ..

echo.
echo ========================================
echo   Report Complete
echo ========================================
echo.
echo Note: These are just suggestions to improve code quality.
echo You can commit and push regardless of these results.
echo.
pause
