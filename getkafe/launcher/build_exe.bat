@echo off
title KafePOS .EXE Yig'ish (Compile)
cd /d "%~dp0\.."
echo ===================================================
echo   KafePOS.exe Native Windows Ilovasini Yig'ish
echo ===================================================
echo.
echo [1/2] Termal Chek Chop etish Dvigateli (PrintHelper.exe)...
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:exe /out:PrintHelper.exe /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.Extensions.dll launcher\PrintHelper.cs
if %errorlevel% neq 0 (
    echo [XATOLIK] PrintHelper.exe kompilyatsiyasida xatolik yuz berdi.
    exit /b 1
)
copy /y PrintHelper.exe launcher\PrintHelper.exe >nul

echo [2/2] Kassa Boshqaruv Ilovasi (KafePOS.exe)...
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /out:KafePOS.exe /r:System.Windows.Forms.dll /r:System.Drawing.dll launcher\KafePOS.cs

if %errorlevel% equ 0 (
    copy /y KafePOS.exe GetPOS.exe >nul
    echo.
    echo ===================================================
    echo   [MUVAFFAQIYAT] Barcha ilovalar yaratildi:
    echo   - KafePOS.exe : Asosiy Kassa Ilovasi
    echo   - GetPOS.exe  : Qoshimcha havola
    echo   - PrintHelper.exe : Haqiqiy Termal Chek Dvigateli
    echo ===================================================
) else (
    echo.
    echo [XATOLIK] KafePOS.exe kompilyatsiyasida xatolik yuz berdi.
)

