$ErrorActionPreference = "Stop"
$root = "d:\projects\e-sklad\getkafe"
$stage = Join-Path $root "installer\payload_stage"
$zipPath = Join-Path $root "installer\payload.zip"

Write-Host "Creating staging folder at $stage..."
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Path $stage | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage "launcher") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage "server") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage "client\dist") | Out-Null

Write-Host "Copying core executables..."
Copy-Item (Join-Path $root "KafePOS.exe") $stage
Copy-Item (Join-Path $root "GetPOS.exe") $stage
Copy-Item (Join-Path $root "PrintHelper.exe") $stage
Copy-Item (Join-Path $root "package.json") $stage

if (Test-Path (Join-Path $root "node.exe")) {
    Copy-Item (Join-Path $root "node.exe") $stage
} elseif (Test-Path "C:\Program Files\nodejs\node.exe") {
    Copy-Item "C:\Program Files\nodejs\node.exe" (Join-Path $stage "node.exe")
}

Write-Host "Copying launcher..."
Copy-Item (Join-Path $root "launcher\*") (Join-Path $stage "launcher") -Recurse

Write-Host "Copying server..."
Copy-Item (Join-Path $root "server\*") (Join-Path $stage "server") -Recurse -Exclude @("*.log")

Write-Host "Copying client/dist..."
Copy-Item (Join-Path $root "client\dist\*") (Join-Path $stage "client\dist") -Recurse

Write-Host "Copying node_modules..."
if (Test-Path (Join-Path $root "node_modules")) {
    Copy-Item (Join-Path $root "node_modules") (Join-Path $stage "node_modules") -Recurse
}

Write-Host "Compressing to $zipPath..."
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zipPath, [System.IO.Compression.CompressionLevel]::Fastest, $false)

$item = Get-Item $zipPath
Write-Host "[OK] Payload compressed successfully! Size: $([math]::Round($item.Length / 1MB, 2)) MB"

# Clean up staging
Remove-Item -Recurse -Force $stage
