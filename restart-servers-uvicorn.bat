@echo off
echo Stopping any existing servers...

REM Kill any existing processes
taskkill /f /im node.exe 2>nul
taskkill /f /im python.exe 2>nul

echo Waiting 3 seconds for processes to terminate...
timeout /t 3 /nobreak >nul

echo Starting backend server with uvicorn...
start "Backend Server" cmd /k "cd /d %~dp0backend && uvicorn server:app --reload --host 0.0.0.0 --port 8000"

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


## What it does:

1. **Stops** any existing Node.js and Python processes
2. **Waits** 3 seconds for processes to terminate
3. **Starts the backend** in a new command window
4. **Waits** 5 seconds for backend to initialize
5. **Starts the frontend** in another new command window
6. **Shows** the URLs where servers are running

## Alternative version (if you prefer uvicorn for backend):
```batch
@echo off
echo Stopping any existing servers...

REM Kill any existing processes
taskkill /f /im node.exe 2>nul
taskkill /f /im python.exe 2>nul

echo Waiting 3 seconds for processes to terminate...
timeout /t 3 /nobreak >nul

echo Starting backend server with uvicorn...
start "Backend Server" cmd /k "cd /d %~dp0backend && uvicorn server:app --reload --host 0.0.0.0 --port 8000"

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