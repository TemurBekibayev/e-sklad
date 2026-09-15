; =====================================================================
; KafePOS / GetPOS - Inno Setup Professional Installer Script
; Arxitektura: x86 (32-bit) va x64 (64-bit) Dual-Mode Installer
; =====================================================================

#define MyAppName "GetPOS Kafe"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "GetPOS Uzbekistan"
#define MyAppURL "https://getpos.uz"
#define MyAppExeName "KafePOS.exe"

[Setup]
AppId={{90E04ABF-246D-4683-91EB-1AC34D7B2EE7}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName=C:\KafePOS
DisableDirPage=no
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\dist_installer
OutputBaseFilename=GetPOS_Kafe_Setup_v2.0
SetupIconFile=..\launcher\app.ico
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "firewall"; Description: "Mobil ofitsiantlar uchun 4000-portni Windows Firewall da ochish"; GroupDescription: "Tarmoq sozlamalari:"; Flags: checkedonce
Name: "startup"; Description: "Windows yoqilganda avtomatik ishga tushirish (Startup)"; GroupDescription: "Avto-yuklanish:"; Flags: unchecked

[Files]
; Asosiy EXE fayllar
Source: "..\KafePOS.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\GetPOS.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\PrintHelper.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\launcher\*"; DestDir: "{app}\launcher"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\*"; DestDir: "{app}\server"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules,*.log"
Source: "..\client\dist\*"; DestDir: "{app}\client\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\launcher\app.ico"
Name: "{group}\Termal Printer Sozlamalari"; Filename: "{app}\PrintHelper.exe}"; IconFilename: "{app}\launcher\app.ico"
Name: "{group}\O'chirish (Uninstall)"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\launcher\app.ico"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\launcher\app.ico"; Tasks: startup

[Run]
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""GetPOS Kafe Wi-Fi Server (Port 4000)"" dir=in action=allow protocol=TCP localport=4000"; Flags: runhidden; Tasks: firewall
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""GetPOS Kafe Wi-Fi Server (Port 4000)"""; Flags: runhidden
