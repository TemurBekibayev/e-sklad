using System;
using System.Collections.Generic;
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
            if (File.Exists(Path.Combine(baseDir, "getkafe", "server", "index.js"))) return Path.Combine(baseDir, "getkafe");

            string currentDir = Directory.GetCurrentDirectory();
            if (File.Exists(Path.Combine(currentDir, "server", "index.js"))) return currentDir;
            if (File.Exists(Path.Combine(currentDir, "getkafe", "server", "index.js"))) return Path.Combine(currentDir, "getkafe");

            DirectoryInfo parentInfo = Directory.GetParent(baseDir);
            if (parentInfo != null)
            {
                if (File.Exists(Path.Combine(parentInfo.FullName, "server", "index.js"))) return parentInfo.FullName;
                if (File.Exists(Path.Combine(parentInfo.FullName, "getkafe", "server", "index.js"))) return Path.Combine(parentInfo.FullName, "getkafe");
            }

            return baseDir;
        }

        public static string FindNodeExecutable(string customProjectDir = null)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            List<string> candidates = new List<string>
            {
                Path.Combine(baseDir, "node.exe"),
                Path.Combine(baseDir, "runtime", "node.exe"),
                Path.Combine(baseDir, "runtime", "bin", "node.exe"),
                Path.Combine(baseDir, "getkafe", "node.exe")
            };

            if (!string.IsNullOrEmpty(customProjectDir))
            {
                candidates.Add(Path.Combine(customProjectDir, "node.exe"));
                candidates.Add(Path.Combine(customProjectDir, "runtime", "node.exe"));
                candidates.Add(Path.Combine(customProjectDir, "getkafe", "node.exe"));
            }

            candidates.AddRange(new string[]
            {
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\node\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"npm\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"nodejs\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"nodejs\node.exe")
            });

            // Check PATH environment variable
            try
            {
                string pathEnv = Environment.GetEnvironmentVariable("PATH");
                if (!string.IsNullOrEmpty(pathEnv))
                {
                    string[] paths = pathEnv.Split(';');
                    foreach (string p in paths)
                    {
                        if (string.IsNullOrWhiteSpace(p)) continue;
                        try
                        {
                            string testPath = Path.Combine(p.Trim(), "node.exe");
                            if (File.Exists(testPath)) candidates.Add(testPath);
                        }
                        catch { }
                    }
                }
            }
            catch { }

            foreach (string p in candidates)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
            }

            return "node.exe";
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
        private string projectDir;
        private Icon formIcon;
        private Action<Process> onReadyCallback;
        private Process spawnedServerProcess;
        private System.Windows.Forms.Timer animTimer;
        private int animFrame = 0;
        private Image logoImage;

        public SplashForm(string pDir, Icon icon, Action<Process> onReady)
        {
            this.projectDir = pDir;
            this.formIcon = icon;
            this.onReadyCallback = onReady;

            this.Text = "GetPOS Kafe";
            this.Icon = icon;
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Size = new Size(520, 270);
            this.BackColor = Color.FromArgb(11, 19, 43); // Deep luxury slate navy
            this.DoubleBuffered = true;

            // Load logo image from assets / public if available
            try
            {
                string logoPath = Path.Combine(projectDir, "getkafe", "client", "public", "getpos-kafe-logo.png");
                if (!File.Exists(logoPath))
                    logoPath = Path.Combine(projectDir, "client", "public", "getpos-kafe-logo.png");
                if (!File.Exists(logoPath))
                    logoPath = Path.Combine(projectDir, "assets", "GetPOS_Kafe_Logo.png");

                if (File.Exists(logoPath))
                {
                    logoImage = Image.FromFile(logoPath);
                }
                else if (formIcon != null)
                {
                    logoImage = formIcon.ToBitmap();
                }
            }
            catch
            {
                if (formIcon != null) logoImage = formIcon.ToBitmap();
            }

            // Status Label
            lblStatus = new Label();
            lblStatus.Text = "Kassa tizimi tayyorlanmoqda...";
            lblStatus.Font = new Font("Segoe UI", 10.5f, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(241, 245, 249);
            lblStatus.Location = new Point(35, 150);
            lblStatus.Size = new Size(450, 24);
            lblStatus.BackColor = Color.Transparent;
            this.Controls.Add(lblStatus);

            // Animation Timer for smooth custom progress bar
            animTimer = new System.Windows.Forms.Timer();
            animTimer.Interval = 25;
            animTimer.Tick += (s, e) =>
            {
                animFrame = (animFrame + 4) % (this.Width + 120);
                this.Invalidate(new Rectangle(35, 180, 450, 16));
            };
            animTimer.Start();

            this.Paint += SplashForm_Paint;

            Thread worker = new Thread(StartKafePOSProcess);
            worker.IsBackground = true;
            worker.Start();
        }

        private void SplashForm_Paint(object sender, PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            // 1. Background gradient
            using (LinearGradientBrush bgBrush = new LinearGradientBrush(
                this.ClientRectangle,
                Color.FromArgb(11, 19, 43),
                Color.FromArgb(15, 23, 42),
                90f))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            // 2. Modern subtle border with accent top glow line
            using (Pen borderPen = new Pen(Color.FromArgb(30, 41, 59), 1.5f))
            {
                g.DrawRectangle(borderPen, 1, 1, this.Width - 2, this.Height - 2);
            }
            using (LinearGradientBrush topGlow = new LinearGradientBrush(
                new Rectangle(0, 0, this.Width, 3),
                Color.FromArgb(245, 158, 11),
                Color.FromArgb(59, 130, 246),
                0f))
            {
                g.FillRectangle(topGlow, 0, 0, this.Width, 3);
            }

            // 3. Draw Logo Box on the left
            int logoBoxX = 35;
            int logoBoxY = 32;
            int logoBoxSize = 62;

            using (GraphicsPath path = RoundedRect(new Rectangle(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize), 12))
            {
                using (SolidBrush boxBg = new SolidBrush(Color.FromArgb(20, 30, 55)))
                {
                    g.FillPath(boxBg, path);
                }
                using (Pen boxBorder = new Pen(Color.FromArgb(245, 158, 11), 1.5f))
                {
                    g.DrawPath(boxBorder, path);
                }
            }

            if (logoImage != null)
            {
                g.DrawImage(logoImage, logoBoxX + 6, logoBoxY + 6, logoBoxSize - 12, logoBoxSize - 12);
            }

            // 4. Header Titles (GetPOS Kafe)
            int titleX = logoBoxX + logoBoxSize + 16;
            using (Font fontGet = new Font("Segoe UI", 21f, FontStyle.Bold))
            using (Font fontPos = new Font("Segoe UI", 21f, FontStyle.Bold))
            using (Font fontKafe = new Font("Segoe UI", 21f, FontStyle.Bold))
            using (SolidBrush brushWhite = new SolidBrush(Color.White))
            using (SolidBrush brushBlue = new SolidBrush(Color.FromArgb(59, 130, 246)))
            using (SolidBrush brushAmber = new SolidBrush(Color.FromArgb(245, 158, 11)))
            {
                g.DrawString("Get", fontGet, brushWhite, titleX, logoBoxY - 2);
                SizeF szGet = g.MeasureString("Get", fontGet);
                g.DrawString("POS", fontPos, brushBlue, titleX + szGet.Width - 6, logoBoxY - 2);
                SizeF szPos = g.MeasureString("POS", fontPos);
                g.DrawString(" Kafe", fontKafe, brushAmber, titleX + szGet.Width + szPos.Width - 14, logoBoxY - 2);
            }

            // 5. Subtitle & Feature pills (NO JetBot)
            using (Font subFont = new Font("Segoe UI", 9.5f, FontStyle.Regular))
            using (SolidBrush subBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("Kafe & Restoran Avtomatlashtirish Tizimi", subFont, subBrush, titleX, logoBoxY + 36);
            }

            using (Font tagFont = new Font("Segoe UI", 8f, FontStyle.Regular))
            using (SolidBrush tagBrush = new SolidBrush(Color.FromArgb(100, 116, 139)))
            {
                g.DrawString("⚡ Touch Kassa   •   🖨️ Chek Printer   •   📱 Ofitsiant   •   🧾 Soliq OFD", tagFont, tagBrush, 35, 112);
            }

            // 6. Custom Modern Progress Bar
            int barX = 35;
            int barY = 184;
            int barWidth = 450;
            int barHeight = 8;

            // Track (background)
            using (GraphicsPath trackPath = RoundedRect(new Rectangle(barX, barY, barWidth, barHeight), 4))
            {
                using (SolidBrush trackBrush = new SolidBrush(Color.FromArgb(30, 41, 59)))
                {
                    g.FillPath(trackBrush, trackPath);
                }
            }

            // Animated Moving Shimmer Pill
            int pillWidth = 140;
            int pillX = barX + (animFrame % (barWidth + pillWidth)) - pillWidth;

            Rectangle fillRect = new Rectangle(pillX, barY, pillWidth, barHeight);
            Rectangle clipRect = new Rectangle(barX, barY, barWidth, barHeight);

            GraphicsState state = g.Save();
            using (GraphicsPath clipPath = RoundedRect(clipRect, 4))
            {
                g.SetClip(clipPath);
                if (fillRect.Right > barX && fillRect.Left < barX + barWidth)
                {
                    using (LinearGradientBrush pillBrush = new LinearGradientBrush(
                        fillRect,
                        Color.FromArgb(245, 158, 11), // amber-500
                        Color.FromArgb(234, 88, 12),  // orange-600
                        0f))
                    {
                        g.FillRectangle(pillBrush, fillRect);
                    }
                }
            }
            g.Restore(state);

            // 7. Footer text
            using (Font verFont = new Font("Segoe UI", 8.2f, FontStyle.Regular))
            using (SolidBrush verBrush = new SolidBrush(Color.FromArgb(100, 116, 139)))
            {
                g.DrawString("GetPOS Kafe Edition v3.0", verFont, verBrush, 35, 228);
                string copyText = "© GetPOS Cloud System";
                SizeF szCopy = g.MeasureString(copyText, verFont);
                g.DrawString(copyText, verFont, verBrush, this.Width - 35 - szCopy.Width, 228);
            }
        }

        private static GraphicsPath RoundedRect(Rectangle bounds, int radius)
        {
            int diameter = radius * 2;
            Size size = new Size(diameter, diameter);
            Rectangle arc = new Rectangle(bounds.Location, size);
            GraphicsPath path = new GraphicsPath();

            if (radius == 0)
            {
                path.AddRectangle(bounds);
                return path;
            }

            path.AddArc(arc, 180, 90);
            arc.X = bounds.Right - diameter;
            path.AddArc(arc, 270, 90);
            arc.Y = bounds.Bottom - diameter;
            path.AddArc(arc, 0, 90);
            arc.X = bounds.Left;
            path.AddArc(arc, 90, 90);
            path.CloseFigure();
            return path;
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
                if (!File.Exists(serverJs))
                {
                    string altJs = Path.Combine(projectDir, "getkafe", "server", "index.js");
                    if (File.Exists(altJs))
                    {
                        serverJs = altJs;
                        projectDir = Path.Combine(projectDir, "getkafe");
                    }
                }

                if (File.Exists(serverJs))
                {
                    string nodeExe = PosApplicationContext.FindNodeExecutable(projectDir);
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.WorkingDirectory = projectDir;
                    psi.FileName = nodeExe;
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
                        try
                        {
                            psi.FileName = "cmd.exe";
                            psi.Arguments = "/c node \"" + serverJs + "\"";
                            spawnedServerProcess = Process.Start(psi);
                        }
                        catch { }
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
                        "KafePOS lokal serverini ishga tushirishda xatolik yuz berdi.\n\n" +
                        "Dastur mustaqil ishlashi uchun to'liq o'rnatuvchi (GetPOS_Kafe_Setup.exe) orqali o'rnatilishi yoki 'node.exe' dastur papkasida mavjud bo'lishi kerak.",
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

            if (animTimer != null)
            {
                animTimer.Stop();
                animTimer.Dispose();
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
