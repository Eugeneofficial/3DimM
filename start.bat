@echo off
title 3DimM Launcher
setlocal

echo ========================================
echo   3DimM - m3u8 Video Downloader
echo ========================================
echo.

if "%1"=="--kill" goto kill
if "%1"=="--web" goto web

echo Starting Electron app...
cd /d "%~dp0"
npx electron .
goto end

:web
echo [1/2] Starting server...
cd /d "%~dp0server"
start "3DimM-Server" node index.js

timeout /t 2 /nobreak >nul

echo [2/2] Starting client (Vite)...
cd /d "%~dp0client"
start "3DimM-Client" npx vite --host

echo.
echo ========================================
echo   Ready! Open http://localhost:5173
echo   To stop: close the Server and Client
echo   windows, or run: start.bat --kill
echo ========================================
echo.

echo Press any key to stop server and client...
pause >nul

:kill
echo Stopping processes...
taskkill /FI "WINDOWTITLE eq 3DimM-Server*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq 3DimM-Client*" /T /F >nul 2>&1
goto end

:end
endlocal
