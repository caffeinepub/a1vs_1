import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order, StatementEntry } from "../backend.d";

function formatDate(timestamp: bigint | number): string {
  const ms = typeof timestamp === "bigint" ? Number(timestamp) / 1_000_000 : timestamp;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toFixed(2)}`;
}

export function generateInvoicePDF(
  order: Order,
  customerInfo?: { name?: string; gstNumber?: string }
): void {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(34, 85, 45);
  doc.rect(0, 0, pageW, 40, "F");

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("A1VS", 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("AONE VEGETABLES & SUPPLIER", 14, 24);

  // Invoice / PO label
  const isInvoice = order.status === "delivered" && !!order.invoiceNumber;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(isInvoice ? "INVOICE" : "PURCHASE ORDER", pageW - 14, 16, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (isInvoice && order.invoiceNumber) {
    doc.text(`Invoice #: ${order.invoiceNumber}`, pageW - 14, 24, { align: "right" });
  } else {
    doc.text(`PO #: ${order.poNumber}`, pageW - 14, 24, { align: "right" });
  }
  doc.text(`Date: ${formatDate(order.timestamp)}`, pageW - 14, 32, { align: "right" });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Billing info
  let yPos = 52;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 14, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.text(order.companyName, 14, yPos);
  yPos += 5;
  doc.text(order.address, 14, yPos);
  yPos += 5;
  if (order.gstNumber) {
    doc.text(`GST: ${order.gstNumber}`, 14, yPos);
    yPos += 5;
  }
  doc.text(`Store #: ${order.storeNumber}`, 14, yPos);
  yPos += 5;
  doc.text(`Payment: ${order.paymentMethod === "cod" ? "Cash on Delivery" : "Pay Later"}`, 14, yPos);

  // Items table
  yPos += 12;
  const tableData = order.items.map((item, idx) => [
    idx + 1,
    item.productName,
    item.unit,
    Number(item.qty),
    formatCurrency(item.rate),
    formatCurrency(Number(item.qty) * item.rate),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Product", "Unit", "Qty", "Rate", "Amount"]],
    body: tableData,
    headStyles: { fillColor: [34, 85, 45], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 60 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: { fillColor: [245, 250, 245] },
  });

  // Total
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFillColor(34, 85, 45);
  doc.rect(pageW - 80, finalY - 4, 66, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", pageW - 66, finalY + 3);
  doc.text(formatCurrency(order.totalAmount), pageW - 14, finalY + 3, { align: "right" });
  doc.setTextColor(0, 0, 0);

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Thank you for your business! - AONE VEGETABLES & SUPPLIER", pageW / 2, finalY + 22, { align: "center" });

  const fileName = isInvoice
    ? `Invoice_${order.invoiceNumber}_${order.storeNumber}.pdf`
    : `PO_${order.poNumber}_${order.storeNumber}.pdf`;

  doc.save(fileName);
}

export function generateStatementPDF(
  entries: StatementEntry[],
  customerName: string,
  companyName: string,
  period: string,
  closingBalance: number,
  storeNumber?: string
): void {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(34, 85, 45);
  doc.rect(0, 0, pageW, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("A1VS", 14, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("AONE VEGETABLES & SUPPLIER", 14, 21);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("ACCOUNT STATEMENT", pageW - 14, 14, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${period}`, pageW - 14, 21, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // Customer info
  let yPos = 46;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ACCOUNT:", 14, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(companyName || customerName, 14, yPos + 6);
  if (storeNumber) {
    doc.text(`Store #: ${storeNumber}`, 14, yPos + 12);
  }

  // Running balance table
  let balance = 0;
  const tableData = entries.map((entry) => {
    balance += entry.debit - entry.credit;
    const dateMs = Number(entry.entryDate) / 1_000_000;
    return [
      new Date(dateMs).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      entry.entryType,
      entry.referenceNumber,
      entry.debit > 0 ? formatCurrency(entry.debit) : "-",
      entry.credit > 0 ? formatCurrency(entry.credit) : "-",
      formatCurrency(balance),
    ];
  });

  autoTable(doc, {
    startY: yPos + 18,
    head: [["Date", "Type", "Reference", "Debit (Rs.)", "Credit (Rs.)", "Balance (Rs.)"]],
    body: tableData,
    headStyles: { fillColor: [34, 85, 45], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 28 },
      2: { cellWidth: 36 },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 32, halign: "right" },
    },
    alternateRowStyles: { fillColor: [245, 250, 245] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Closing balance box
  doc.setFillColor(34, 85, 45);
  doc.rect(pageW - 90, finalY - 4, 76, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CLOSING BALANCE:", pageW - 74, finalY + 3);
  doc.text(formatCurrency(closingBalance), pageW - 14, finalY + 3, { align: "right" });
  doc.setTextColor(0, 0, 0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("This is a computer-generated statement. - AONE VEGETABLES & SUPPLIER", pageW / 2, finalY + 22, { align: "center" });

  const safeCompany = (companyName || customerName).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
  doc.save(`Statement_${safeCompany}_${period.replace(/\s/g, "_")}.pdf`);
}
