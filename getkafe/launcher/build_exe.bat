@echo off
title KafePOS .EXE Yig'ish (x32 va x64 Paketlar)
cd /d "%~dp0\.."
echo ===================================================
echo   KafePOS.exe Windows Arxitektura Yig'uvchisi
echo   [x32 (x86), x64 va AnyCPU Universal Paketlar]
echo ===================================================
echo.

set CSC32=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe
set CSC64=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe

echo [1/3] Universal (AnyCPU - 32-bit va 64-bitda avtomatik ishlaydi)...
%CSC32% /target:exe /platform:anycpu /out:PrintHelper.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.Extensions.dll launcher\PrintHelper.cs
if %errorlevel% neq 0 exit /b 1

%CSC32% /target:winexe /platform:anycpu /out:KafePOS.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll launcher\KafePOS.cs
if %errorlevel% neq 0 exit /b 1

copy /y PrintHelper.exe launcher\PrintHelper.exe >nul
copy /y KafePOS.exe GetPOS.exe >nul
echo [OK] Universal KafePOS.exe va PrintHelper.exe yaratildi.
echo.

echo [2/3] Maxsus x86 (32-bit eski POS monobloklar uchun)...
%CSC32% /target:exe /platform:x86 /out:launcher\PrintHelper_x86.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.Extensions.dll launcher\PrintHelper.cs
%CSC32% /target:winexe /platform:x86 /out:launcher\KafePOS_x86.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll launcher\KafePOS.cs
echo [OK] 32-bit KafePOS_x86.exe va PrintHelper_x86.exe yaratildi.
echo.

echo [3/3] Maxsus x64 (64-bit zamonaviy kompyuterlar uchun)...
if exist "%CSC64%" (
    %CSC64% /target:exe /platform:x64 /out:launcher\PrintHelper_x64.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.Extensions.dll launcher\PrintHelper.cs
    %CSC64% /target:winexe /platform:x64 /out:launcher\KafePOS_x64.exe /win32icon:launcher\app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll launcher\KafePOS.cs
    echo [OK] 64-bit KafePOS_x64.exe va PrintHelper_x64.exe yaratildi.
) else (
    echo [OGOHLANTIRISH] 64-bit .NET kompilyatori topilmadi.
)

echo.
echo ===================================================
echo   [MUVAFFAQIYAT] Barcha paketlar tayyor:
echo   - KafePOS.exe          : Universal (x32 va x64 da ishlaydi)
echo   - launcher\KafePOS_x86.exe : 32-bit Windows uchun
echo   - launcher\KafePOS_x64.exe : 64-bit Windows uchun
echo   - PrintHelper.exe      : Termal printer dvigateli
echo ===================================================

