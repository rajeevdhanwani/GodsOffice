// client/src/utils/pdfGenerator.js - PROFESSIONAL ENHANCED VERSION
import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatIndianCurrency, convertAmountToWords } from "./invoiceUtils";

const generateInvoicePDF = (invoice) => {
  try {
    // Create new PDF document with optimized settings
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
      compress: true,
    });

    // Page dimensions
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Color scheme
    const colors = {
      primary: [41, 98, 255], // Modern blue
      secondary: [107, 114, 128], // Cool gray
      accent: [16, 185, 129], // Success green
      dark: [17, 24, 39], // Almost black
      light: [249, 250, 251], // Very light gray
      border: [229, 231, 235], // Light border
      text: [55, 65, 81], // Dark gray text
    };

    let yPosition = margin;

    // Helper function to add text with enhanced styling
    const addText = (text, x, y, options = {}) => {
      const {
        fontSize = 10,
        fontStyle = "normal",
        color = colors.text,
        align = "left",
        maxWidth = null,
        lineHeight = null,
      } = options;

      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      doc.setTextColor(color[0], color[1], color[2]);

      if (maxWidth && doc.getTextWidth(text) > maxWidth) {
        const lines = doc.splitTextToSize(text, maxWidth);
        if (align === "center") {
          lines.forEach((line, index) => {
            doc.text(line, x, y + index * (lineHeight || fontSize * 0.35), {
              align: "center",
            });
          });
        } else if (align === "right") {
          lines.forEach((line, index) => {
            doc.text(line, x, y + index * (lineHeight || fontSize * 0.35), {
              align: "right",
            });
          });
        } else {
          lines.forEach((line, index) => {
            doc.text(line, x, y + index * (lineHeight || fontSize * 0.35));
          });
        }
        return lines.length * (lineHeight || fontSize * 0.35);
      } else {
        if (align === "center") {
          doc.text(text, x, y, { align: "center" });
        } else if (align === "right") {
          doc.text(text, x, y, { align: "right" });
        } else {
          doc.text(text, x, y);
        }
        return fontSize * 0.35;
      }
    };

    // Helper function to add rectangles
    const addRect = (x, y, width, height, options = {}) => {
      const { fillColor, borderColor, lineWidth = 0.5 } = options;

      if (fillColor) {
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      }
      if (borderColor) {
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(lineWidth);
      }

      if (fillColor && borderColor) {
        doc.rect(x, y, width, height, "FD");
      } else if (fillColor) {
        doc.rect(x, y, width, height, "F");
      } else if (borderColor) {
        doc.rect(x, y, width, height, "S");
      }
    };

    // HEADER SECTION WITH MODERN DESIGN
    addRect(margin, yPosition, contentWidth, 25, {
      fillColor: colors.primary,
      borderColor: colors.primary,
    });

    // Invoice title
    addText("TAX INVOICE", pageWidth / 2, yPosition + 10, {
      fontSize: 20,
      fontStyle: "bold",
      color: [255, 255, 255],
      align: "center",
    });

    // FIXED: Remove # from invoice number
    const invoiceNumber = invoice.invoiceNumber
      ? invoice.invoiceNumber.replace("#", "")
      : "N/A";
    addText(`Invoice: ${invoiceNumber}`, pageWidth - margin, yPosition + 18, {
      fontSize: 12,
      fontStyle: "bold",
      color: [255, 255, 255],
      align: "right",
    });

    yPosition += 35;

    // COMPANY & CLIENT INFORMATION SECTION
    const infoSectionHeight = 45;
    addRect(margin, yPosition, contentWidth, infoSectionHeight, {
      fillColor: colors.light,
      borderColor: colors.border,
    });

    // From section (Left side)
    const fromX = margin + 5;
    let fromY = yPosition + 8;

    addText("FROM:", fromX, fromY, {
      fontSize: 11,
      fontStyle: "bold",
      color: colors.primary,
    });
    fromY += 6;

    addText(invoice.firmName || "Firm Name", fromX, fromY, {
      fontSize: 12,
      fontStyle: "bold",
      color: colors.dark,
    });
    fromY += 5;

    if (invoice.billerAddress) {
      const addressLines = invoice.billerAddress.split("\n").slice(0, 2); // Limit to 2 lines
      addressLines.forEach((line) => {
        if (line.trim()) {
          addText(line.trim(), fromX, fromY, {
            fontSize: 9,
            color: colors.secondary,
            maxWidth: contentWidth * 0.4,
          });
          fromY += 4;
        }
      });
    }

    addText(`State: ${invoice.billerState}`, fromX, fromY, {
      fontSize: 9,
      color: colors.secondary,
    });
    fromY += 4;

    if (invoice.billerGSTIN) {
      addText(`GSTIN: ${invoice.billerGSTIN}`, fromX, fromY, {
        fontSize: 9,
        color: colors.secondary,
      });
    }

    // To section (Right side)
    const toX = margin + contentWidth * 0.55;
    let toY = yPosition + 8;

    addText("BILL TO:", toX, toY, {
      fontSize: 11,
      fontStyle: "bold",
      color: colors.primary,
    });
    toY += 6;

    addText(`${invoice.salutation} ${invoice.clientName}`, toX, toY, {
      fontSize: 12,
      fontStyle: "bold",
      color: colors.dark,
    });
    toY += 5;

    addText(`Client Code: ${invoice.clientCode}`, toX, toY, {
      fontSize: 9,
      color: colors.secondary,
    });
    toY += 4;

    // Client address (limited to 2 lines for space)
    if (invoice.address) {
      const clientAddressLines = invoice.address.split("\n").slice(0, 2);
      clientAddressLines.forEach((line) => {
        if (line.trim()) {
          addText(line.trim(), toX, toY, {
            fontSize: 9,
            color: colors.secondary,
            maxWidth: contentWidth * 0.4,
          });
          toY += 4;
        }
      });
    }

    addText(`Place of Supply: ${invoice.placeOfSupply}`, toX, toY, {
      fontSize: 9,
      color: colors.secondary,
    });
    toY += 4;

    // ENHANCED: Add client GSTIN or "-" if not available
    const clientGSTIN = invoice.gstin || "-";
    addText(`GSTIN: ${clientGSTIN}`, toX, toY, {
      fontSize: 9,
      color: colors.secondary,
    });

    yPosition += infoSectionHeight + 8;

    // INVOICE DETAILS SECTION
    const detailsBoxHeight = 20;
    addRect(margin, yPosition, contentWidth, detailsBoxHeight, {
      fillColor: colors.light,
      borderColor: colors.border,
    });

    // Invoice details in a grid
    const detailsY = yPosition + 8;
    const colWidth = contentWidth / 3;

    addText(
      `Invoice Date: ${invoice.displayInvoiceDate}`,
      margin + 5,
      detailsY,
      {
        fontSize: 10,
        fontStyle: "bold",
        color: colors.dark,
      }
    );

    addText(
      `Due Date: ${invoice.displayDueDate}`,
      margin + colWidth + 5,
      detailsY,
      {
        fontSize: 10,
        fontStyle: "bold",
        color: colors.dark,
      }
    );

    addText(
      `Terms: ${invoice.paymentTerms || "As per agreement"}`,
      margin + colWidth * 2 + 5,
      detailsY,
      {
        fontSize: 10,
        fontStyle: "bold",
        color: colors.dark,
      }
    );

    yPosition += detailsBoxHeight + 8;

    // SERVICES TABLE WITH ENHANCED DESIGN
    const tableHeaders = [
      "S.No.",
      "Description",
      "HSN/SAC",
      "Period",
      "Amount (₹)",
    ];
    const tableData = [];
    let totalAmount = 0;

    invoice.services.forEach((service, index) => {
      const amount = parseFloat(service.amount) || 0;
      totalAmount += amount;

      let description = service.serviceName || "Unknown Service";
      if (service.description && service.isCustom) {
        description += `\n${service.description}`;
      } else if (service.servicePeriod && !service.isCustom) {
        description += `\n(${service.servicePeriod})`;
      }

      tableData.push([
        (index + 1).toString(),
        description,
        service.sacCode || "998314",
        service.servicePeriod || "N/A",
        formatIndianCurrency(amount),
      ]);
    });

    // Generate services table with enhanced styling
    doc.autoTable({
      startY: yPosition,
      head: [tableHeaders],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 9,
        textColor: colors.text,
        fillColor: [255, 255, 255],
        lineColor: colors.border,
        lineWidth: 0.5,
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      },
      headStyles: {
        fillColor: colors.primary,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 15 },
        1: { cellWidth: 85, valign: "top" },
        2: { halign: "center", cellWidth: 25 },
        3: { halign: "center", cellWidth: 30 },
        4: { halign: "right", cellWidth: 35, fontStyle: "bold" },
      },
      alternateRowStyles: {
        fillColor: colors.light,
      },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
    });

    // Update position after table
    yPosition = doc.lastAutoTable.finalY + 5;

    // TOTALS SECTION WITH ENHANCED DESIGN
    const totalsBoxWidth = 70;
    const totalsBoxHeight = 45;
    const totalsX = pageWidth - margin - totalsBoxWidth;

    addRect(totalsX, yPosition, totalsBoxWidth, totalsBoxHeight, {
      fillColor: colors.light,
      borderColor: colors.border,
    });

    let totalsY = yPosition + 8;

    // Subtotal
    addText("Subtotal:", totalsX + 3, totalsY, {
      fontSize: 10,
      fontStyle: "bold",
      color: colors.dark,
    });
    addText(
      formatIndianCurrency(totalAmount),
      totalsX + totalsBoxWidth - 3,
      totalsY,
      {
        fontSize: 10,
        fontStyle: "bold",
        color: colors.dark,
        align: "right",
      }
    );
    totalsY += 6;

    // Calculate GST (18%)
    const gstRate = 0.18;
    const gstAmount = totalAmount * gstRate;
    const grandTotal = totalAmount + gstAmount;

    // CGST (9%)
    addText("CGST (9%):", totalsX + 3, totalsY, {
      fontSize: 9,
      color: colors.secondary,
    });
    addText(
      formatIndianCurrency(gstAmount / 2),
      totalsX + totalsBoxWidth - 3,
      totalsY,
      {
        fontSize: 9,
        color: colors.secondary,
        align: "right",
      }
    );
    totalsY += 5;

    // SGST (9%)
    addText("SGST (9%):", totalsX + 3, totalsY, {
      fontSize: 9,
      color: colors.secondary,
    });
    addText(
      formatIndianCurrency(gstAmount / 2),
      totalsX + totalsBoxWidth - 3,
      totalsY,
      {
        fontSize: 9,
        color: colors.secondary,
        align: "right",
      }
    );
    totalsY += 8;

    // Total line
    addRect(totalsX + 3, totalsY - 2, totalsBoxWidth - 6, 0.5, {
      fillColor: colors.border,
    });
    totalsY += 2;

    // Grand Total with accent color
    addText("Total:", totalsX + 3, totalsY, {
      fontSize: 12,
      fontStyle: "bold",
      color: colors.accent,
    });
    addText(
      formatIndianCurrency(grandTotal),
      totalsX + totalsBoxWidth - 3,
      totalsY,
      {
        fontSize: 12,
        fontStyle: "bold",
        color: colors.accent,
        align: "right",
      }
    );

    yPosition += totalsBoxHeight + 8;

    // AMOUNT IN WORDS SECTION
    const amountInWords = convertAmountToWords(grandTotal);
    const wordsBoxHeight = 20;

    addRect(margin, yPosition, contentWidth, wordsBoxHeight, {
      fillColor: colors.light,
      borderColor: colors.border,
    });

    addText("Amount in Words:", margin + 5, yPosition + 6, {
      fontSize: 10,
      fontStyle: "bold",
      color: colors.primary,
    });

    const wordsText = `Rupees ${amountInWords} Only`;
    addText(wordsText, margin + 5, yPosition + 14, {
      fontSize: 11,
      fontStyle: "italic",
      color: colors.dark,
      maxWidth: contentWidth - 10,
    });

    yPosition += wordsBoxHeight + 8;

    // NOTES SECTION (if available and space permits)
    if (
      invoice.customerNotes &&
      invoice.customerNotes.trim() &&
      yPosition < pageHeight - 50
    ) {
      const notesBoxHeight = 25;
      addRect(margin, yPosition, contentWidth, notesBoxHeight, {
        fillColor: colors.light,
        borderColor: colors.border,
      });

      addText("Notes:", margin + 5, yPosition + 6, {
        fontSize: 10,
        fontStyle: "bold",
        color: colors.primary,
      });

      addText(invoice.customerNotes, margin + 5, yPosition + 14, {
        fontSize: 9,
        color: colors.secondary,
        maxWidth: contentWidth - 10,
        lineHeight: 4,
      });

      yPosition += notesBoxHeight + 5;
    }

    // FOOTER SECTION
    const footerY = pageHeight - 25;

    // Footer border
    addRect(margin, footerY - 5, contentWidth, 0.5, {
      fillColor: colors.border,
    });

    // Footer content
    addText("Terms & Conditions:", margin, footerY + 2, {
      fontSize: 8,
      fontStyle: "bold",
      color: colors.primary,
    });

    const terms = [
      "• Payment due within specified due date",
      "• Late payments may incur charges",
      "• This is a computer-generated invoice",
    ];

    let termY = footerY + 8;
    terms.forEach((term) => {
      addText(term, margin, termY, {
        fontSize: 7,
        color: colors.secondary,
      });
      termY += 3;
    });

    // Signature section
    addText("Authorized Signatory", pageWidth - margin - 40, footerY + 2, {
      fontSize: 8,
      fontStyle: "bold",
      color: colors.dark,
      align: "center",
    });

    // Digital signature note
    addText(
      "This is a computer-generated invoice and does not require a physical signature.",
      pageWidth / 2,
      pageHeight - 10,
      {
        fontSize: 7,
        color: colors.secondary,
        align: "center",
        fontStyle: "italic",
      }
    );

    return doc;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

// Export function to download PDF
export const downloadInvoicePDF = (invoice, filename) => {
  try {
    const doc = generateInvoicePDF(invoice);

    // FIXED: Remove # from filename as well
    const cleanInvoiceNumber = invoice.invoiceNumber
      ? invoice.invoiceNumber.replace("#", "")
      : "Unknown";
    const pdfFilename = filename || `Invoice_${cleanInvoiceNumber}.pdf`;

    // Enhanced download with proper MIME type and compression
    doc.save(pdfFilename, {
      compress: true,
      returnPromise: true,
    });

    return true;
  } catch (error) {
    console.error("Error downloading PDF:", error);
    throw error;
  }
};

// Export function to get PDF blob (for server upload)
export const getInvoicePDFBlob = (invoice) => {
  try {
    const doc = generateInvoicePDF(invoice);
    return doc.output("blob", { compress: true });
  } catch (error) {
    console.error("Error creating PDF blob:", error);
    throw error;
  }
};

// Export function to get PDF data URL
export const getInvoicePDFDataURL = (invoice) => {
  try {
    const doc = generateInvoicePDF(invoice);
    return doc.output("dataurlstring", { compress: true });
  } catch (error) {
    console.error("Error creating PDF data URL:", error);
    throw error;
  }
};

// Export function to preview PDF in new window
export const previewInvoicePDF = (invoice) => {
  try {
    const doc = generateInvoicePDF(invoice);
    const pdfDataUri = doc.output("datauristring");

    // Open in new window for preview
    const newWindow = window.open();
    newWindow.document.write(`
      <html>
        <head>
          <title>Invoice Preview - ${invoice.invoiceNumber || "Unknown"}</title>
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
            iframe { border: none; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px; }
          </style>
        </head>
        <body>
          <iframe src="${pdfDataUri}" width="100%" height="100%" style="min-height: 100vh;"></iframe>
        </body>
      </html>
    `);

    return true;
  } catch (error) {
    console.error("Error previewing PDF:", error);
    throw error;
  }
};

export default {
  generateInvoicePDF,
  downloadInvoicePDF,
  getInvoicePDFBlob,
  getInvoicePDFDataURL,
  previewInvoicePDF,
};
