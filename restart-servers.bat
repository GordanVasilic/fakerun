@echo off
echo Stopping any existing servers...

REM Kill any existing Node.js processes (frontend)
taskkill /f /im node.exe 2>nul

REM Kill any existing Python processes (backend)
taskkill /f /im python.exe 2>nul

echo Waiting 3 seconds for processes to terminate...
timeout /t 3 /nobreak >nul

echo Starting backend server...
start "Backend Server" cmd /k "cd /d %~dp0backend && python server.py"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Starting frontend server...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm start"

echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
pause >nul