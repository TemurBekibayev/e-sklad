using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

namespace KafePOS.Printer
{
    public class ReceiptItem
    {
        public string product_name { get; set; }
        public int quantity { get; set; }
        public double price { get; set; }
        public string mxik_code { get; set; }
        public string package_code { get; set; }
        public int vat_percent { get; set; }
        public string comment { get; set; }
    }

    public class CompanyInfo
    {
        public string name { get; set; }
        public string inn { get; set; }
        public string terminalId { get; set; }
        public string fiscalModuleId { get; set; }
        public string address { get; set; }
    }

    public class ReceiptData
    {
        public string paymentId { get; set; }
        public int receiptSeq { get; set; }
        public CompanyInfo company { get; set; }
        public string orderId { get; set; }
        public string tableNumber { get; set; }
        public string waiterName { get; set; }
        public double totalAmount { get; set; }
        public double vatAmount { get; set; }
        public string paymentMethod { get; set; }
        public double cashAmount { get; set; }
        public double cardAmount { get; set; }
        public string fiscalSign { get; set; }
        public string fiscalQrUrl { get; set; }
        public string qrImageBase64 { get; set; }
        public string date { get; set; }
        public object isSynced { get; set; }
        public object isOnline { get; set; }
        public bool IsSyncedBool
        {
            get
            {
                if (isSynced == null) return true;
                if (isSynced is bool) return (bool)isSynced;
                if (isSynced is int) return (int)isSynced != 0;
                string s = isSynced.ToString().Trim().ToLowerInvariant();
                return s == "1" || s == "true";
            }
        }
        public List<ReceiptItem> items { get; set; }
        
        // Print config options
        public string printerName { get; set; }
        public string paperWidth { get; set; } // "80mm" or "58mm"
        public string headerTitle { get; set; }
        public string headerAddress { get; set; }
        public string footerText { get; set; }
        public object autoCut { get; set; }
    }

    public class KitchenTicketData
    {
        public string orderId { get; set; }
        public string tableNumber { get; set; }
        public string waiterName { get; set; }
        public string hallName { get; set; }
        public string workshop { get; set; } // 'Oshxona' or 'Bar'
        public string type { get; set; } // 'order' or 'cancellation'
        public List<ReceiptItem> items { get; set; }
        public string timestamp { get; set; }
        public string printerName { get; set; }
        public string paperWidth { get; set; }
    }

    class Program
    {
        static int Main(string[] args)
        {
            if (args.Length == 0)
            {
                PrintUsage();
                return 0;
            }

            string command = args[0].ToLowerInvariant();
            try
            {
                if (command == "list" || command == "list-printers")
                {
                    ListPrinters();
                    return 0;
                }
                else if (command == "print-receipt" && args.Length > 1)
                {
                    string jsonFile = args[1];
                    if (!File.Exists(jsonFile))
                    {
                        Console.Error.WriteLine("Error: JSON file not found: " + jsonFile);
                        return 1;
                    }
                    string json = File.ReadAllText(jsonFile, Encoding.UTF8);
                    PrintReceipt(json);
                    return 0;
                }
                else if (command == "print-kitchen" && args.Length > 1)
                {
                    string jsonFile = args[1];
                    if (!File.Exists(jsonFile))
                    {
                        Console.Error.WriteLine("Error: JSON file not found: " + jsonFile);
                        return 1;
                    }
                    string json = File.ReadAllText(jsonFile, Encoding.UTF8);
                    PrintKitchenTicket(json);
                    return 0;
                }
                else if (command == "test")
                {
                    string targetPrinter = args.Length > 1 ? args[1] : null;
                    string paperWidth = args.Length > 2 ? args[2] : "80mm";
                    PrintTestReceipt(targetPrinter, paperWidth);
                    return 0;
                }
                else
                {
                    PrintUsage();
                    return 1;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Error: " + ex.Message + "\n" + ex.StackTrace);
                return 2;
            }
        }

        static void PrintUsage()
        {
            Console.WriteLine("KafePOS Thermal Receipt PrintHelper");
            Console.WriteLine("Usage:");
            Console.WriteLine("  PrintHelper.exe list-printers");
            Console.WriteLine("  PrintHelper.exe print-receipt <receipt_json_file>");
            Console.WriteLine("  PrintHelper.exe print-kitchen <kitchen_json_file>");
            Console.WriteLine("  PrintHelper.exe test [printer_name] [80mm|58mm]");
        }

        static void ListPrinters()
        {
            var serializer = new JavaScriptSerializer();
            var printerList = new List<object>();

            PrinterSettings settings = new PrinterSettings();
            string defaultPrinter = settings.PrinterName;

            foreach (string printer in PrinterSettings.InstalledPrinters)
            {
                printerList.Add(new
                {
                    name = printer,
                    isDefault = string.Equals(printer, defaultPrinter, StringComparison.OrdinalIgnoreCase)
                });
            }

            Console.WriteLine(serializer.Serialize(printerList));
        }

        static void ConfigurePrinterForSilentOutput(PrintDocument pd)
        {
            pd.PrintController = new StandardPrintController(); // suppresses print dialog
            pd.DefaultPageSettings.Margins = new Margins(5, 5, 5, 5);

            // If virtual PDF printer, print directly to a temporary PDF file so no Save As dialog blocks
            string pName = pd.PrinterSettings.PrinterName ?? "";
            if (pName.IndexOf("PDF", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                string outDir = Path.Combine(Path.GetTempPath(), "KafePOS_Receipts");
                if (!Directory.Exists(outDir)) Directory.CreateDirectory(outDir);
                string pdfFile = Path.Combine(outDir, string.Format("receipt_{0:yyyyMMdd_HHmmss}.pdf", DateTime.Now));
                pd.PrinterSettings.PrintToFile = true;
                pd.PrinterSettings.PrintFileName = pdfFile;
            }
        }

        static void PrintReceipt(string json)
        {
            var serializer = new JavaScriptSerializer();
            ReceiptData data = serializer.Deserialize<ReceiptData>(json);
            if (data == null)
            {
                throw new Exception("Invalid receipt JSON payload");
            }

            PrintDocument pd = new PrintDocument();
            if (!string.IsNullOrEmpty(data.printerName))
            {
                pd.PrinterSettings.PrinterName = data.printerName;
            }

            if (!pd.PrinterSettings.IsValid)
            {
                throw new Exception("Printer not valid or not installed: " + pd.PrinterSettings.PrinterName);
            }

            ConfigurePrinterForSilentOutput(pd);

            pd.PrintPage += (sender, e) =>
            {
                DrawReceipt(e.Graphics, data);
            };

            pd.Print();
            Console.WriteLine("SUCCESS: Receipt printed to " + pd.PrinterSettings.PrinterName);
        }

        static void PrintKitchenTicket(string json)
        {
            var serializer = new JavaScriptSerializer();
            KitchenTicketData data = serializer.Deserialize<KitchenTicketData>(json);
            if (data == null)
            {
                throw new Exception("Invalid kitchen ticket JSON payload");
            }

            PrintDocument pd = new PrintDocument();
            if (!string.IsNullOrEmpty(data.printerName))
            {
                pd.PrinterSettings.PrinterName = data.printerName;
            }

            if (!pd.PrinterSettings.IsValid)
            {
                throw new Exception("Printer not valid or not installed: " + pd.PrinterSettings.PrinterName);
            }

            ConfigurePrinterForSilentOutput(pd);

            pd.PrintPage += (sender, e) =>
            {
                DrawKitchenTicket(e.Graphics, data);
            };

            pd.Print();
            Console.WriteLine("SUCCESS: Kitchen ticket printed to " + pd.PrinterSettings.PrinterName);
        }

        static void PrintTestReceipt(string printerName, string paperWidth)
        {
            ReceiptData testData = new ReceiptData
            {
                printerName = printerName,
                paperWidth = paperWidth,
                receiptSeq = 9999,
                date = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                company = new CompanyInfo
                {
                    name = "GETPOS KAFE (TEST CHEKI)",
                    inn = "307849201",
                    terminalId = "EP108492",
                    fiscalModuleId = "FM99882211",
                    address = "Toshkent sh., Chilonzor 9"
                },
                tableNumber = "TEST-STOL",
                waiterName = "Administrator",
                paymentMethod = "cash",
                totalAmount = 85000,
                vatAmount = 9107,
                fiscalSign = "778899112233",
                fiscalQrUrl = "https://ofd.soliq.uz/check?t=EP108492&r=9999&c=1757891230000&s=85000&f=778899112233",
                isSynced = true,
                items = new List<ReceiptItem>
                {
                    new ReceiptItem { product_name = "Osh (Choyxona)", quantity = 1, price = 40000, mxik_code = "10701001001000000", package_code = "796", vat_percent = 12 },
                    new ReceiptItem { product_name = "Chuchvara sho'rva", quantity = 1, price = 35000, mxik_code = "10701001002000000", package_code = "796", vat_percent = 12 },
                    new ReceiptItem { product_name = "Ko'k choy (choynak)", quantity = 2, price = 5000, mxik_code = "10702001001000000", package_code = "796", vat_percent = 12 }
                }
            };

            PrintDocument pd = new PrintDocument();
            if (!string.IsNullOrEmpty(printerName))
            {
                pd.PrinterSettings.PrinterName = printerName;
            }
            ConfigurePrinterForSilentOutput(pd);

            pd.PrintPage += (sender, e) =>
            {
                DrawReceipt(e.Graphics, testData);
            };

            pd.Print();
            Console.WriteLine("SUCCESS: Test receipt printed to " + pd.PrinterSettings.PrinterName);
        }

        static void DrawReceipt(Graphics g, ReceiptData r)
        {
            bool is58mm = (r.paperWidth == "58mm");
            float printableWidth = is58mm ? 195f : 280f;

            Font fontTitle = new Font("Segoe UI", is58mm ? 10f : 12f, FontStyle.Bold);
            Font fontHeader = new Font("Segoe UI", is58mm ? 7.5f : 8.5f, FontStyle.Regular);
            Font fontBold = new Font("Segoe UI", is58mm ? 7.5f : 8.5f, FontStyle.Bold);
            Font fontRegular = new Font("Segoe UI", is58mm ? 7.5f : 8.5f, FontStyle.Regular);
            Font fontSmall = new Font("Segoe UI", is58mm ? 6.5f : 7.5f, FontStyle.Regular);
            Font fontTotal = new Font("Segoe UI", is58mm ? 10f : 12f, FontStyle.Bold);

            Brush brush = Brushes.Black;
            Pen dashedPen = new Pen(Color.Black, 1f) { DashStyle = DashStyle.Dash };

            float y = 5;

            Action<string, Font> drawCenter = (text, font) =>
            {
                if (string.IsNullOrEmpty(text)) return;
                SizeF size = g.MeasureString(text, font, (int)printableWidth);
                RectangleF rect = new RectangleF((printableWidth - size.Width) / 2, y, size.Width, size.Height);
                g.DrawString(text, font, brush, rect);
                y += size.Height;
            };

            Action<string, string, Font> drawTwoCols = (left, right, font) =>
            {
                SizeF rightSize = g.MeasureString(right, font);
                float rightX = printableWidth - rightSize.Width;
                g.DrawString(left, font, brush, 0, y);
                g.DrawString(right, font, brush, rightX, y);
                SizeF leftSize = g.MeasureString(left, font);
                y += Math.Max(leftSize.Height, rightSize.Height);
            };

            Action drawDivider = () =>
            {
                y += 4;
                g.DrawLine(dashedPen, 0, y, printableWidth, y);
                y += 5;
            };

            // 1. Company Header
            string compName = (r.company != null && !string.IsNullOrEmpty(r.company.name)) ? r.company.name : (r.headerTitle ?? "GETPOS KAFE");
            drawCenter(compName, fontTitle);

            string compAddr = (r.company != null && !string.IsNullOrEmpty(r.company.address)) ? r.company.address : (r.headerAddress ?? "Toshkent shahar");
            drawCenter(compAddr, fontHeader);

            if (r.company != null)
            {
                string innFm = "INN: " + (r.company.inn ?? "") + " | FM: " + (r.company.fiscalModuleId ?? "");
                drawCenter(innFm, fontHeader);
            }

            drawDivider();

            // 2. Receipt metadata
            string seqStr = "CHEK № " + (r.receiptSeq > 0 ? r.receiptSeq.ToString() : "1001");
            string timeStr = DateTime.Now.ToString("HH:mm:ss");
            if (!string.IsNullOrEmpty(r.date))
            {
                DateTime dt;
                if (DateTime.TryParse(r.date, out dt))
                {
                    timeStr = dt.ToString("HH:mm:ss");
                }
            }
            drawTwoCols(seqStr, timeStr, fontBold);

            string dateStr = "Sana: " + (string.IsNullOrEmpty(r.date) ? DateTime.Now.ToString("dd.MM.yyyy") : r.date.Split('T')[0]);
            string tableStr = !string.IsNullOrEmpty(r.tableNumber) ? ("Stol: " + r.tableNumber) : "";
            drawTwoCols(dateStr, tableStr, fontRegular);

            if (!string.IsNullOrEmpty(r.waiterName))
            {
                drawTwoCols("Ofitsiant: " + r.waiterName, "", fontRegular);
            }

            drawDivider();

            // 3. Items list
            drawTwoCols("NOMI / SONI", "JAMI (UZS)", fontBold);
            y += 2;

            if (r.items != null)
            {
                int idx = 1;
                foreach (var it in r.items)
                {
                    double itemTotal = it.price * it.quantity;
                    string itemHeader = string.Format("{0}. {1} x {2}", idx++, it.product_name, it.quantity);
                    string priceText = itemTotal.ToString("#,##0");
                    drawTwoCols(itemHeader, priceText, fontRegular);

                    if (!string.IsNullOrEmpty(it.mxik_code))
                    {
                        string mxikText = "MXIK: " + it.mxik_code + " | Qadoq: " + (it.package_code ?? "796") + " | QQS: " + it.vat_percent + "%";
                        g.DrawString(mxikText, fontSmall, Brushes.DimGray, 5, y);
                        y += g.MeasureString(mxikText, fontSmall).Height;
                    }
                    y += 2;
                }
            }

            drawDivider();

            // 4. Totals
            drawTwoCols("JAMI TO'LOV:", r.totalAmount.ToString("#,##0") + " UZS", fontTotal);
            y += 2;

            if (r.vatAmount > 0)
            {
                drawTwoCols("Shu jumladan QQS (12%):", r.vatAmount.ToString("#,##0") + " UZS", fontRegular);
            }

            string payMethodText = "NAQD PUL";
            if (r.paymentMethod == "card") payMethodText = "PLASTIK KARTA (TERMINAL)";
            else if (r.paymentMethod == "split") payMethodText = "ARALASH (Naqd+Karta)";
            drawTwoCols("To'lov usuli:", payMethodText, fontBold);

            drawDivider();

            // 5. Fiscal & Soliq.uz Section
            drawCenter("DAVLAT SOLIQ QO'MITASI", fontBold);

            // Draw QR Code if image base64 provided
            if (!string.IsNullOrEmpty(r.qrImageBase64))
            {
                try
                {
                    string base64Data = r.qrImageBase64;
                    if (base64Data.Contains(","))
                    {
                        base64Data = base64Data.Substring(base64Data.IndexOf(",") + 1);
                    }
                    byte[] imageBytes = Convert.FromBase64String(base64Data);
                    using (MemoryStream ms = new MemoryStream(imageBytes))
                    {
                        using (Image qrImg = Image.FromStream(ms))
                        {
                            float qrSize = is58mm ? 100f : 130f;
                            float qrX = (printableWidth - qrSize) / 2;
                            g.DrawImage(qrImg, qrX, y + 5, qrSize, qrSize);
                            y += qrSize + 10;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine("QR render error: " + ex.Message);
                }
            }

            if (!string.IsNullOrEmpty(r.fiscalSign))
            {
                drawCenter("Fiskal belgi (ФП): " + r.fiscalSign, fontBold);
            }

            if (r.IsSyncedBool)
            {
                drawCenter("Soliq.uz ga muvaffaqiyatli yuborildi", fontSmall);
            }
            else
            {
                drawCenter("Oflayn chek (Soliqqa navbatga olindi)", fontSmall);
            }

            drawDivider();

            // 6. Footer
            string footer = !string.IsNullOrEmpty(r.footerText) ? r.footerText : "Haridingiz uchun rahmat! Xush kelibsiz!";
            drawCenter(footer, fontRegular);
            drawCenter("GetPOS Kafe v2.5", fontSmall);

            y += 20;
        }

        static void DrawKitchenTicket(Graphics g, KitchenTicketData k)
        {
            bool is58mm = (k.paperWidth == "58mm");
            float printableWidth = is58mm ? 195f : 280f;

            Font fontTitle = new Font("Segoe UI", is58mm ? 11f : 14f, FontStyle.Bold);
            Font fontBig = new Font("Segoe UI", is58mm ? 12f : 16f, FontStyle.Bold);
            Font fontBold = new Font("Segoe UI", is58mm ? 8.5f : 10f, FontStyle.Bold);
            Font fontRegular = new Font("Segoe UI", is58mm ? 8f : 9.5f, FontStyle.Regular);
            Font fontItalic = new Font("Segoe UI", is58mm ? 7.5f : 9f, FontStyle.Italic);

            Brush brush = Brushes.Black;
            Pen dashedPen = new Pen(Color.Black, 1.5f) { DashStyle = DashStyle.Dash };

            float y = 5;

            Action<string, Font> drawCenter = (text, font) =>
            {
                if (string.IsNullOrEmpty(text)) return;
                SizeF size = g.MeasureString(text, font, (int)printableWidth);
                RectangleF rect = new RectangleF((printableWidth - size.Width) / 2, y, size.Width, size.Height);
                g.DrawString(text, font, brush, rect);
                y += size.Height;
            };

            Action<string, string, Font> drawTwoCols = (left, right, font) =>
            {
                SizeF rightSize = g.MeasureString(right, font);
                float rightX = printableWidth - rightSize.Width;
                g.DrawString(left, font, brush, 0, y);
                g.DrawString(right, font, brush, rightX, y);
                SizeF leftSize = g.MeasureString(left, font);
                y += Math.Max(leftSize.Height, rightSize.Height);
            };

            Action drawDivider = () =>
            {
                y += 4;
                g.DrawLine(dashedPen, 0, y, printableWidth, y);
                y += 5;
            };

            bool isCancel = (k.type == "cancellation");

            if (isCancel)
            {
                drawCenter("!!! BEKOR QILISH (OTMENA) !!!", fontBig);
            }
            else
            {
                drawCenter("OSHXONA BUYURTMASI", fontTitle);
            }

            drawDivider();

            string stolText = "STOL: " + (k.tableNumber ?? "1") + (string.IsNullOrEmpty(k.hallName) ? "" : (" (" + k.hallName + ")"));
            drawCenter(stolText, fontBig);

            drawTwoCols("Ofitsiant: " + (k.waiterName ?? "Ofitsiant"), DateTime.Now.ToString("HH:mm:ss"), fontBold);
            
            drawDivider();

            drawTwoCols("TAOM NOMI", "SONI", fontBold);
            y += 3;

            if (k.items != null)
            {
                int idx = 1;
                foreach (var it in k.items)
                {
                    string qtyText = (it.quantity > 0 ? it.quantity.ToString() : (it.quantity).ToString()) + " ta";
                    drawTwoCols(string.Format("{0}. {1}", idx++, it.product_name), qtyText, fontBig);
                    if (!string.IsNullOrEmpty(it.comment))
                    {
                        g.DrawString("   >>> IZOH: " + it.comment, fontItalic, brush, 5, y);
                        y += g.MeasureString(it.comment, fontItalic).Height + 2;
                    }
                    y += 3;
                }
            }

            drawDivider();
            drawCenter(isCancel ? "TAOM CHIQARILMASIN!" : "ILTIMOS, TEZKOR TAYYORLANSIN!", fontBold);
            y += 20;
        }
    }
}
