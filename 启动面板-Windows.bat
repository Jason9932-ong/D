@echo off
chcp 65001 >nul
title Volatility Panel
cd /d "%~dp0"

echo.
echo   Volatility Panel
echo   ----------------
echo.

REM First run (or a fresh clone) has no dependencies installed yet.
if not exist "node_modules" (
  echo   First run - installing dependencies, this takes about 15 seconds...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   Install failed. Is Node.js installed?  https://nodejs.org
    echo.
    pause
    exit /b 1
  )
)

REM Open the browser once the dev server has had time to come up.
start "" cmd /c "timeout /t 5 >nul && start http://localhost:5173/"

echo   Starting... the browser will open automatically.
echo   Keep this window OPEN while you use the panel.
echo   Press Ctrl+C or close this window to stop.
echo.

call npm run dev

REM Only reached if the server exits or fails to start.
echo.
echo   Server stopped.
pause
