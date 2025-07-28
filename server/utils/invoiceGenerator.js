const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { formatCurrency, amountToWords } = require('./gstCalculator');

/**
 * Generate PDF invoice
 * @param {Object} invoice - Invoice data
 * @param {Array} lineItems - Invoice line items
 * @param {Object} gstConfig - GST configuration
 * @param {string} outputPath - Output file path
 * @returns {Promise<string>} - Path to generated PDF
 */
async function generateInvoicePDF(invoice, lineItems, gstConfig, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      
      // Header
      generateHeader(doc, invoice, gstConfig);
      
      // Invoice Details
      generateInvoiceDetails(doc, invoice);
      
      // Client Details
      generateClientDetails(doc, invoice);
      
      // Line Items Table
      generateLineItemsTable(doc, lineItems);
      
      // Tax Summary
      generateTaxSummary(doc, invoice);
      
      // Total Amount in Words
      generateAmountInWords(doc, invoice.grandTotal);
      
      // Terms and Conditions
      generateTermsAndConditions(doc, gstConfig);
      
      // Footer
      generateFooter(doc, gstConfig);
      
      doc.end();
      
      stream.on('finish', () => {
        resolve(outputPath);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate invoice header with company details
 */
function generateHeader(doc, invoice, gstConfig) {
  const startY = 50;
  
  // Company Name
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text(gstConfig.companyName, 40, startY);
  
  // Company Address
  doc.fontSize(10)
     .font('Helvetica')
     .text(gstConfig.companyAddress, 40, startY + 30);
  
  // Company Details
  let detailsY = startY + 50;
  if (gstConfig.companyPhone) {
    doc.text(`Phone: ${gstConfig.companyPhone}`, 40, detailsY);
    detailsY += 12;
  }
  if (gstConfig.companyEmail) {
    doc.text(`Email: ${gstConfig.companyEmail}`, 40, detailsY);
    detailsY += 12;
  }
  if (gstConfig.companyGSTIN) {
    doc.text(`GSTIN: ${gstConfig.companyGSTIN}`, 40, detailsY);
    detailsY += 12;
  }
  if (gstConfig.companyPAN) {
    doc.text(`PAN: ${gstConfig.companyPAN}`, 40, detailsY);
  }
  
  // Invoice Title
  const invoiceTitle = invoice.invoiceType === 'sun' ? 'TAX INVOICE' : 'INVOICE';
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text(invoiceTitle, 400, startY, { align: 'right' });
  
  // Line separator
  doc.moveTo(40, startY + 100)
     .lineTo(555, startY + 100)
     .stroke();
  
  return startY + 120;
}

/**
 * Generate invoice details section
 */
function generateInvoiceDetails(doc, invoice) {
  const startY = 170;
  
  doc.fontSize(10)
     .font('Helvetica-Bold');
  
  // Invoice details on the right
  doc.text('Invoice No:', 400, startY);
  doc.text('Invoice Date:', 400, startY + 15);
  doc.text('Due Date:', 400, startY + 30);
  if (invoice.invoiceType === 'sun') {
    doc.text('Financial Year:', 400, startY + 45);
  }
  
  doc.font('Helvetica');
  doc.text(invoice.invoiceNumber, 480, startY);
  doc.text(formatDate(invoice.invoiceDate), 480, startY + 15);
  doc.text(formatDate(invoice.dueDate), 480, startY + 30);
  if (invoice.invoiceType === 'sun') {
    doc.text(invoice.financialYear, 480, startY + 45);
  }
  
  return startY + 70;
}

/**
 * Generate client details section
 */
function generateClientDetails(doc, invoice) {
  const startY = 240;
  
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .text('Bill To:', 40, startY);
  
  doc.font('Helvetica')
     .text(invoice.clientName, 40, startY + 15)
     .text(invoice.firmName, 40, startY + 30)
     .text(invoice.clientAddress, 40, startY + 45, { width: 300 });
  
  let clientDetailsY = startY + 75;
  if (invoice.clientGSTIN) {
    doc.text(`GSTIN: ${invoice.clientGSTIN}`, 40, clientDetailsY);
    clientDetailsY += 15;
  }
  doc.text(`State: ${invoice.clientState}`, 40, clientDetailsY);
  
  return clientDetailsY + 30;
}

/**
 * Generate line items table
 */
function generateLineItemsTable(doc, lineItems) {
  const tableTop = 350;
  const itemHeight = 20;
  
  // Table headers
  doc.fontSize(10)
     .font('Helvetica-Bold');
  
  doc.text('S.No', 40, tableTop);
  doc.text('Description', 80, tableTop);
  doc.text('SAC Code', 300, tableTop);
  doc.text('Qty', 360, tableTop);
  doc.text('Rate', 400, tableTop);
  doc.text('Amount', 480, tableTop, { align: 'right' });
  
  // Table header line
  doc.moveTo(40, tableTop + 15)
     .lineTo(555, tableTop + 15)
     .stroke();
  
  // Line items
  doc.font('Helvetica');
  let currentY = tableTop + 25;
  
  lineItems.forEach((item, index) => {
    doc.text((index + 1).toString(), 40, currentY);
    doc.text(item.description, 80, currentY, { width: 200 });
    doc.text(item.sacCode || '', 300, currentY);
    doc.text(item.quantity.toString(), 360, currentY);
    doc.text(formatCurrency(item.rate), 400, currentY);
    doc.text(formatCurrency(item.amount), 480, currentY, { align: 'right' });
    
    currentY += itemHeight;
  });
  
  // Bottom line
  doc.moveTo(40, currentY + 5)
     .lineTo(555, currentY + 5)
     .stroke();
  
  return currentY + 20;
}

/**
 * Generate tax summary section
 */
function generateTaxSummary(doc, invoice) {
  const startY = 480;
  
  doc.fontSize(10)
     .font('Helvetica');
  
  // Subtotal
  doc.text('Subtotal:', 400, startY);
  doc.text(formatCurrency(invoice.subtotal), 480, startY, { align: 'right' });
  
  let currentY = startY + 15;
  
  // Tax details
  if (invoice.cgstAmount > 0) {
    doc.text(`CGST (${invoice.cgstRate}%):`, 400, currentY);
    doc.text(formatCurrency(invoice.cgstAmount), 480, currentY, { align: 'right' });
    currentY += 15;
    
    doc.text(`SGST (${invoice.sgstRate}%):`, 400, currentY);
    doc.text(formatCurrency(invoice.sgstAmount), 480, currentY, { align: 'right' });
    currentY += 15;
  }
  
  if (invoice.igstAmount > 0) {
    doc.text(`IGST (${invoice.igstRate}%):`, 400, currentY);
    doc.text(formatCurrency(invoice.igstAmount), 480, currentY, { align: 'right' });
    currentY += 15;
  }
  
  // Total
  doc.moveTo(400, currentY + 5)
     .lineTo(555, currentY + 5)
     .stroke();
  
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Total Amount:', 400, currentY + 10);
  doc.text(formatCurrency(invoice.grandTotal), 480, currentY + 10, { align: 'right' });
  
  return currentY + 40;
}

/**
 * Generate amount in words
 */
function generateAmountInWords(doc, amount) {
  const startY = 580;
  
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .text('Amount in Words:', 40, startY);
  
  doc.font('Helvetica')
     .text(amountToWords(amount), 40, startY + 15, { width: 500 });
  
  return startY + 40;
}

/**
 * Generate terms and conditions
 */
function generateTermsAndConditions(doc, gstConfig) {
  const startY = 650;
  
  if (gstConfig.invoiceTerms) {
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text('Terms & Conditions:', 40, startY);
    
    doc.font('Helvetica')
       .text(gstConfig.invoiceTerms, 40, startY + 12, { width: 500 });
  }
  
  return startY + 40;
}

/**
 * Generate footer with bank details
 */
function generateFooter(doc, gstConfig) {
  const startY = 720;
  
  // Bank details if available
  if (gstConfig.bankDetails && gstConfig.bankDetails.bankName) {
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text('Bank Details:', 40, startY);
    
    doc.font('Helvetica');
    let bankY = startY + 12;
    doc.text(`Bank: ${gstConfig.bankDetails.bankName}`, 40, bankY);
    bankY += 10;
    doc.text(`A/C No: ${gstConfig.bankDetails.accountNumber}`, 40, bankY);
    bankY += 10;
    doc.text(`IFSC: ${gstConfig.bankDetails.ifscCode}`, 40, bankY);
    if (gstConfig.bankDetails.accountHolderName) {
      bankY += 10;
      doc.text(`A/C Name: ${gstConfig.bankDetails.accountHolderName}`, 40, bankY);
    }
  }
  
  // Signature area
  doc.fontSize(10)
     .font('Helvetica')
     .text('For ' + gstConfig.companyName, 400, startY + 20);
  
  doc.text('Authorized Signatory', 400, startY + 50);
}

/**
 * Generate Excel invoice
 */
async function generateInvoiceExcel(invoice, lineItems, gstConfig, outputPath) {
  // This would require ExcelJS or similar library
  // For now, creating a simple CSV format
  
  const csvContent = [];
  
  // Header
  csvContent.push([gstConfig.companyName]);
  csvContent.push([gstConfig.companyAddress]);
  csvContent.push([`GSTIN: ${gstConfig.companyGSTIN}`]);
  csvContent.push([]);
  csvContent.push(['INVOICE']);
  csvContent.push([]);
  
  // Invoice details
  csvContent.push(['Invoice No:', invoice.invoiceNumber]);
  csvContent.push(['Invoice Date:', formatDate(invoice.invoiceDate)]);
  csvContent.push(['Due Date:', formatDate(invoice.dueDate)]);
  csvContent.push([]);
  
  // Client details
  csvContent.push(['Bill To:']);
  csvContent.push([invoice.clientName]);
  csvContent.push([invoice.firmName]);
  csvContent.push([invoice.clientAddress]);
  csvContent.push([`GSTIN: ${invoice.clientGSTIN || 'N/A'}`]);
  csvContent.push([]);
  
  // Line items
  csvContent.push(['S.No', 'Description', 'SAC Code', 'Qty', 'Rate', 'Amount']);
  lineItems.forEach((item, index) => {
    csvContent.push([
      index + 1,
      item.description,
      item.sacCode || '',
      item.quantity,
      item.rate,
      item.amount
    ]);
  });
  
  csvContent.push([]);
  csvContent.push(['', '', '', '', 'Subtotal:', invoice.subtotal]);
  
  if (invoice.cgstAmount > 0) {
    csvContent.push(['', '', '', '', `CGST (${invoice.cgstRate}%):`, invoice.cgstAmount]);
    csvContent.push(['', '', '', '', `SGST (${invoice.sgstRate}%):`, invoice.sgstAmount]);
  }
  
  if (invoice.igstAmount > 0) {
    csvContent.push(['', '', '', '', `IGST (${invoice.igstRate}%):`, invoice.igstAmount]);
  }
  
  csvContent.push(['', '', '', '', 'Total Amount:', invoice.grandTotal]);
  csvContent.push([]);
  csvContent.push(['Amount in Words:', amountToWords(invoice.grandTotal)]);
  
  // Convert to CSV
  const csv = csvContent.map(row => row.join(',')).join('\n');
  
  fs.writeFileSync(outputPath, csv);
  return outputPath;
}

/**
 * Helper function to format date
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

module.exports = {
  generateInvoicePDF,
  generateInvoiceExcel
};
