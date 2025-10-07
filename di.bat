@echo off
echo Starting Diagram Interpreter Application...
echo.

REM Navigate to the script's directory to ensure paths are correct
cd /d "%~dp0"

echo "Starting Frontend Development Server (React)..."
start "Frontend" cmd /c "npm start"

echo "Starting Backend Server (Flask)..."
start "Backend" cmd /c "python backend/app.py"

echo.
echo "Both servers have been launched in separate windows."
echo "You can close this window."