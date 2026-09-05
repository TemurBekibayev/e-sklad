import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/basket_item.dart';
import '../models/transaction.dart';
import '../models/product.dart';

class PrinterService {
  static final PrinterService instance = PrinterService._();
  PrinterService._();

  // --- CHEK CHOP ETISH (PDF / PRINTER) ---
  Future<void> printOrShareReceipt(
    BuildContext context, {
    required TransactionModel transaction,
    required List<BasketItem> items,
  }) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Center(
                child: pw.Text(
                  'SotuvPro Tizimi',
                  style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
                ),
              ),
              pw.Center(
                child: pw.Text(
                  'Qurilish va Savdo Markazi',
                  style: const pw.TextStyle(fontSize: 10),
                ),
              ),
              pw.Divider(),
              pw.Text('Mijoz: ${transaction.clientName}', style: const pw.TextStyle(fontSize: 10)),
              pw.Text('Xodim: ${transaction.workerName}', style: const pw.TextStyle(fontSize: 10)),
              pw.Text('Sana: ${transaction.createdAt.toString().substring(0, 16)}', style: const pw.TextStyle(fontSize: 9)),
              pw.Text('Savdo ID: #${transaction.id.substring(0, 8)}', style: const pw.TextStyle(fontSize: 9)),
              pw.Divider(),
              pw.Text('MAHSULOTLAR:', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 4),
              ...items.map(
                (item) => pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 2),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Expanded(
                        child: pw.Text(
                          '${item.productName} (${item.quantity} ${item.saleUnit})',
                          style: const pw.TextStyle(fontSize: 9),
                        ),
                      ),
                      pw.Text(
                        '${(item.totalPrice).toStringAsFixed(0)} so\'m',
                        style: const pw.TextStyle(fontSize: 9),
                      ),
                    ],
                  ),
                ),
              ),
              pw.Divider(),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('JAMI SUMMA:', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                  pw.Text('${transaction.totalAmount.toStringAsFixed(0)} so\'m', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                ],
              ),
              pw.SizedBox(height: 2),
              pw.Text('To\'lov turi: ${transaction.paymentType.toUpperCase()}', style: const pw.TextStyle(fontSize: 9)),
              if (transaction.debtAmount > 0)
                pw.Text('Qarz summasi: ${transaction.debtAmount.toStringAsFixed(0)} so\'m', style: const pw.TextStyle(fontSize: 9)),
              pw.Divider(),
              pw.Center(
                child: pw.Text(
                  'Xaridingiz uchun rahmat!',
                  style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic),
                ),
              ),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Chek_${transaction.id.substring(0, 6)}.pdf',
    );
  }

  // --- YORLIQ / ETIKETKA CHOP ETISH (BARCODE / QR) ---
  Future<void> printOrShareProductLabel(
    BuildContext context, {
    required Product product,
  }) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: const PdfPageFormat(58 * PdfPageFormat.mm, 40 * PdfPageFormat.mm),
        build: (pw.Context context) {
          return pw.Container(
            padding: const pw.EdgeInsets.all(4),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              mainAxisAlignment: pw.MainAxisAlignment.center,
              children: [
                pw.Text(
                  product.name,
                  style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
                  textAlign: pw.TextAlign.center,
                  maxLines: 2,
                ),
                pw.SizedBox(height: 2),
                pw.Text(
                  'Narxi: ${product.price.toStringAsFixed(0)} so\'m / ${product.saleUnit}',
                  style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 4),
                pw.BarcodeWidget(
                  barcode: pw.Barcode.code128(),
                  data: product.barcode.isNotEmpty ? product.barcode : product.qrCode,
                  width: 140,
                  height: 35,
                  drawText: true,
                  textStyle: const pw.TextStyle(fontSize: 8),
                ),
              ],
            ),
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Yorliq_${product.name}.pdf',
    );
  }
}
