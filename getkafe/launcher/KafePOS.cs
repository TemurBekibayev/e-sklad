using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace KafePOS
{
    static class Program
    {
        private static Mutex singleInstanceMutex;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool createdNew;
            singleInstanceMutex = new Mutex(true, "KafePOS_SingleInstance_Mutex_v2", out createdNew);

            if (!createdNew)
            {
                // Bir vaqtning o'zida ikkita nusxa ochilmasligi uchun
                MessageBox.Show("GetPOS Kafe ilovasi allaqachon ishlab turibdi!\nIltimos, ekranning pastki o'ng burchagidagi (System Tray) soat yonidagi GetPOS belgisini tekshiring.",
                    "GetPOS Kafe", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            try
            {
                Application.Run(new PosApplicationContext());
            }
            finally
            {
                if (singleInstanceMutex != null)
                {
                    singleInstanceMutex.ReleaseMutex();
                    singleInstanceMutex.Close();
                }
            }
        }
    }

    public class PosApplicationContext : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private ContextMenuStrip trayMenu;
        private Process backendProcess;
        private Process posWindowProcess;
        private string projectDir;
        private Icon appIcon;

        public PosApplicationContext()
        {
            projectDir = ResolveProjectDirectory();
            appIcon = LoadOrCreateAppIcon();

            InitializeTray();
            EnsureDesktopShortcut();

            // Splash Formani ko'rsatish
            SplashForm splash = new SplashForm(projectDir, appIcon, OnServerReady);
            splash.Show();
        }

        private string ResolveProjectDirectory()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            if (File.Exists(Path.Combine(baseDir, "server", "index.js"))) return baseDir;

            string currentDir = Directory.GetCurrentDirectory();
            if (File.Exists(Path.Combine(currentDir, "server", "index.js"))) return currentDir;

            DirectoryInfo parentInfo = Directory.GetParent(baseDir);
            if (parentInfo != null && File.Exists(Path.Combine(parentInfo.FullName, "server", "index.js")))
            {
                return parentInfo.FullName;
            }

            return baseDir;
        }

        private Icon LoadOrCreateAppIcon()
        {
            try
            {
                string[] candidates = new string[]
                {
                    Path.Combine(projectDir, "launcher", "app.ico"),
                    Path.Combine(projectDir, "app.ico"),
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "launcher", "app.ico"),
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico"),
                };

                foreach (string p in candidates)
                {
                    if (File.Exists(p))
                    {
                        return new Icon(p);
                    }
                }

                // Dinamik 32x32 oltin GetPOS ikonkasi
                using (Bitmap bmp = new Bitmap(32, 32))
                {
                    using (Graphics g = Graphics.FromImage(bmp))
                    {
                        g.SmoothingMode = SmoothingMode.AntiAlias;
                        using (Brush bg = new SolidBrush(Color.FromArgb(15, 23, 42)))
                        {
                            g.FillEllipse(bg, 1, 1, 30, 30);
                        }
                        using (Pen pen = new Pen(Color.FromArgb(245, 158, 11), 2))
                        {
                            g.DrawEllipse(pen, 2, 2, 28, 28);
                        }
                        using (Font font = new Font("Segoe UI", 10, FontStyle.Bold))
                        using (StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                        {
                            g.DrawString("GP", font, Brushes.White, new RectangleF(0, 0, 32, 32), sf);
                        }
                    }
                    return Icon.FromHandle(bmp.GetHicon());
                }
            }
            catch
            {
                return SystemIcons.Application;
            }
        }

        private void InitializeTray()
        {
            trayMenu = new ContextMenuStrip();
            trayMenu.Font = new Font("Segoe UI", 9F);

            // Sarlavha
            ToolStripMenuItem titleItem = new ToolStripMenuItem("☕ GetPOS Kafe — Faol");
            titleItem.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            titleItem.ForeColor = Color.FromArgb(217, 119, 6); // amber-600
            titleItem.Enabled = false;
            trayMenu.Items.Add(titleItem);

            // Port ma'lumoti
            ToolStripMenuItem portItem = new ToolStripMenuItem("🌐 Server: http://127.0.0.1:4000");
            portItem.Enabled = false;
            trayMenu.Items.Add(portItem);

            trayMenu.Items.Add(new ToolStripSeparator());

            // 1. Kassa oynasini ochish
            ToolStripMenuItem openItem = new ToolStripMenuItem("🖥️ Kassa Oynasini Ochish", null, (s, e) => LaunchPosWindow());
            openItem.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            trayMenu.Items.Add(openItem);

            // 2. Printerlarni tekshirish (Test chek)
            ToolStripMenuItem printItem = new ToolStripMenuItem("🖨️ Printerlarni Tekshirish (Test Chek)", null, (s, e) => RunPrinterTest());
            trayMenu.Items.Add(printItem);

            // 3. Brauzerda ochish
            ToolStripMenuItem browserItem = new ToolStripMenuItem("🌐 Standart Brauzerda Ochish", null, (s, e) => {
                try { Process.Start("http://127.0.0.1:4000"); } catch { }
            });
            trayMenu.Items.Add(browserItem);

            // 4. Kassa papkasini ochish
            ToolStripMenuItem folderItem = new ToolStripMenuItem("📁 Kassa Papkasini Ochish", null, (s, e) => {
                try { Process.Start("explorer.exe", projectDir); } catch { }
            });
            trayMenu.Items.Add(folderItem);

            trayMenu.Items.Add(new ToolStripSeparator());

            // 5. Chiqish
            ToolStripMenuItem exitItem = new ToolStripMenuItem("❌ Dasturdan Chiqish (Serverni To'xtatish)", null, (s, e) => ExitApplication());
            trayMenu.Items.Add(exitItem);

            trayIcon = new NotifyIcon();
            trayIcon.Text = "GetPOS Kafe — Touch Kassa (Faol)";
            trayIcon.Icon = appIcon;
            trayIcon.ContextMenuStrip = trayMenu;
            trayIcon.Visible = true;

            trayIcon.DoubleClick += (s, e) => LaunchPosWindow();
        }

        private void EnsureDesktopShortcut()
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktop, "GetPOS Kafe.lnk");
                string exePath = Path.Combine(projectDir, "KafePOS.exe");
                if (!File.Exists(exePath))
                {
                    exePath = Process.GetCurrentProcess().MainModule.FileName;
                }
                string icoPath = Path.Combine(projectDir, "launcher", "app.ico");

                if (!File.Exists(shortcutPath) && File.Exists(exePath))
                {
                    Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                    if (shellType != null)
                    {
                        object shell = Activator.CreateInstance(shellType);
                        object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                        Type scType = shortcut.GetType();
                        scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { exePath });
                        scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { projectDir });
                        scType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "GetPOS Kafe - Touch Kassa va Fiskal Chek Tizimi" });
                        if (File.Exists(icoPath))
                        {
                            scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { icoPath + ",0" });
                        }
                        scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
                    }
                }
            }
            catch { }
        }

        private void OnServerReady(Process proc)
        {
            if (proc != null)
            {
                backendProcess = proc;
            }

            try
            {
                trayIcon.ShowBalloonTip(3000, "GetPOS Kafe Tayyor!", "Kassa serveri va termal printerlar tizimi muvaffaqiyatli ishga tushdi.", ToolTipIcon.Info);
            }
            catch { }

            LaunchPosWindow();
        }

        private string FindBrowserExecutable()
        {
            string[] searchPaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
            };

            foreach (string p in searchPaths)
            {
                if (File.Exists(p)) return p;
            }
            return "msedge.exe";
        }

        public void LaunchPosWindow()
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string userDataDir = Path.Combine(localAppData, "KafePOS", "Data");
                if (!Directory.Exists(userDataDir))
                {
                    Directory.CreateDirectory(userDataDir);
                }

                string browserExe = FindBrowserExecutable();
                string arguments = string.Format(
                    "--app=\"http://127.0.0.1:4000\" --user-data-dir=\"{0}\" --kiosk-printing --no-first-run --no-default-browser-check --disable-translate --disable-features=Translate,OptimizationHints,MediaRouter --disable-session-crashed-bubble --disable-infobars --app-id=\"GetPOS.Kafe\" --start-maximized",
                    userDataDir
                );

                ProcessStartInfo psi = new ProcessStartInfo(browserExe, arguments);
                psi.UseShellExecute = true;
                posWindowProcess = Process.Start(psi);
            }
            catch
            {
                try
                {
                    Process.Start("http://127.0.0.1:4000");
                }
                catch { }
            }
        }

        private void RunPrinterTest()
        {
            try
            {
                string helperExe = Path.Combine(projectDir, "PrintHelper.exe");
                if (!File.Exists(helperExe))
                {
                    helperExe = Path.Combine(projectDir, "launcher", "PrintHelper.exe");
                }

                if (File.Exists(helperExe))
                {
                    ProcessStartInfo psi = new ProcessStartInfo(helperExe, "test");
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    Process.Start(psi);
                    trayIcon.ShowBalloonTip(2000, "Printer Tekshiruvi", "Sinov cheki printerga yuborildi!", ToolTipIcon.Info);
                }
                else
                {
                    MessageBox.Show("PrintHelper.exe topilmadi.", "GetPOS Kafe", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Printer xatosi: " + ex.Message, "GetPOS Kafe", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void ExitApplication()
        {
            DialogResult dr = MessageBox.Show(
                "Haqiqatan ham GetPOS Kafe dasturini to'liq yopmoqchimisiz?\n(Kassa serveri va printer xizmatlari to'xtatiladi)",
                "GetPOS Kafe",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (dr == DialogResult.Yes)
            {
                try
                {
                    if (backendProcess != null && !backendProcess.HasExited)
                    {
                        backendProcess.Kill();
                    }
                }
                catch { }

                try
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
                catch { }

                ExitThread();
                Application.Exit();
            }
        }
    }

    public class SplashForm : Form
    {
        private Label lblStatus;
        private Label lblTitle;
        private ProgressBar progressBar;
        private string projectDir;
        private Icon formIcon;
        private Action<Process> onReadyCallback;
        private Process spawnedServerProcess;

        public SplashForm(string pDir, Icon icon, Action<Process> onReady)
        {
            this.projectDir = pDir;
            this.formIcon = icon;
            this.onReadyCallback = onReady;

            this.Text = "GetPOS Kafe";
            this.Icon = icon;
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Size = new Size(480, 230);
            this.BackColor = Color.FromArgb(15, 23, 42); // slate-900

            // Title
            lblTitle = new Label();
            lblTitle.Text = "GetPOS Kafe";
            lblTitle.Font = new Font("Segoe UI", 20, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(245, 158, 11); // amber-500
            lblTitle.Location = new Point(32, 28);
            lblTitle.AutoSize = true;
            this.Controls.Add(lblTitle);

            // Subtitle
            Label lblSub = new Label();
            lblSub.Text = "Professional Touch Kassa • Termal Chek • JetBot • Soliq OFD";
            lblSub.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(148, 163, 184); // slate-400
            lblSub.Location = new Point(34, 68);
            lblSub.AutoSize = true;
            this.Controls.Add(lblSub);

            // Status Label
            lblStatus = new Label();
            lblStatus.Text = "Tizim tayyorlanmoqda...";
            lblStatus.Font = new Font("Segoe UI", 10, FontStyle.Regular);
            lblStatus.ForeColor = Color.White;
            lblStatus.Location = new Point(34, 115);
            lblStatus.Size = new Size(410, 25);
            this.Controls.Add(lblStatus);

            // Progress Bar
            progressBar = new ProgressBar();
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 25;
            progressBar.Location = new Point(34, 150);
            progressBar.Size = new Size(412, 12);
            this.Controls.Add(progressBar);

            // Version info
            Label lblVer = new Label();
            lblVer.Text = "v2.5 Standalone POS Edition";
            lblVer.Font = new Font("Segoe UI", 8, FontStyle.Regular);
            lblVer.ForeColor = Color.FromArgb(100, 116, 139);
            lblVer.Location = new Point(34, 185);
            lblVer.AutoSize = true;
            this.Controls.Add(lblVer);

            // Border styling
            this.Paint += (s, e) =>
            {
                using (Pen p = new Pen(Color.FromArgb(245, 158, 11), 2))
                {
                    e.Graphics.DrawRectangle(p, 1, 1, this.Width - 2, this.Height - 2);
                }
            };

            Thread worker = new Thread(StartKafePOSProcess);
            worker.IsBackground = true;
            worker.Start();
        }

        private void UpdateStatus(string message)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action(() => UpdateStatus(message)));
                return;
            }
            lblStatus.Text = message;
        }

        private void StartKafePOSProcess()
        {
            try
            {
                // 1. Agar server allaqachon ishlab turgan bo'lsa (port 4000)
                if (IsServerAlive())
                {
                    UpdateStatus("Server faol! Kassa ochilmoqda...");
                    Thread.Sleep(400);
                    CompleteSplash();
                    return;
                }

                // 2. Mahalliy KafePOS dvigatelini ishga tushirish
                UpdateStatus("KafePOS serveri ishga tushirilmoqda...");
                string serverJs = Path.Combine(projectDir, "server", "index.js");

                if (File.Exists(serverJs))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.WorkingDirectory = projectDir;
                    psi.FileName = "node.exe";
                    psi.Arguments = "\"" + serverJs + "\"";
                    psi.CreateNoWindow = true;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.UseShellExecute = false;
                    try
                    {
                        spawnedServerProcess = Process.Start(psi);
                    }
                    catch
                    {
                        // Agar to'g'ridan-to'g'ri node.exe topilmasa, cmd orqali
                        psi.FileName = "cmd.exe";
                        psi.Arguments = "/c node \"" + serverJs + "\"";
                        spawnedServerProcess = Process.Start(psi);
                    }
                }

                // 3. Port 4000 javob berishini kutish
                UpdateStatus("Kassa tayyorlanmoqda...");
                bool ready = false;
                for (int i = 0; i < 25; i++)
                {
                    Thread.Sleep(800);
                    if (IsServerAlive())
                    {
                        ready = true;
                        break;
                    }
                }

                if (ready)
                {
                    UpdateStatus("KafePOS oynasi ochilmoqda...");
                    Thread.Sleep(300);
                    CompleteSplash();
                }
                else
                {
                    MessageBox.Show(
                        "KafePOS serverini ishga tushirishda xatolik yuz berdi.\nIltimos, Node.js o'rnatilganligini tekshiring.",
                        "GetPOS Kafe Xatosi",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    CompleteSplash();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Xatolik: " + ex.Message, "GetPOS Kafe", MessageBoxButtons.OK, MessageBoxIcon.Error);
                CompleteSplash();
            }
        }

        private void CompleteSplash()
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action(CompleteSplash));
                return;
            }

            this.Hide();
            if (onReadyCallback != null)
            {
                onReadyCallback(spawnedServerProcess);
            }
            this.Close();
        }

        private bool IsServerAlive()
        {
            string[] testUrls = new string[] {
                "http://127.0.0.1:4000/api/status",
                "http://localhost:4000/api/status",
                "http://127.0.0.1:4000/api/health"
            };

            foreach (string url in testUrls)
            {
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                    req.Timeout = 1200;
                    req.Method = "GET";
                    using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                    {
                        if (res.StatusCode == HttpStatusCode.OK)
                        {
                            return true;
                        }
                    }
                }
                catch { }
            }
            return false;
        }
    }
}
