@echo off
title GetPOS Kafe - Windows O'rnatish Ustasi (Setup Wizard)
color 1F

:: Administrator huquqlarini tekshirish
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [OGOHLANTIRISH] O'rnatish uchun Administrator huquqi talab qilinadi.
    echo Administrator nomidan ishga tushirilmoqda...
    powershell -Command "Start-Process '%~0' -Verb RunAs"
    exit /b
)

set INSTALL_DIR=C:\KafePOS
set SOURCE_DIR=%~dp0

cls
echo ===================================================================
echo             GetPOS Kafe - Avtomatlashtirish Tizimi
echo                Windows O'rnatish Paketi (Setup)
echo ===================================================================
echo.
echo Arxitektura aniqlanmoqda...
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    echo [OK] Tizim: 64-bit Windows (x64)
    set ARCH=x64
) else (
    echo [OK] Tizim: 32-bit Windows (x86)
    set ARCH=x86
)
echo O'rnatish manzili: %INSTALL_DIR%
echo.
echo O'rnatish boshlanmoqda...
echo.

:: 1. Papkani yaratish
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\launcher" mkdir "%INSTALL_DIR%\launcher"
if not exist "%INSTALL_DIR%\server" mkdir "%INSTALL_DIR%\server"
if not exist "%INSTALL_DIR%\client\dist" mkdir "%INSTALL_DIR%\client\dist"

:: 2. Fayllarni nusxalash
echo [1/5] Dastur fayllari va arxivlar nusxalanmoqda...
copy /y "%SOURCE_DIR%\KafePOS.exe" "%INSTALL_DIR%\" >nul
copy /y "%SOURCE_DIR%\GetPOS.exe" "%INSTALL_DIR%\" >nul
copy /y "%SOURCE_DIR%\PrintHelper.exe" "%INSTALL_DIR%\" >nul
copy /y "%SOURCE_DIR%\package.json" "%INSTALL_DIR%\" >nul

xcopy /y /e /i /q "%SOURCE_DIR%\launcher\*" "%INSTALL_DIR%\launcher" >nul
xcopy /y /e /i /q "%SOURCE_DIR%\server\*" "%INSTALL_DIR%\server" >nul
xcopy /y /e /i /q "%SOURCE_DIR%\client\dist\*" "%INSTALL_DIR%\client\dist" >nul

:: Agar node_modules mavjud bo'lsa
if exist "%SOURCE_DIR%\node_modules" (
    echo [2/5] Server kutubxonalari nusxalanmoqda...
    xcopy /y /e /i /q "%SOURCE_DIR%\node_modules\*" "%INSTALL_DIR%\node_modules" >nul
)

:: 3. Windows Firewall (4000-portni ochish)
echo [3/5] Tarmoq sozlamalari (Firewall port 4000)...
netsh advfirewall firewall delete rule name="GetPOS Kafe Wi-Fi Server (Port 4000)" >nul 2>&1
netsh advfirewall firewall add rule name="GetPOS Kafe Wi-Fi Server (Port 4000)" dir=in action=allow protocol=TCP localport=4000 profile=any >nul
echo [OK] 4000-port ochildi. Mobil ofitsiantlar bemalol ulanishi mumkin.

:: 4. Ish stoliga (Desktop) yorliq yaratish
echo [4/5] Ish stoli (Desktop) va Pusk menyusiga yorliqlar yaratilmoqda...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut(\"$d\GetPOS Kafe.lnk\"); $s.TargetPath = '%INSTALL_DIR%\KafePOS.exe'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.IconLocation = '%INSTALL_DIR%\launcher\app.ico, 0'; $s.Description = 'GetPOS Kafe Kassa Ilovasi'; $s.Save(); $sm = [Environment]::GetFolderPath('CommonPrograms'); if ($sm) { $s2 = $ws.CreateShortcut(\"$sm\GetPOS Kafe.lnk\"); $s2.TargetPath = '%INSTALL_DIR%\KafePOS.exe'; $s2.WorkingDirectory = '%INSTALL_DIR%'; $s2.IconLocation = '%INSTALL_DIR%\launcher\app.ico, 0'; $s2.Save(); }"

:: 5. O'chirish skripti (Uninstall.bat)
(
echo @echo off
echo title GetPOS Kafe - O'chirish ^(Uninstall^)
echo echo GetPOS Kafe dasturini o'chirmoqchimisiz?
echo pause
echo taskkill /f /im KafePOS.exe ^>nul 2^>^&1
echo taskkill /f /im node.exe ^>nul 2^>^&1
echo netsh advfirewall firewall delete rule name="GetPOS Kafe Wi-Fi Server (Port 4000)" ^>nul 2^>^&1
echo del /f /q "%%USERPROFILE%%\Desktop\GetPOS Kafe.lnk" ^>nul 2^>^&1
echo del /f /q "%%PUBLIC%%\Desktop\GetPOS Kafe.lnk" ^>nul 2^>^&1
echo echo Dastur fayllari o'chirilmoqda...
echo cd /d "%%~dp0\.."
echo rmdir /s /q "%INSTALL_DIR%"
echo echo GetPOS Kafe muvaffaqiyatli o'chirildi.
echo pause
) > "%INSTALL_DIR%\Uninstall.bat"

echo [5/5] Tayyor!
echo.
echo ===================================================================
echo   [MUVAFFAQIYATLI O'RNATILDI!]
echo   Dastur manzili: %INSTALL_DIR%
echo   Ish stolida (Desktop): "GetPOS Kafe" yorlig'i yaratildi.
echo ===================================================================
echo.
set /p RUNNOW="Dasturni hozir ishga tushirasizmi? (H/Y/Enter = Ha): "
if /i "%RUNNOW%"=="N" exit /b
if /i "%RUNNOW%"=="Yo'q" exit /b

start "" "%INSTALL_DIR%\KafePOS.exe"
exit /b
