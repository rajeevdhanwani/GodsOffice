const GSTConfig = require('../server_models/GSTConfig');

/**
 * Calculate GST based on client state, company state, and service
 * @param {string} clientState - Client's state
 * @param {string} serviceCode - Service code for specific GST rate
 * @param {number} amount - Base amount before tax
 * @param {Object} gstConfig - GST configuration (optional, will fetch if not provided)
 * @returns {Object} - GST calculation details
 */
async function calculateGST(clientState, serviceCode = null, amount, gstConfig = null) {
  try {
    // Get GST configuration if not provided
    if (!gstConfig) {
      gstConfig = await GSTConfig.getActiveConfig();
    }
    
    // Get GST rate for service or use default
    let gstRate = gstConfig.defaultGSTRate;
    if (serviceCode && gstConfig.serviceWiseGST) {
      const serviceGST = gstConfig.serviceWiseGST.find(s => s.serviceCode === serviceCode);
      if (serviceGST) {
        gstRate = serviceGST.gstRate;
      }
    }
    
    const companyState = gstConfig.homeState;
    
    // Calculate GST based on state
    if (clientState === companyState) {
      // Intra-state: CGST + SGST
      const cgstRate = gstRate / 2;
      const sgstRate = gstRate / 2;
      const cgstAmount = (amount * cgstRate) / 100;
      const sgstAmount = (amount * sgstRate) / 100;
      
      return {
        cgstRate,
        sgstRate,
        igstRate: 0,
        cgstAmount: Math.round(cgstAmount * 100) / 100,
        sgstAmount: Math.round(sgstAmount * 100) / 100,
        igstAmount: 0,
        totalTax: Math.round((cgstAmount + sgstAmount) * 100) / 100,
        totalAmount: Math.round((amount + cgstAmount + sgstAmount) * 100) / 100
      };
    } else {
      // Inter-state: IGST
      const igstAmount = (amount * gstRate) / 100;
      
      return {
        cgstRate: 0,
        sgstRate: 0,
        igstRate: gstRate,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: Math.round(igstAmount * 100) / 100,
        totalTax: Math.round(igstAmount * 100) / 100,
        totalAmount: Math.round((amount + igstAmount) * 100) / 100
      };
    }
  } catch (error) {
    console.error('Error calculating GST:', error);
    throw new Error('Failed to calculate GST');
  }
}

/**
 * Calculate total invoice amount with GST for multiple line items
 * @param {Array} lineItems - Array of line items with amount
 * @param {string} clientState - Client's state
 * @param {Object} gstConfig - GST configuration
 * @returns {Object} - Total invoice calculation
 */
async function calculateInvoiceGST(lineItems, clientState, gstConfig = null) {
  try {
    if (!gstConfig) {
      gstConfig = await GSTConfig.getActiveConfig();
    }
    
    const subtotal = lineItems.reduce((total, item) => total + item.amount, 0);
    const gstCalculation = await calculateGST(clientState, null, subtotal, gstConfig);
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      ...gstCalculation,
      grandTotal: gstCalculation.totalAmount
    };
  } catch (error) {
    console.error('Error calculating invoice GST:', error);
    throw new Error('Failed to calculate invoice GST');
  }
}

/**
 * Get GST rate for a specific service
 * @param {string} serviceCode - Service code
 * @param {Object} gstConfig - GST configuration
 * @returns {number} - GST rate
 */
function getServiceGSTRate(serviceCode, gstConfig) {
  if (!serviceCode || !gstConfig.serviceWiseGST) {
    return gstConfig.defaultGSTRate;
  }
  
  const serviceGST = gstConfig.serviceWiseGST.find(s => s.serviceCode === serviceCode);
  return serviceGST ? serviceGST.gstRate : gstConfig.defaultGSTRate;
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted amount
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Convert number to words for invoice
 * @param {number} amount - Amount to convert
 * @returns {string} - Amount in words
 */
function amountToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  function convertHundreds(num) {
    let result = '';
    
    if (num > 99) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    
    if (num > 19) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num > 9) {
      result += teens[num - 10] + ' ';
      return result;
    }
    
    if (num > 0) {
      result += ones[num] + ' ';
    }
    
    return result;
  }
  
  if (amount === 0) return 'Zero Rupees Only';
  
  const crores = Math.floor(amount / 10000000);
  const lakhs = Math.floor((amount % 10000000) / 100000);
  const thousands = Math.floor((amount % 100000) / 1000);
  const hundreds = Math.floor(amount % 1000);
  const paise = Math.round((amount % 1) * 100);
  
  let words = '';
  
  if (crores > 0) {
    words += convertHundreds(crores) + 'Crore ';
  }
  
  if (lakhs > 0) {
    words += convertHundreds(lakhs) + 'Lakh ';
  }
  
  if (thousands > 0) {
    words += convertHundreds(thousands) + 'Thousand ';
  }
  
  if (hundreds > 0) {
    words += convertHundreds(hundreds);
  }
  
  words += 'Rupees ';
  
  if (paise > 0) {
    words += 'and ' + convertHundreds(paise) + 'Paise ';
  }
  
  words += 'Only';
  
  return words.trim();
}

module.exports = {
  calculateGST,
  calculateInvoiceGST,
  getServiceGSTRate,
  formatCurrency,
  amountToWords
};
