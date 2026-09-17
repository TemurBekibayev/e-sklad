@echo off
title GetPOS Kafe - O'rnatish Paketi Yig'uvchi (Installer Builder)
cd /d "%~dp0\.."

echo ===================================================================
echo     GetPOS Kafe - Standalone Setup (.EXE) Generator
echo     Arxitekturalar: Universal AnyCPU, x64 (64-bit), x86 (32-bit)
echo ===================================================================
echo.

set CSC32=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe
set CSC64=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe

if not exist "dist_installer" mkdir "dist_installer"

:: 1. C# Launcher va Dvigatellarni yig'ish
echo [1/4] Launcher va Printer dvigatellari kompilyatsiya qilinmoqda...
call launcher\build_exe.bat
if %errorlevel% neq 0 (
    echo [XATO] Launcherlarni yig'ishda xatolik!
    exit /b 1
)

:: 2. Portable Node.js runtime tekshirish
echo [2/4] Portable Node.js runtime tekshirilmoqda...
if not exist "node.exe" (
    if exist "C:\Program Files\nodejs\node.exe" copy "C:\Program Files\nodejs\node.exe" "node.exe" >nul
    if exist "C:\Program Files (x86)\nodejs\node.exe" copy "C:\Program Files (x86)\nodejs\node.exe" "node.exe" >nul
)

:: 3. Payload zip arxivini yaratish (barcha fayllarni bir paketga joylash)
echo [3/4] Barcha dastur fayllari (payload.zip) paketlanmoqda...
powershell -ExecutionPolicy Bypass -File "installer\pack_payload.ps1"
if %errorlevel% neq 0 (
    echo [XATO] Payload arxivini yaratishda xatolik!
    exit /b 1
)

:: 4. Setup Wizard EXE fayllarini yig'ish (Embedded Resource sifatida)
echo [4/4] Mustaqil Standalone Setup Wizard (.EXE) fayllari yig'ilmoqda...

:: Universal Setup (AnyCPU)
%CSC32% /target:winexe /platform:anycpu /resource:installer\payload.zip,payload.zip /out:dist_installer\GetPOS_Kafe_Setup_v2.0.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll installer\InstallerWizard.cs
if %errorlevel% neq 0 (
    echo [XATO] AnyCPU Setup kompilyatsiyasida xatolik!
) else (
    echo [OK] dist_installer\GetPOS_Kafe_Setup_v2.0.exe yaratildi.
)

:: 64-bit Setup (x64)
if exist "%CSC64%" (
    %CSC64% /target:winexe /platform:x64 /resource:installer\payload.zip,payload.zip /out:dist_installer\GetPOS_Kafe_Setup_x64.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll installer\InstallerWizard.cs
    echo [OK] dist_installer\GetPOS_Kafe_Setup_x64.exe yaratildi.
)

:: 32-bit Setup (x86)
%CSC32% /target:winexe /platform:x86 /resource:installer\payload.zip,payload.zip /out:dist_installer\GetPOS_Kafe_Setup_x86.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll installer\InstallerWizard.cs
echo [OK] dist_installer\GetPOS_Kafe_Setup_x86.exe yaratildi.

:: Skriptlarni ham dist_installer ga nusxalash
copy /y installer\Setup_KafePOS.bat dist_installer\Setup_KafePOS.bat >nul
copy /y installer\KafePOS_Setup.iss dist_installer\KafePOS_Setup.iss >nul
copy /y installer\payload.zip dist_installer\KafePOS_Offline_Files.zip >nul

:: 5. Xulosa
echo.
echo ===================================================================
echo   [MUVAFFAQIYATLI YAKUNLANDI!]
echo   Tayyorlangan Standalone Setup fayllari 'dist_installer' papkasida:
echo.
echo   1. dist_installer\GetPOS_Kafe_Setup_v2.0.exe  (Universal AnyCPU - 55MB)
echo   2. dist_installer\GetPOS_Kafe_Setup_x64.exe   (64-bit Windows)
echo   3. dist_installer\GetPOS_Kafe_Setup_x86.exe   (32-bit Windows)
echo   4. dist_installer\Setup_KafePOS.bat           (Admin Batch Setup)
echo ===================================================================
echo.
