const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\user', 'Desktop');
  const shortcutFile = path.join(desktopDir, 'GetPOS Kafe.lnk');
  const targetExe = path.join(__dirname, '..', 'KafePOS.exe');
  const workingDir = path.join(__dirname, '..');
  const iconPath = path.join(__dirname, '..', 'launcher', 'app.ico');

  const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${shortcutFile.replace(/\\/g, '\\\\')}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${targetExe.replace(/\\/g, '\\\\')}"
oLink.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"
oLink.Description = "GetPOS Kafe - Touch Kassa va Fiskal Chek Tizimi"
oLink.IconLocation = "${iconPath.replace(/\\/g, '\\\\')}, 0"
oLink.Save
`;

  const tempVbs = path.join(process.env.TEMP || '.', 'create_pos_shortcut.vbs');
  fs.writeFileSync(tempVbs, vbsScript, 'utf8');
  execSync(`cscript //nologo "${tempVbs}"`, { stdio: 'inherit' });
  try { fs.unlinkSync(tempVbs); } catch (e) {}
  console.log('[Shortcut] Ish stolida GetPOS Kafe yorlig\'i yaratildi:', shortcutFile);
} catch (err) {
  console.error('[Shortcut] Xatolik:', err.message);
}
