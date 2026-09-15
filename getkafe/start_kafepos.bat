@echo off
title KafePOS - Avtomatlashtirish Tizimi
cd /d "%~dp0"
echo ===================================================
echo     KafePOS Tizimi Ishga Tushirilmoqda...
echo ===================================================
echo.
echo 1. Server ishga tushirilmoqda...
start /b node server/index.js
timeout /t 2 >nul

echo 2. Kassa Desktop oynasi ochilmoqda...
start msedge --app=http://localhost:4000 --window-size=1280,850 2>nul || start http://localhost:4000
echo.
echo Tizim faol! Alohida Desktop ilova sifatida ochildi.
echo Ichki Wi-Fi tarmog'idagi boshqa qurilmalar (ofitsiantlar) uchun:
echo Port: 4000
echo.
