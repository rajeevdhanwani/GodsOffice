const { jsPDF } = require("jspdf");
require("jspdf-autotable");

const generateInvoicePDF = (data) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    const colors = {
      primary: [41, 98, 255],
      secondary: [107, 114, 128],
      accent: [16, 185, 129],
      dark: [17, 24, 39],
      light: [249, 250, 251],
      border: [229, 231, 235],
      text: [55, 65, 81],
    };

    let yPosition = margin;

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

    addRect(margin, yPosition, contentWidth, 25, {
      fillColor: colors.primary,
      borderColor: colors.primary,
    });

    const invoiceNumber = data.invoiceNumber
      ? data.invoiceNumber.replace("#", "")
      : "N/A";
    addText("TAX INVOICE", pageWidth / 2, yPosition + 10, {
      fontSize: 20,
      fontStyle: "bold",
      color: [255, 255, 255],
      align: "center",
    });
    addText(`Invoice: ${invoiceNumber}`, pageWidth - margin, yPosition + 18, {
      fontSize: 12,
      fontStyle: "bold",
      color: [255, 255, 255],
      align: "right",
    });

    yPosition += 35;

    const infoSectionHeight = 45;
    addRect(margin, yPosition, contentWidth, infoSectionHeight, {
      fillColor: colors.light,
      borderColor: colors.border,
    });

    const fromX = margin + 5;
    let fromY = yPosition + 8;
    addText("FROM:", fromX, fromY, {
      fontSize: 11,
      fontStyle: "bold",
      color: colors.primary,
    });
    fromY += 6;
    addText(data.firmName || "Firm Name", fromX, fromY, {
      fontSize: 12,
      fontStyle: "bold",
      color: colors.dark,
    });
    fromY += 5;

    if (data.billerAddress) {
      const addressLines = data.billerAddress.split("\n").slice(0, 2);
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
    addText(`State: ${data.billerState || "N/A"}`, fromX, fromY, {
      fontSize: 9,
      color: colors.secondary,
    });
    fromY += 4;
    addText(`GSTIN: ${data.billerGSTIN || "-"}`, fromX, fromY, {
      fontSize: 9,
      color: colors.secondary,
    });

    const toX = margin + contentWidth * 0.55;
    let toY = yPosition + 8;
    addText("BILL TO:", toX, toY, {
      fontSize: 11,
      fontStyle: "bold",
      color: colors.primary,
    });
    toY += 6;
    addText(`${data.salutation} ${data.clientName}`, toX, toY, {
      fontSize: 12,
      fontStyle: "bold",
      color: colors.dark,
    });
    toY += 5;
    addText(`Client Code: ${data.clientCode}`, toX, toY, {
      fontSize: 9,
      color: colors.secondary,
    });
    toY += 4;

    if (data.address) {
      const clientAddressLines = data.address.split("\n").slice(0, 2);
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
    addText(`Place of Supply: ${data.placeOfSupply}`, toX, toY, {
      fontSize: 9,
      color: colors.secondary,
    });
    toY += 4;
    addText(`GSTIN: ${data.gstin}`, toX, toY, {
      fontSize: 9,
      color: colors.secondary,
    });

    yPosition += infoSectionHeight + 8;

    const detailsBoxHeight = 20;
    addRect(margin, yPosition, contentWidth, detailsBoxHeight, {
      fillColor: colors.light,
      borderColor: colors.border,
    });

    const detailsY = yPosition + 8;
    const colWidth = contentWidth / 3;
    addText(`Invoice Date: ${data.displayInvoiceDate}`, margin + 5, detailsY, {
      fontSize: 10,
      fontStyle: "bold",
      color: colors.dark,
    });
    addText(
      `Due Date: ${data.displayDueDate}`,
      margin + colWidth + 5,
      detailsY,
      {
        fontSize: 10,
        fontStyle: "bold",
        color: colors.dark,
      }
    );
    addText(
      `Terms: ${data.paymentTerms || "As per agreement"}`,
      margin + colWidth * 2 + 5,
      detailsY,
      {
        fontSize: 10,
        fontStyle: "bold",
        color: colors.dark,
      }
    );

    yPosition += detailsBoxHeight + 8;

    const tableHeaders = [
      "S.No.",
      "Description",
      "HSN/SAC",
      "Period",
      "Amount (₹)",
    ];
    const tableData = [];
    let totalAmount = 0;

    data.services.forEach((service, index) => {
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
        amount.toFixed(2),
      ]);
    });

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

    yPosition = doc.lastAutoTable.finalY + 5;

    const totalsBoxWidth = 70;
    const totalsBoxHeight = data.taxDetails.cgst > 0 ? 45 : 35;
    const totalsX = pageWidth - margin - totalsBoxWidth;

    addRect(totalsX, yPosition, totalsBoxWidth, totalsBoxHeight, {
      fillColor: colors.light,
      borderColor: colors.border,
    });

    let totalsY = yPosition + 8;
    addText("Subtotal:", totalsX + 3, totalsY, {
      fontSize: 10,
      fontStyle: "bold",
      color: colors.dark,
    });
    addText(totalAmount.toFixed(2), totalsX + totalsBoxWidth - 3, totalsY, {
      fontSize: 10,
      fontStyle: "bold",
      color: colors.dark,
      align: "right",
    });
    totalsY += 6;

    if (data.taxDetails.cgst > 0) {
      addText("CGST (9%):", totalsX + 3, totalsY, {
        fontSize: 9,
        color: colors.secondary,
      });
      addText(
        data.taxDetails.cgst.toFixed(2),
        totalsX + totalsBoxWidth - 3,
        totalsY,
        {
          fontSize: 9,
          color: colors.secondary,
          align: "right",
        }
      );
      totalsY += 5;

      addText("SGST (9%):", totalsX + 3, totalsY, {
        fontSize: 9,
        color: colors.secondary,
      });
      addText(
        data.taxDetails.sgst.toFixed(2),
        totalsX + totalsBoxWidth - 3,
        totalsY,
        {
          fontSize: 9,
          color: colors.secondary,
          align: "right",
        }
      );
      totalsY += 8;
    } else {
      addText("IGST (18%):", totalsX + 3, totalsY, {
        fontSize: 9,
        color: colors.secondary,
      });
      addText(
        data.taxDetails.igst.toFixed(2),
        totalsX + totalsBoxWidth - 3,
        totalsY,
        {
          fontSize: 9,
          color: colors.secondary,
          align: "right",
        }
      );
      totalsY += 8;
    }

    addRect(totalsX + 3, totalsY - 2, totalsBoxWidth - 6, 0.5, {
      fillColor: colors.border,
    });
    totalsY += 2;

    addText("Total:", totalsX + 3, totalsY, {
      fontSize: 12,
      fontStyle: "bold",
      color: colors.accent,
    });
    addText(
      data.totalAmount.toFixed(2),
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

    const amountInWords = require("number-to-words").toWords(
      Math.round(data.totalAmount)
    );
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

    if (
      data.customerNotes &&
      data.customerNotes.trim() &&
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

      addText(data.customerNotes, margin + 5, yPosition + 14, {
        fontSize: 9,
        color: colors.secondary,
        maxWidth: contentWidth - 10,
        lineHeight: 4,
      });

      yPosition += notesBoxHeight + 5;
    }

    const footerY = pageHeight - 25;
    addRect(margin, footerY - 5, contentWidth, 0.5, {
      fillColor: colors.border,
    });

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

    addText("Authorized Signatory", pageWidth - margin - 40, footerY + 2, {
      fontSize: 8,
      fontStyle: "bold",
      color: colors.dark,
      align: "center",
    });

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

    return doc.output("arraybuffer");
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

module.exports = { generateInvoicePDF };
