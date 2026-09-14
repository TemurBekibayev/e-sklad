using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace KafePOS
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SplashForm());
        }
    }

    public class SplashForm : Form
    {
        private Label lblStatus;
        private Label lblTitle;
        private ProgressBar progressBar;
        private string projectDir;

        public SplashForm()
        {
            projectDir = AppDomain.CurrentDomain.BaseDirectory;
            if (!File.Exists(Path.Combine(projectDir, "server", "index.js")))
            {
                string currentDir = Directory.GetCurrentDirectory();
                if (File.Exists(Path.Combine(currentDir, "server", "index.js")))
                {
                    projectDir = currentDir;
                }
                else
                {
                    DirectoryInfo parentInfo = Directory.GetParent(projectDir);
                    string parent = parentInfo != null ? parentInfo.FullName : null;
                    if (!string.IsNullOrEmpty(parent) && File.Exists(Path.Combine(parent, "server", "index.js")))
                    {
                        projectDir = parent;
                    }
                }
            }

            // Form properties
            this.Text = "GetPOS Kafe - Touch Kassa & JetBot";
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Size = new Size(460, 220);
            this.BackColor = Color.FromArgb(15, 23, 42); // slate-900

            // Title
            lblTitle = new Label();
            lblTitle.Text = "GetPOS Kafe";
            lblTitle.Font = new Font("Segoe UI", 18, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(245, 158, 11); // amber-500
            lblTitle.Location = new Point(30, 30);
            lblTitle.AutoSize = true;
            this.Controls.Add(lblTitle);

            // Subtitle
            Label lblSub = new Label();
            lblSub.Text = "Touch Kassa • JetBot • Soliq.uz • Backend API";
            lblSub.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(148, 163, 184); // slate-400
            lblSub.Location = new Point(32, 68);
            lblSub.AutoSize = true;
            this.Controls.Add(lblSub);

            // Status Label
            lblStatus = new Label();
            lblStatus.Text = "Tizim holati tekshirilmoqda...";
            lblStatus.Font = new Font("Segoe UI", 10, FontStyle.Regular);
            lblStatus.ForeColor = Color.White;
            lblStatus.Location = new Point(32, 110);
            lblStatus.Size = new Size(400, 25);
            this.Controls.Add(lblStatus);

            // Progress Bar
            progressBar = new ProgressBar();
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 30;
            progressBar.Location = new Point(32, 145);
            progressBar.Size = new Size(396, 12);
            this.Controls.Add(progressBar);

            // Border styling
            this.Paint += (s, e) =>
            {
                using (Pen p = new Pen(Color.FromArgb(51, 65, 85), 2))
                {
                    e.Graphics.DrawRectangle(p, 1, 1, this.Width - 2, this.Height - 2);
                }
            };

            // Start worker thread
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
                    UpdateStatus("Server allaqachon faol! Kassa ochilmoqda...");
                    Thread.Sleep(300);
                    LaunchDesktopWindow();
                    return;
                }

                // 2. Docker mavjudligini tekshirish
                UpdateStatus("Docker xizmati tekshirilmoqda...");
                bool isDockerActive = CheckDockerRunning();

                if (isDockerActive && File.Exists(Path.Combine(projectDir, "docker-compose.yml")))
                {
                    UpdateStatus("Docker orqali KafePOS ko'tarilmoqda (docker compose)...");
                    RunProcess("docker", "compose up -d", projectDir);
                }
                else
                {
                    // Docker faol bo'lmasa, kassa to'xtab qolmasligi uchun darhol mahalliy dvigatel ishga tushadi
                    UpdateStatus("Mahalliy KafePOS dvigateli ishga tushirilmoqda...");
                    string serverJs = Path.Combine(projectDir, "server", "index.js");
                    RunProcess("node", "\"" + serverJs + "\"", projectDir, true);
                }

                // 3. Port 4000 javob berishini kutish
                UpdateStatus("Kassa tayyorlanmoqda...");
                bool ready = false;
                for (int i = 0; i < 30; i++)
                {
                    Thread.Sleep(1000);
                    if (IsServerAlive())
                    {
                        ready = true;
                        break;
                    }
                }

                if (ready)
                {
                    UpdateStatus("KafePOS Desktop oynasi ochilmoqda...");
                    Thread.Sleep(400);
                    LaunchDesktopWindow();
                }
                else
                {
                    MessageBox.Show("Serverni ishga tushirishda xatolik yuz berdi. Iltimos, Node.js yoki Docker holatini tekshiring.",
                        "KafePOS Xatosi", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    CloseForm();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Xatolik: " + ex.Message, "KafePOS", MessageBoxButtons.OK, MessageBoxIcon.Error);
                CloseForm();
            }
        }

        private bool IsServerAlive()
        {
            string[] testUrls = new string[] {
                "http://127.0.0.1:4000/api/status",
                "http://localhost:4000/api/status"
            };

            foreach (string url in testUrls)
            {
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                    req.Timeout = 1500;
                    req.Method = "GET";
                    using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                    {
                        if (res.StatusCode == HttpStatusCode.OK)
                        {
                            return true;
                        }
                    }
                }
                catch
                {
                    // Keyingi manzilni sinab ko'rish
                }
            }
            return false;
        }

        private bool CheckDockerRunning()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("docker", "info");
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                using (Process p = Process.Start(psi))
                {
                    if (p == null) return false;
                    if (!p.WaitForExit(2000))
                    {
                        try { p.Kill(); } catch { }
                        return false;
                    }
                    return p.ExitCode == 0;
                }
            }
            catch
            {
                return false;
            }
        }

        private void RunProcess(string filename, string args, string workingDir, bool noWait = false)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.WorkingDirectory = workingDir;
                if (noWait)
                {
                    psi.FileName = "cmd.exe";
                    psi.Arguments = "/c " + filename + " " + args;
                    psi.CreateNoWindow = true;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                    return;
                }

                psi.FileName = filename;
                psi.Arguments = args;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                Process p = Process.Start(psi);
                if (p != null)
                {
                    p.WaitForExit(15000);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("RunProcess error: " + ex.Message);
            }
        }

        private void LaunchDesktopWindow()
        {
            try
            {
                // Standalone Desktop App (Kiosk/App) rejimida ochish
                ProcessStartInfo psi = new ProcessStartInfo("msedge.exe", "--app=http://127.0.0.1:4000 --window-size=1280,850");
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch
            {
                // Fallback to default browser
                Process.Start("http://127.0.0.1:4000");
            }

            CloseForm();
        }

        private void CloseForm()
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action(CloseForm));
                return;
            }
            this.Close();
        }
    }
}
