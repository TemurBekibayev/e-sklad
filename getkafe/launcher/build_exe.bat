@echo off
title KafePOS .EXE Yig'ish (Compile)
cd /d "%~dp0\.."
echo ===================================================
echo   KafePOS.exe Native Windows Ilovasini Yig'ish
echo ===================================================
echo.
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /out:KafePOS.exe /r:System.Windows.Forms.dll /r:System.Drawing.dll launcher\KafePOS.cs

if %errorlevel% equ 0 (
    copy /y KafePOS.exe GetPOS.exe >nul
    echo.
    echo [MUVAFFAQIYAT] KafePOS.exe va GetPOS.exe muvaffaqiyatli yaratildi!
) else (
    echo.
    echo [XATOLIK] Kompilyatsiyada xatolik yuz berdi.
)

