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

:: 2. Node.exe ko'chirish
echo [2/4] Portable Node.js runtime tekshirilmoqda...
if not exist "node.exe" (
    if exist "C:\Program Files\nodejs\node.exe" copy "C:\Program Files\nodejs\node.exe" "node.exe" >nul
    if exist "C:\Program Files (x86)\nodejs\node.exe" copy "C:\Program Files (x86)\nodejs\node.exe" "node.exe" >nul
)

:: 3. Setup Wizard EXE fayllarini yig'ish (Universal, x64 va x86)
echo [3/4] Setup Wizard (.EXE) installerlar yaratilmoqda...

:: Universal Setup (AnyCPU)
%CSC32% /target:winexe /platform:anycpu /out:dist_installer\GetPOS_Kafe_Setup_v2.0.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll installer\InstallerWizard.cs
if %errorlevel% neq 0 (
    echo [XATO] AnyCPU Setup kompilyatsiyasida xatolik!
) else (
    echo [OK] dist_installer\GetPOS_Kafe_Setup_v2.0.exe yaratildi.
)

:: 64-bit Setup (x64)
if exist "%CSC64%" (
    %CSC64% /target:winexe /platform:x64 /out:dist_installer\GetPOS_Kafe_Setup_x64.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll installer\InstallerWizard.cs
    echo [OK] dist_installer\GetPOS_Kafe_Setup_x64.exe yaratildi.
)

:: 32-bit Setup (x86)
%CSC32% /target:winexe /platform:x86 /out:dist_installer\GetPOS_Kafe_Setup_x86.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll installer\InstallerWizard.cs
echo [OK] dist_installer\GetPOS_Kafe_Setup_x86.exe yaratildi.

:: Batch o'rnatuvchini ham dist_installer ga ko'chirish
copy /y installer\Setup_KafePOS.bat dist_installer\Setup_KafePOS.bat >nul
copy /y installer\KafePOS_Setup.iss dist_installer\KafePOS_Setup.iss >nul

:: 4. Xulosa
echo.
echo ===================================================================
echo   [MUVAFFAQIYATLI YAKUNLANDI!]
echo   Tayyorlangan Setup fayllari 'dist_installer' papkasida:
echo.
echo   1. dist_installer\GetPOS_Kafe_Setup_v2.0.exe  (Universal AnyCPU)
echo   2. dist_installer\GetPOS_Kafe_Setup_x64.exe   (64-bit Windows)
echo   3. dist_installer\GetPOS_Kafe_Setup_x86.exe   (32-bit Windows)
echo   4. dist_installer\Setup_KafePOS.bat           (Admin Batch Setup)
echo ===================================================================
echo.
