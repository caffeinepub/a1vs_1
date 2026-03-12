import type { Order } from "../backend.d";
import type { StatementEntry } from "../types/appTypes";
import { autoTable, newPDF } from "./pdfShim";

// ─── Company profile type ─────────────────────────────────────────────────────
export interface CompanyProfilePDF {
  logoBase64: string;
  gstNumber: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(timestamp: bigint | number): string {
  const ms =
    typeof timestamp === "bigint" ? Number(timestamp) / 1_000_000 : timestamp;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toFixed(2)}`;
}

// Converts a number to Indian English words (rupees + paise)
function amountToWords(amount: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 !== 0 ? ` ${ones[n % 10]}` : ""}`;
  }

  function threeDigits(n: number): string {
    if (n === 0) return "";
    if (n < 100) return twoDigits(n);
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 !== 0 ? ` ${twoDigits(n % 100)}` : ""}`;
  }

  function numberToWords(num: number): string {
    if (num === 0) return "Zero";
    let result = "";
    let remaining = num;
    if (remaining >= 10_00_00_000) {
      result += `${numberToWords(Math.floor(remaining / 10_00_00_000))} Arab `;
      remaining %= 10_00_00_000;
    }
    if (remaining >= 1_00_00_000) {
      result += `${numberToWords(Math.floor(remaining / 1_00_00_000))} Crore `;
      remaining %= 1_00_00_000;
    }
    if (remaining >= 1_00_000) {
      result += `${numberToWords(Math.floor(remaining / 1_00_000))} Lakh `;
      remaining %= 1_00_000;
    }
    if (remaining >= 1_000) {
      result += `${numberToWords(Math.floor(remaining / 1_000))} Thousand `;
      remaining %= 1_000;
    }
    if (remaining > 0) {
      result += threeDigits(remaining);
    }
    return result.trim();
  }

  const rupees = Math.floor(amount);
  const paiseRaw = Math.round((amount - rupees) * 100);
  const paise = Math.min(paiseRaw, 99);

  const paiseWords = paise > 0 ? ` and ${numberToWords(paise)} Paise` : "";
  return `Rupees ${numberToWords(rupees)}${paiseWords} Only`;
}

// ─── Per-page header (draws on current page) ──────────────────────────────────

function drawPageHeader(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  isInvoice: boolean,
  docNumber: string,
  dateStr: string,
  companyProfile?: CompanyProfilePDF,
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Light header background
  doc.setFillColor(247, 251, 247);
  doc.rect(0, 0, pageW, 36, "F");

  // Company logo or text block on the left
  let logoEndX = margin;
  if (companyProfile?.logoBase64) {
    try {
      doc.addImage(
        companyProfile.logoBase64,
        "PNG",
        margin,
        6,
        22,
        22,
        undefined,
        "FAST",
      );
      logoEndX = margin + 26;
    } catch {
      // Logo failed silently, continue with text
    }
  }

  // Company name
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 63, 35);
  doc.text("A-ONE VEGETABLES & SUPPLIERS", logoEndX, 14);

  // Company address from profile (if available)
  const address = companyProfile?.address || "Mumbai, Maharashtra, India";
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 120, 100);
  doc.text(address, logoEndX, 20, { maxWidth: 90 });

  if (companyProfile?.gstNumber) {
    doc.setFontSize(7);
    doc.text(`GSTIN: ${companyProfile.gstNumber}`, logoEndX, 28);
  }
  if (companyProfile?.contactPhone) {
    doc.setFontSize(7);
    doc.text(
      `Ph: ${companyProfile.contactPhone}`,
      logoEndX + (companyProfile.gstNumber ? 55 : 0),
      28,
    );
  }

  // Document type label on the right
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 63, 35);
  doc.text(isInvoice ? "INVOICE" : "PURCHASE ORDER", pageW - margin, 14, {
    align: "right",
  });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 80, 60);
  doc.text(docNumber, pageW - margin, 22, { align: "right" });
  doc.text(`Date: ${dateStr}`, pageW - margin, 29, { align: "right" });

  // Separator line
  doc.setDrawColor(180, 210, 180);
  doc.setLineWidth(0.4);
  doc.line(margin, 37, pageW - margin, 37);

  doc.setTextColor(0, 0, 0);
}

// ─── Per-page footer ───────────────────────────────────────────────────────────

function drawPageFooter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  pageNum: number,
  companyProfile?: CompanyProfilePDF,
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const footerY = pageH - 12;

  // Top rule for footer
  doc.setDrawColor(200, 220, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 140, 120);

  // Left: company name
  doc.text("A-ONE VEGETABLES & SUPPLIERS", margin, footerY);

  // Center: company address
  const footerAddress = companyProfile?.address || "Mumbai, Maharashtra, India";
  doc.text(footerAddress, pageW / 2, footerY, {
    align: "center",
    maxWidth: 90,
  });

  // Right: page number
  doc.text(`Page ${pageNum}`, pageW - margin, footerY, { align: "right" });

  doc.setTextColor(0, 0, 0);
}

// ─── Bill-to section ──────────────────────────────────────────────────────────

function drawBillTo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  order: Order,
  startY: number,
): number {
  const margin = 14;
  let yPos = startY;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("BILL TO:", margin, yPos);
  yPos += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(order.companyName, margin, yPos);
  yPos += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  // Wrap long addresses
  const pageW = doc.internal.pageSize.getWidth();
  const addrLines = doc.splitTextToSize(order.address, pageW - margin * 2 - 60);
  doc.text(addrLines, margin, yPos);
  yPos += addrLines.length * 5;

  if (order.gstNumber) {
    doc.text(`GST: ${order.gstNumber}`, margin, yPos);
    yPos += 5;
  }

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Store #: ${order.storeNumber}`, margin, yPos);
  yPos += 5;
  doc.text(
    `Payment: ${order.paymentMethod === "cod" ? "Cash on Delivery" : "Pay Later"}`,
    margin,
    yPos,
  );
  yPos += 6;

  return yPos;
}

// ─── Total + Amount in Words + Signatures block ───────────────────────────────

function drawTotalAndSignatures(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  order: Order,
  afterTableY: number,
  companyProfile?: CompanyProfilePDF,
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Estimate space needed for total block + signatures
  const neededHeight = 70; // total box + amount in words + signatures
  let yPos = afterTableY + 8;

  // If not enough space on this page, add a new page
  if (yPos + neededHeight > pageH - 25) {
    doc.addPage();
    const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
    const contInvNum = Array.isArray(order.invoiceNumber)
      ? order.invoiceNumber[0]
      : order.invoiceNumber;
    drawPageHeader(
      doc,
      true,
      contInvNum ? `Invoice #: ${contInvNum}` : `Invoice #: ${order.poNumber}`,
      formatDate(order.timestamp),
      companyProfile,
    );
    drawPageFooter(doc, currentPage, companyProfile);
    yPos = 46;
  }

  // ── Total box (right-aligned) ───────────────────────────────────────────────
  const boxW = 90;
  const boxX = pageW - margin - boxW;
  doc.setFillColor(22, 85, 45);
  doc.rect(boxX, yPos - 4, boxW, 11, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", boxX + 6, yPos + 3.5);
  doc.text(formatCurrency(order.totalAmount), pageW - margin, yPos + 3.5, {
    align: "right",
  });
  doc.setTextColor(0, 0, 0);

  yPos += 14;

  // ── Amount in Words ─────────────────────────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 70, 40);
  const words = amountToWords(order.totalAmount);
  const wordsLines = doc.splitTextToSize(
    `Amount in Words: ${words}`,
    pageW - margin * 2,
  );
  doc.text(wordsLines, margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  yPos += wordsLines.length * 5 + 12;

  // ── Signature section ────────────────────────────────────────────────────────
  const sigBlockY = yPos;

  // Left signature: Customer (with drawn signature or blank box)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text("Customer Signature:", margin, sigBlockY);

  if (order.deliverySignature) {
    try {
      doc.addImage(
        order.deliverySignature,
        "PNG",
        margin,
        sigBlockY + 3,
        62,
        24,
      );
    } catch {
      // Signature image failed silently
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.rect(margin, sigBlockY + 3, 62, 24);
    }
  } else {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(margin, sigBlockY + 3, 62, 24);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text("Customer Signature", margin, sigBlockY + 31);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Received on delivery", margin, sigBlockY + 36);
  // Show signed-at timestamp if available
  if (order.deliverySignedAt) {
    const signedMs = Number(order.deliverySignedAt) / 1_000_000;
    const signedStr = new Date(signedMs).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Signed: ${signedStr}`, margin, sigBlockY + 41);
  }

  // Right signature: Company stamp box
  const rightSigX = pageW - margin - 65;
  doc.setDrawColor(100, 150, 100);
  doc.setLineWidth(0.4);
  doc.rect(rightSigX, sigBlockY + 3, 65, 24);

  // "Stamp" watermark text in the box
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 200, 180);
  doc.text("Company Stamp", rightSigX + 32, sigBlockY + 17, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text("For A-One Vegetables & Suppliers", rightSigX, sigBlockY + 31);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Authorised Signatory", rightSigX, sigBlockY + 36);

  doc.setTextColor(0, 0, 0);
}

// ─── Core PDF builder ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildInvoicePDF(
  order: Order,
  companyProfile?: CompanyProfilePDF,
): any {
  const doc = newPDF({ format: "a4", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  const rawInvNum = Array.isArray(order.invoiceNumber)
    ? order.invoiceNumber[0]
    : order.invoiceNumber;
  const isInvoice = true;
  const docNumber = rawInvNum
    ? `Invoice #: ${rawInvNum}`
    : `Invoice #: ${order.poNumber}`;
  const dateStr = formatDate(order.timestamp);

  // Page 1 header
  drawPageHeader(doc, isInvoice, docNumber, dateStr, companyProfile);
  // Page 1 footer (will be overwritten for multi-page by didDrawPage, but set here for page 1)
  drawPageFooter(doc, 1, companyProfile);

  // Bill To
  const billToEndY = drawBillTo(doc, order, 44);

  // Separator
  doc.setDrawColor(220, 235, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, billToEndY + 2, pageW - margin, billToEndY + 2);

  // Items table
  const tableData = order.items.map((item, idx) => [
    idx + 1,
    item.productName,
    item.unit,
    Number(item.qty),
    `Rs. ${item.rate.toFixed(2)}`,
    `Rs. ${(Number(item.qty) * item.rate).toFixed(2)}`,
  ]);

  let pageCounter = 1;

  autoTable(doc, {
    startY: billToEndY + 6,
    head: [["#", "Product Name", "Unit", "Qty", "Rate", "Amount"]],
    body: tableData,
    margin: { left: margin, right: margin },
    tableWidth: "auto",
    headStyles: {
      fillColor: [22, 85, 45],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 3,
    },
    bodyStyles: { fontSize: 9, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [245, 251, 245] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 65 },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 24, halign: "right" },
    },
    didDrawPage: (data: { pageNumber: number }) => {
      pageCounter = data.pageNumber;
      if (data.pageNumber > 1) {
        // Re-draw header on continuation pages
        drawPageHeader(doc, isInvoice, docNumber, dateStr, companyProfile);
      }
      // Draw footer on every page
      drawPageFooter(doc, data.pageNumber, companyProfile);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY as number;

  // Draw total + amount in words + signatures
  drawTotalAndSignatures(doc, order, finalY, companyProfile);

  // Fix page counter — re-draw footers with correct page numbers if needed
  const totalPages = doc.internal.getNumberOfPages();
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawPageFooter(doc, i, companyProfile);
    }
  }

  // Suppress unused variable warning
  void pageCounter;

  return doc;
}

// ─── Statement PDF builder ────────────────────────────────────────────────────

function buildStatementPDF(
  entries: StatementEntry[],
  customerName: string,
  companyName: string,
  period: string,
  closingBalance: number,
  storeNumber?: string,
  companyProfile?: CompanyProfilePDF,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const doc = newPDF({ format: "a4", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFillColor(247, 251, 247);
  doc.rect(0, 0, pageW, 36, "F");

  // Logo
  let logoEndX = margin;
  if (companyProfile?.logoBase64) {
    try {
      doc.addImage(
        companyProfile.logoBase64,
        "PNG",
        margin,
        6,
        22,
        22,
        undefined,
        "FAST",
      );
      logoEndX = margin + 26;
    } catch {
      // Logo failed silently
    }
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 63, 35);
  doc.text("A-ONE VEGETABLES & SUPPLIERS", logoEndX, 14);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 120, 100);
  const hAddress = companyProfile?.address || "Mumbai, Maharashtra, India";
  doc.text(hAddress, logoEndX, 20, { maxWidth: 90 });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 63, 35);
  doc.text("ACCOUNT STATEMENT", pageW - margin, 14, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 80, 60);
  doc.text(`Period: ${period}`, pageW - margin, 22, { align: "right" });

  doc.setDrawColor(180, 210, 180);
  doc.setLineWidth(0.4);
  doc.line(margin, 37, pageW - margin, 37);
  doc.setTextColor(0, 0, 0);

  // Customer info block
  let yPos = 44;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ACCOUNT:", margin, yPos);
  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(companyName || customerName, margin, yPos);
  yPos += 5.5;

  if (storeNumber) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Store #: ${storeNumber}`, margin, yPos);
    yPos += 5;
  }

  // Running balance calculation
  let balance = 0;
  const tableData = entries.map((entry) => {
    balance += entry.debit - entry.credit;
    const dateMs = Number(entry.entryDate) / 1_000_000;
    return [
      new Date(dateMs).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      entry.entryType,
      entry.referenceNumber,
      entry.debit > 0 ? formatCurrency(entry.debit) : "-",
      entry.credit > 0 ? formatCurrency(entry.credit) : "-",
      formatCurrency(balance),
    ];
  });

  autoTable(doc, {
    startY: yPos + 4,
    head: [
      [
        "Date",
        "Type",
        "Reference",
        "Debit (Rs.)",
        "Credit (Rs.)",
        "Balance (Rs.)",
      ],
    ],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [22, 85, 45],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [245, 251, 245] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 28 },
      2: { cellWidth: 36 },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 32, halign: "right" },
    },
    didDrawPage: (data: { pageNumber: number }) => {
      // Re-draw header for pages > 1
      if (data.pageNumber > 1) {
        doc.setFillColor(247, 251, 247);
        doc.rect(0, 0, pageW, 36, "F");

        let lX = margin;
        if (companyProfile?.logoBase64) {
          try {
            doc.addImage(
              companyProfile.logoBase64,
              "PNG",
              margin,
              6,
              22,
              22,
              undefined,
              "FAST",
            );
            lX = margin + 26;
          } catch {
            /* silent */
          }
        }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 63, 35);
        doc.text("A-ONE VEGETABLES & SUPPLIERS", lX, 14);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("ACCOUNT STATEMENT (contd.)", pageW - margin, 14, {
          align: "right",
        });
        doc.setDrawColor(180, 210, 180);
        doc.setLineWidth(0.4);
        doc.line(margin, 37, pageW - margin, 37);
        doc.setTextColor(0, 0, 0);
      }
      // Footer
      const pageH = doc.internal.pageSize.getHeight();
      const footerY = pageH - 12;
      doc.setDrawColor(200, 220, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 140, 120);
      doc.text("A-ONE VEGETABLES & SUPPLIERS", margin, footerY);
      doc.text(hAddress, pageW / 2, footerY, {
        align: "center",
        maxWidth: 90,
      });
      doc.text(`Page ${data.pageNumber}`, pageW - margin, footerY, {
        align: "right",
      });
      doc.setTextColor(0, 0, 0);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY as number;
  let cbY = finalY + 10;

  // Check if closing balance block fits
  const pageH = doc.internal.pageSize.getHeight();
  if (cbY + 50 > pageH - 20) {
    doc.addPage();
    cbY = 46;
  }

  // Closing balance box
  const boxW = 105;
  const boxX = pageW - margin - boxW;
  doc.setFillColor(22, 85, 45);
  doc.rect(boxX, cbY - 4, boxW, 11, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CLOSING BALANCE:", boxX + 6, cbY + 3.5);
  doc.text(formatCurrency(closingBalance), pageW - margin, cbY + 3.5, {
    align: "right",
  });
  doc.setTextColor(0, 0, 0);

  cbY += 14;

  // Amount in words for closing balance
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 70, 40);
  const words = amountToWords(Math.abs(closingBalance));
  const wordsLines = doc.splitTextToSize(
    `Balance in Words: ${words}${closingBalance < 0 ? " (Credit)" : ""}`,
    pageW - margin * 2,
  );
  doc.text(wordsLines, margin, cbY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  cbY += wordsLines.length * 5 + 8;

  // Footer note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "This is a computer-generated statement. For queries, contact us.",
    pageW / 2,
    cbY,
    { align: "center" },
  );

  // Fix page footers
  const totalPages = doc.internal.getNumberOfPages();
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const pageH2 = doc.internal.pageSize.getHeight();
      const footerY = pageH2 - 12;
      doc.setDrawColor(200, 220, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 140, 120);
      doc.text("A-ONE VEGETABLES & SUPPLIERS", margin, footerY);
      doc.text(hAddress, pageW / 2, footerY, {
        align: "center",
        maxWidth: 90,
      });
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, footerY, {
        align: "right",
      });
      doc.setTextColor(0, 0, 0);
    }
  }

  return doc;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateInvoicePDF(
  order: Order,
  companyProfile?: CompanyProfilePDF,
): void {
  const doc = buildInvoicePDF(order, companyProfile);
  const rawInvNum = Array.isArray(order.invoiceNumber)
    ? order.invoiceNumber[0]
    : order.invoiceNumber;
  const fileName = rawInvNum
    ? `Invoice_${rawInvNum}_${order.storeNumber}.pdf`
    : `Invoice_${order.poNumber}_${order.storeNumber}.pdf`;
  doc.save(fileName);
}

export function generateInvoicePDFAndPrint(
  order: Order,
  companyProfile?: CompanyProfilePDF,
): void {
  const doc = buildInvoicePDF(order, companyProfile);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const url = (doc as any).output("bloburl") as string;
  window.open(url, "_blank");
}

export function generateStatementPDF(
  entries: StatementEntry[],
  customerName: string,
  companyName: string,
  period: string,
  closingBalance: number,
  storeNumber?: string,
  companyProfile?: CompanyProfilePDF,
): void {
  const doc = buildStatementPDF(
    entries,
    customerName,
    companyName,
    period,
    closingBalance,
    storeNumber,
    companyProfile,
  );
  const safeCompany = (companyName || customerName)
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 20);
  doc.save(`Statement_${safeCompany}_${period.replace(/\s/g, "_")}.pdf`);
}
