@echo off
title QR Cafe Launcher
echo ==========================================
echo    ☕ STARTING QR CAFE SERVERS
echo ==========================================
echo.
echo 1. Stopping any old processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo 2. Starting Backend API (Port 5000)...
start "QR Cafe Backend" cmd /k "cd backend && npm run dev"

echo.
echo 3. Starting Frontend App (Port 3000)...
start "QR Cafe Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo    ✅ SERVERS STARTED!
echo ==========================================
echo.
echo Backend URL: http://192.168.1.200:5000
echo Frontend URL: http://192.168.1.200:3000
echo.
echo Please wait about 10-15 seconds for them to boot up.
echo Then refresh your browser!
echo.
pause
