using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Security.Principal;
using System.Threading;
using System.Windows.Forms;

namespace GetPOS.Installer
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Administrator huquqlarini tekshirish
            if (!IsAdministrator())
            {
                try
                {
                    ProcessStartInfo proc = new ProcessStartInfo();
                    proc.UseShellExecute = true;
                    proc.WorkingDirectory = Environment.CurrentDirectory;
                    proc.FileName = Application.ExecutablePath;
                    proc.Verb = "runas";
                    Process.Start(proc);
                    return;
                }
                catch
                {
                    MessageBox.Show(
                        "Dasturni o'rnatish uchun Administrator huquqi talab qilinadi.\nIltimos, o'rnatish dasturini administrator nomidan ishga tushiring.",
                        "GetPOS Kafe O'rnatish",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    return;
                }
            }

            Application.Run(new InstallerForm());
        }

        private static bool IsAdministrator()
        {
            WindowsIdentity identity = WindowsIdentity.GetCurrent();
            WindowsPrincipal principal = new WindowsPrincipal(identity);
            return principal.IsInRole(WindowsBuiltInRole.Administrator);
        }
    }

    public class InstallerForm : Form
    {
        private TextBox txtInstallDir;
        private Button btnBrowse;
        private CheckBox chkDesktopIcon;
        private CheckBox chkFirewall;
        private CheckBox chkStartup;
        private CheckBox chkLaunchNow;
        private Button btnInstall;
        private Button btnCancel;
        private ProgressBar progressBar;
        private Label lblStatus;
        private Panel headerPanel;
        private Icon appIcon;

        private string defaultInstallDir = @"C:\KafePOS";
        private bool isInstalling = false;

        public InstallerForm()
        {
            this.Text = "GetPOS Kafe — Windows O'rnatish Ustasi (Setup)";
            this.Size = new Size(580, 490);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252); // slate-50
            this.Font = new Font("Segoe UI", 9F);

            LoadAppIcon();
            BuildUI();
        }

        private void LoadAppIcon()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string icoPath = Path.Combine(baseDir, "launcher", "app.ico");
                if (!File.Exists(icoPath)) icoPath = Path.Combine(baseDir, "app.ico");
                if (!File.Exists(icoPath)) icoPath = Path.Combine(baseDir, "..", "launcher", "app.ico");

                if (File.Exists(icoPath))
                {
                    appIcon = new Icon(icoPath);
                    this.Icon = appIcon;
                }
            }
            catch { }
        }

        private void BuildUI()
        {
            // 1. Header Panel
            headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 85;
            headerPanel.BackColor = Color.FromArgb(15, 23, 42); // slate-900
            this.Controls.Add(headerPanel);

            Label lblTitle = new Label();
            lblTitle.Text = "☕ GetPOS Kafe — O'rnatish Dasturi";
            lblTitle.Font = new Font("Segoe UI", 13, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(245, 158, 11); // amber-500
            lblTitle.Location = new Point(20, 18);
            lblTitle.AutoSize = true;
            headerPanel.Controls.Add(lblTitle);

            string arch = Environment.Is64BitOperatingSystem ? "64-bit (x64)" : "32-bit (x86)";
            Label lblSub = new Label();
            lblSub.Text = "Restoran va Kafe Touch Kassa Tizimi • Windows " + arch + " Standalone";
            lblSub.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(148, 163, 184); // slate-400
            lblSub.Location = new Point(22, 48);
            lblSub.AutoSize = true;
            headerPanel.Controls.Add(lblSub);

            // 2. Directory Selection Group
            GroupBox grpDir = new GroupBox();
            grpDir.Text = " O'rnatish manzili ";
            grpDir.Location = new Point(20, 100);
            grpDir.Size = new Size(525, 75);
            grpDir.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            this.Controls.Add(grpDir);

            txtInstallDir = new TextBox();
            txtInstallDir.Text = defaultInstallDir;
            txtInstallDir.Location = new Point(20, 30);
            txtInstallDir.Size = new Size(390, 25);
            txtInstallDir.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);
            grpDir.Controls.Add(txtInstallDir);

            btnBrowse = new Button();
            btnBrowse.Text = "Tanlash...";
            btnBrowse.Location = new Point(420, 28);
            btnBrowse.Size = new Size(85, 29);
            btnBrowse.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            btnBrowse.Click += (s, e) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "GetPOS Kafe o'rnatiladigan papkani tanlang:";
                    fbd.SelectedPath = txtInstallDir.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtInstallDir.Text = fbd.SelectedPath;
                    }
                }
            };
            grpDir.Controls.Add(btnBrowse);

            // 3. Options Group
            GroupBox grpOpts = new GroupBox();
            grpOpts.Text = " Qo'shimcha parametrlar ";
            grpOpts.Location = new Point(20, 185);
            grpOpts.Size = new Size(525, 125);
            grpOpts.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            this.Controls.Add(grpOpts);

            chkDesktopIcon = new CheckBox();
            chkDesktopIcon.Text = "Ish stolida (Desktop) \"GetPOS Kafe\" yorlig'ini yaratish";
            chkDesktopIcon.Checked = true;
            chkDesktopIcon.Location = new Point(20, 25);
            chkDesktopIcon.Size = new Size(480, 22);
            chkDesktopIcon.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            grpOpts.Controls.Add(chkDesktopIcon);

            chkFirewall = new CheckBox();
            chkFirewall.Text = "Mobil ofitsiantlar uchun tarmoqni ochish (Windows Firewall Port 4000)";
            chkFirewall.Checked = true;
            chkFirewall.Location = new Point(20, 52);
            chkFirewall.Size = new Size(480, 22);
            chkFirewall.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            grpOpts.Controls.Add(chkFirewall);

            chkStartup = new CheckBox();
            chkStartup.Text = "Windows yoqilganda kassani avtomatik ishga tushirish (Startup)";
            chkStartup.Checked = false;
            chkStartup.Location = new Point(20, 80);
            chkStartup.Size = new Size(480, 22);
            chkStartup.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            grpOpts.Controls.Add(chkStartup);

            // 4. Progress Area
            lblStatus = new Label();
            lblStatus.Text = "O'rnatishga tayyor. \"O'rnatish\" tugmasini bosing.";
            lblStatus.Location = new Point(20, 320);
            lblStatus.Size = new Size(525, 20);
            lblStatus.ForeColor = Color.FromArgb(71, 85, 105);
            this.Controls.Add(lblStatus);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(20, 345);
            progressBar.Size = new Size(525, 22);
            this.Controls.Add(progressBar);

            chkLaunchNow = new CheckBox();
            chkLaunchNow.Text = "O'rnatish tugagach GetPOS Kafe dasturini darhol ishga tushirish";
            chkLaunchNow.Checked = true;
            chkLaunchNow.Location = new Point(20, 380);
            chkLaunchNow.Size = new Size(525, 22);
            chkLaunchNow.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            this.Controls.Add(chkLaunchNow);

            // 5. Action Buttons
            btnInstall = new Button();
            btnInstall.Text = "🚀 O'rnatish (Install)";
            btnInstall.Location = new Point(300, 415);
            btnInstall.Size = new Size(140, 34);
            btnInstall.BackColor = Color.FromArgb(245, 158, 11);
            btnInstall.ForeColor = Color.Black;
            btnInstall.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.Click += BtnInstall_Click;
            this.Controls.Add(btnInstall);

            btnCancel = new Button();
            btnCancel.Text = "Bekor qilish";
            btnCancel.Location = new Point(450, 415);
            btnCancel.Size = new Size(95, 34);
            btnCancel.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            btnCancel.Click += (s, e) => { this.Close(); };
            this.Controls.Add(btnCancel);
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            if (isInstalling) return;

            string targetDir = txtInstallDir.Text.Trim();
            if (string.IsNullOrEmpty(targetDir))
            {
                MessageBox.Show("Iltimos, o'rnatish manzilini ko'rsating!", "GetPOS Kafe", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            isInstalling = true;
            btnInstall.Enabled = false;
            btnCancel.Enabled = false;
            btnBrowse.Enabled = false;
            txtInstallDir.Enabled = false;

            Thread worker = new Thread(() => PerformInstallation(targetDir));
            worker.IsBackground = true;
            worker.Start();
        }

        private void SetStatus(string text, int progress)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action(() => SetStatus(text, progress)));
                return;
            }

            lblStatus.Text = text;
            if (progress >= 0 && progress <= 100)
            {
                progressBar.Value = progress;
            }
        }

        private void PerformInstallation(string targetDir)
        {
            try
            {
                SetStatus("O'rnatish papkasi tayyorlanmoqda...", 5);
                if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);

                string sourceDir = ResolveSourceDirectory();

                // 1. Fayllarni nusxalash yoki arxivdan chiqarish
                SetStatus("Dastur fayllari o'rnatilmoqda...", 15);
                
                // Embedded zip resursi bormi?
                bool extractedFromZip = ExtractEmbeddedPayload(targetDir);

                if (!extractedFromZip)
                {
                    // Papkadan to'g'ridan-to'g'ri nusxalash
                    CopyDirectoryStructure(sourceDir, targetDir);
                }

                // 2. Node runtime tekshirish / nusxalash
                SetStatus("Dastur dvigateli tekshirilmoqda...", 60);
                EnsureNodeExecutable(sourceDir, targetDir);

                // 3. Windows Firewall (Port 4000)
                if (chkFirewall.Checked)
                {
                    SetStatus("Tarmoq sozlamalari (Firewall port 4000) sozlanmoqda...", 75);
                    ConfigureFirewall();
                }

                // 4. Yorliqlar yaratish
                SetStatus("Ish stoli va menyu yorliqlari yaratilmoqda...", 85);
                if (chkDesktopIcon.Checked)
                {
                    CreateDesktopShortcut(targetDir);
                }

                if (chkStartup.Checked)
                {
                    CreateStartupShortcut(targetDir);
                }

                CreateStartMenuShortcut(targetDir);

                // 5. O'chirish skripti (Uninstall.bat)
                SetStatus("O'chirish moduli (Uninstaller) yaratilmoqda...", 95);
                CreateUninstaller(targetDir);

                SetStatus("Muvaffaqiyatli yakunlandi!", 100);
                Thread.Sleep(500);

                this.BeginInvoke(new Action(() =>
                {
                    MessageBox.Show(
                        "GetPOS Kafe dasturi kompyuteringizga muvaffaqiyatli o'rnatildi!\n\nManzil: " + targetDir,
                        "GetPOS Kafe O'rnatish",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );

                    if (chkLaunchNow.Checked)
                    {
                        string mainExe = Path.Combine(targetDir, "KafePOS.exe");
                        if (File.Exists(mainExe))
                        {
                            try
                            {
                                ProcessStartInfo psi = new ProcessStartInfo(mainExe);
                                psi.WorkingDirectory = targetDir;
                                Process.Start(psi);
                            }
                            catch { }
                        }
                    }

                    this.Close();
                }));
            }
            catch (Exception ex)
            {
                this.BeginInvoke(new Action(() =>
                {
                    MessageBox.Show("O'rnatishda xatolik yuz berdi:\n" + ex.Message, "GetPOS Kafe Xatolik", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    btnInstall.Enabled = true;
                    btnCancel.Enabled = true;
                    isInstalling = false;
                }));
            }
        }

        private string ResolveSourceDirectory()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            if (File.Exists(Path.Combine(baseDir, "server", "index.js"))) return baseDir;
            if (File.Exists(Path.Combine(baseDir, "..", "server", "index.js"))) return Path.GetFullPath(Path.Combine(baseDir, ".."));
            return baseDir;
        }

        private bool ExtractEmbeddedPayload(string targetDir)
        {
            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                string[] names = asm.GetManifestResourceNames();
                foreach (string name in names)
                {
                    if (name.EndsWith("payload.zip", StringComparison.OrdinalIgnoreCase))
                    {
                        using (Stream stream = asm.GetManifestResourceStream(name))
                        {
                            if (stream != null)
                            {
                                using (ZipArchive archive = new ZipArchive(stream))
                                {
                                    archive.ExtractToDirectory(targetDir);
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
            catch { }
            return false;
        }

        private void CopyDirectoryStructure(string sourceDir, string targetDir)
        {
            // Asosiy fayllar
            string[] topFiles = new string[] { "KafePOS.exe", "GetPOS.exe", "PrintHelper.exe", "package.json", "node.exe" };
            foreach (string file in topFiles)
            {
                string s = Path.Combine(sourceDir, file);
                string d = Path.Combine(targetDir, file);
                if (File.Exists(s))
                {
                    try { File.Copy(s, d, true); } catch { }
                }
            }

            // Papkalar
            CopyDirRecursive(Path.Combine(sourceDir, "launcher"), Path.Combine(targetDir, "launcher"));
            CopyDirRecursive(Path.Combine(sourceDir, "server"), Path.Combine(targetDir, "server"));
            CopyDirRecursive(Path.Combine(sourceDir, "client", "dist"), Path.Combine(targetDir, "client", "dist"));

            if (Directory.Exists(Path.Combine(sourceDir, "node_modules")))
            {
                CopyDirRecursive(Path.Combine(sourceDir, "node_modules"), Path.Combine(targetDir, "node_modules"));
            }
        }

        private void CopyDirRecursive(string source, string target)
        {
            if (!Directory.Exists(source)) return;
            if (!Directory.Exists(target)) Directory.CreateDirectory(target);

            foreach (string file in Directory.GetFiles(source))
            {
                string fName = Path.GetFileName(file);
                if (fName.EndsWith(".log", StringComparison.OrdinalIgnoreCase)) continue;
                string dest = Path.Combine(target, fName);
                try { File.Copy(file, dest, true); } catch { }
            }

            foreach (string dir in Directory.GetDirectories(source))
            {
                string dName = Path.GetFileName(dir);
                if (dName.Equals(".git", StringComparison.OrdinalIgnoreCase)) continue;
                CopyDirRecursive(dir, Path.Combine(target, dName));
            }
        }

        private void EnsureNodeExecutable(string sourceDir, string targetDir)
        {
            try
            {
                string targetNode = Path.Combine(targetDir, "node.exe");
                if (!File.Exists(targetNode))
                {
                    string systemNode = FindSystemNode();
                    if (!string.IsNullOrEmpty(systemNode) && File.Exists(systemNode))
                    {
                        File.Copy(systemNode, targetNode, true);
                    }
                }
            }
            catch { }
        }

        private string FindSystemNode()
        {
            string[] candidates = new string[]
            {
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\node\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"npm\node.exe")
            };
            foreach (string p in candidates)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }

        private void ConfigureFirewall()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("netsh", "advfirewall firewall delete rule name=\"GetPOS Kafe Wi-Fi Server (Port 4000)\"");
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                Process p1 = Process.Start(psi);
                p1.WaitForExit(3000);

                ProcessStartInfo psi2 = new ProcessStartInfo("netsh", "advfirewall firewall add rule name=\"GetPOS Kafe Wi-Fi Server (Port 4000)\" dir=in action=allow protocol=TCP localport=4000 profile=any");
                psi2.CreateNoWindow = true;
                psi2.UseShellExecute = false;
                Process p2 = Process.Start(psi2);
                p2.WaitForExit(3000);
            }
            catch { }
        }

        private void CreateDesktopShortcut(string targetDir)
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktop, "GetPOS Kafe.lnk");
                CreateShortcutFile(shortcutPath, targetDir);

                // Common Desktop for all users
                string commonDesktop = Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory);
                if (!string.IsNullOrEmpty(commonDesktop) && Directory.Exists(commonDesktop))
                {
                    CreateShortcutFile(Path.Combine(commonDesktop, "GetPOS Kafe.lnk"), targetDir);
                }
            }
            catch { }
        }

        private void CreateStartupShortcut(string targetDir)
        {
            try
            {
                string startup = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
                string shortcutPath = Path.Combine(startup, "GetPOS Kafe.lnk");
                CreateShortcutFile(shortcutPath, targetDir);
            }
            catch { }
        }

        private void CreateStartMenuShortcut(string targetDir)
        {
            try
            {
                string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                string folder = Path.Combine(programs, "GetPOS Kafe");
                if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);

                CreateShortcutFile(Path.Combine(folder, "GetPOS Kafe.lnk"), targetDir);
                
                string printHelperExe = Path.Combine(targetDir, "PrintHelper.exe");
                if (File.Exists(printHelperExe))
                {
                    CreateShortcutFileDirect(Path.Combine(folder, "Termal Printer Sozlamalari.lnk"), printHelperExe, targetDir);
                }
            }
            catch { }
        }

        private void CreateShortcutFile(string shortcutPath, string targetDir)
        {
            string exePath = Path.Combine(targetDir, "KafePOS.exe");
            CreateShortcutFileDirect(shortcutPath, exePath, targetDir);
        }

        private void CreateShortcutFileDirect(string shortcutPath, string exePath, string workDir)
        {
            try
            {
                string icoPath = Path.Combine(workDir, "launcher", "app.ico");
                if (!File.Exists(icoPath)) icoPath = Path.Combine(workDir, "app.ico");

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    object shell = Activator.CreateInstance(shellType);
                    object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                    Type scType = shortcut.GetType();
                    scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { exePath });
                    scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workDir });
                    scType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "GetPOS Kafe - Touch Kassa Tizimi" });
                    if (File.Exists(icoPath))
                    {
                        scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { icoPath + ",0" });
                    }
                    scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
                }
            }
            catch { }
        }

        private void CreateUninstaller(string targetDir)
        {
            try
            {
                string batPath = Path.Combine(targetDir, "Uninstall.bat");
                string content = "@echo off\r\n" +
                    "title GetPOS Kafe - Dasturni O'chirish\r\n" +
                    "color 0C\r\n" +
                    "echo ===================================================\r\n" +
                    "echo           GetPOS Kafe Dasturini O'chirish\r\n" +
                    "echo ===================================================\r\n" +
                    "echo.\r\n" +
                    "set /p CONFIRM=\"Haqiqatan ham GetPOS Kafe dasturini o'chirmoqchimisiz? (H/Y): \"\r\n" +
                    "if /i not \"%CONFIRM%\"==\"H\" if /i not \"%CONFIRM%\"==\"Y\" exit /b\r\n" +
                    "echo.\r\n" +
                    "echo Dastur jarayonlari to'xtatilmoqda...\r\n" +
                    "taskkill /f /im KafePOS.exe >nul 2>&1\r\n" +
                    "taskkill /f /im PrintHelper.exe >nul 2>&1\r\n" +
                    "taskkill /f /im node.exe >nul 2>&1\r\n" +
                    "echo Tarmoq sozlamalari tozalanmoqda...\r\n" +
                    "netsh advfirewall firewall delete rule name=\"GetPOS Kafe Wi-Fi Server (Port 4000)\" >nul 2>&1\r\n" +
                    "echo Yorliqlar o'chirilmoqda...\r\n" +
                    "del /f /q \"%USERPROFILE%\\Desktop\\GetPOS Kafe.lnk\" >nul 2>&1\r\n" +
                    "del /f /q \"%PUBLIC%\\Desktop\\GetPOS Kafe.lnk\" >nul 2>&1\r\n" +
                    "del /f /q \"%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\GetPOS Kafe.lnk\" >nul 2>&1\r\n" +
                    "rmdir /s /q \"%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\GetPOS Kafe\" >nul 2>&1\r\n" +
                    "echo Dastur fayllari o'chirilmoqda...\r\n" +
                    "cd /d \"%TEMP%\"\r\n" +
                    "rmdir /s /q \"" + targetDir + "\" >nul 2>&1\r\n" +
                    "echo.\r\n" +
                    "echo [OK] GetPOS Kafe kompyuteringizdan to'liq o'chirildi.\r\n" +
                    "pause\r\n";
                File.WriteAllText(batPath, content);
            }
            catch { }
        }
    }
}
