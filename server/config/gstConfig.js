/**
 * GST Configuration and Constants
 * Contains GST rates, state mappings, and business logic constants
 */

// GST Rates Configuration
const GST_RATES = {
  DEFAULT: 18,
  ZERO_RATED: 0,
  EXEMPT: 0,
  // Service-specific rates can be added here
  CONSULTING: 18,
  LEGAL: 18,
  ACCOUNTING: 18,
  TAX_SERVICES: 18,
  AUDIT: 18,
};

// Indian States and Union Territories with their GST state codes
const INDIAN_STATES = {
  "ANDHRA PRADESH": "37",
  "ARUNACHAL PRADESH": "12",
  ASSAM: "18",
  BIHAR: "10",
  CHHATTISGARH: "22",
  GOA: "30",
  GUJARAT: "24",
  HARYANA: "06",
  "HIMACHAL PRADESH": "02",
  JHARKHAND: "20",
  KARNATAKA: "29",
  KERALA: "32",
  "MADHYA PRADESH": "23",
  MAHARASHTRA: "27",
  MANIPUR: "14",
  MEGHALAYA: "17",
  MIZORAM: "15",
  NAGALAND: "13",
  ODISHA: "21",
  PUNJAB: "03",
  RAJASTHAN: "08",
  SIKKIM: "11",
  "TAMIL NADU": "33",
  TELANGANA: "36",
  TRIPURA: "16",
  "UTTAR PRADESH": "09",
  UTTARAKHAND: "05",
  "WEST BENGAL": "19",
  // Union Territories
  "ANDAMAN AND NICOBAR ISLANDS": "35",
  CHANDIGARH: "04",
  "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "26",
  DELHI: "07",
  "JAMMU AND KASHMIR": "01",
  LADAKH: "38",
  LAKSHADWEEP: "31",
  PUDUCHERRY: "34",
};

// SAC (Service Accounting Code) mappings
const SAC_CODES = {
  LEGAL_SERVICES: "998213",
  ACCOUNTING_SERVICES: "998212",
  TAX_ADVISORY: "998212",
  BUSINESS_CONSULTING: "998314",
  AUDIT_SERVICES: "998212",
  COMPANY_REGISTRATION: "998219",
  COMPLIANCE_SERVICES: "998212",
  FINANCIAL_ADVISORY: "997159",
  OTHER_PROFESSIONAL_SERVICES: "998399",
};

// Default company configuration (to be overridden by database)
const DEFAULT_COMPANY_CONFIG = {
  companyName: "Gods Office",
  companyGSTIN: "27AAAAA0000A1ZZ", // Placeholder GSTIN
  companyAddress: "Mumbai, Maharashtra, India",
  companyState: "MAHARASHTRA",
  companyPAN: "AAAAA0000A",
  companyPhone: "+91 98765 43210",
  companyEmail: "info@godsoffice.com",
  companyWebsite: "www.godsoffice.com",
  homeState: "MAHARASHTRA",
  defaultGSTRate: GST_RATES.DEFAULT,
  invoicePrefix: {
    sun: "INV",
    moon: "INT",
  },
  invoiceTerms:
    "Payment due within 30 days from date of invoice. Interest @ 18% p.a. will be charged on delayed payments.",
  paymentTerms: "Payment due within 30 days",
  bankDetails: {
    bankName: "State Bank of India",
    accountNumber: "1234567890",
    ifscCode: "SBIN0001234",
    accountHolderName: "Gods Office",
    branchName: "Mumbai Main Branch",
  },
};

/**
 * Calculate GST based on client and company states
 * @param {string} clientState - Client's state name
 * @param {string} companyState - Company's state name
 * @param {number} amount - Base amount
 * @param {number} gstRate - GST rate percentage
 * @returns {Object} GST calculation breakdown
 */
function calculateGST(
  clientState,
  companyState,
  amount,
  gstRate = GST_RATES.DEFAULT
) {
  const normalizedClientState = clientState?.toUpperCase().trim();
  const normalizedCompanyState = companyState?.toUpperCase().trim();

  // Check if states are same (intra-state) or different (inter-state)
  const isIntraState = normalizedClientState === normalizedCompanyState;

  if (isIntraState) {
    // Intra-state: CGST + SGST
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    const cgstAmount = (amount * cgstRate) / 100;
    const sgstAmount = (amount * sgstRate) / 100;

    return {
      isIntraState: true,
      cgstRate,
      sgstRate,
      igstRate: 0,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstAmount: 0,
      totalTax: Math.round((cgstAmount + sgstAmount) * 100) / 100,
      totalAmount: Math.round((amount + cgstAmount + sgstAmount) * 100) / 100,
    };
  } else {
    // Inter-state: IGST
    const igstAmount = (amount * gstRate) / 100;

    return {
      isIntraState: false,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: Math.round(igstAmount * 100) / 100,
      totalTax: Math.round(igstAmount * 100) / 100,
      totalAmount: Math.round((amount + igstAmount) * 100) / 100,
    };
  }
}

/**
 * Get GST rate for a specific service
 * @param {string} serviceCode - Service code
 * @param {Object} customRates - Custom rate configuration
 * @returns {number} GST rate
 */
function getGSTRateForService(serviceCode, customRates = {}) {
  if (customRates[serviceCode]) {
    return customRates[serviceCode];
  }

  // Default mappings based on service code patterns
  if (serviceCode?.toLowerCase().includes("legal")) return GST_RATES.LEGAL;
  if (serviceCode?.toLowerCase().includes("audit")) return GST_RATES.AUDIT;
  if (serviceCode?.toLowerCase().includes("tax")) return GST_RATES.TAX_SERVICES;
  if (serviceCode?.toLowerCase().includes("account"))
    return GST_RATES.ACCOUNTING;
  if (serviceCode?.toLowerCase().includes("consult"))
    return GST_RATES.CONSULTING;

  return GST_RATES.DEFAULT;
}

/**
 * Get SAC code for a service
 * @param {string} serviceName - Service name
 * @returns {string} SAC code
 */
function getSACCodeForService(serviceName) {
  const name = serviceName?.toLowerCase() || "";

  if (name.includes("legal") || name.includes("law"))
    return SAC_CODES.LEGAL_SERVICES;
  if (name.includes("account") || name.includes("book"))
    return SAC_CODES.ACCOUNTING_SERVICES;
  if (
    name.includes("tax") ||
    name.includes("gst") ||
    name.includes("income tax")
  )
    return SAC_CODES.TAX_ADVISORY;
  if (name.includes("audit")) return SAC_CODES.AUDIT_SERVICES;
  if (name.includes("consult") || name.includes("advisory"))
    return SAC_CODES.BUSINESS_CONSULTING;
  if (name.includes("registration") || name.includes("incorporation"))
    return SAC_CODES.COMPANY_REGISTRATION;
  if (name.includes("compliance")) return SAC_CODES.COMPLIANCE_SERVICES;
  if (name.includes("financial")) return SAC_CODES.FINANCIAL_ADVISORY;

  return SAC_CODES.OTHER_PROFESSIONAL_SERVICES;
}

/**
 * Validate GSTIN format
 * @param {string} gstin - GSTIN to validate
 * @returns {boolean} Whether GSTIN is valid
 */
function validateGSTIN(gstin) {
  if (!gstin) return false;

  // GSTIN format: 15 characters
  // First 2: State code
  // Next 10: PAN of entity
  // 12th: Entity number
  // 13th: Z (default)
  // 14th: Check sum digit
  const gstinRegex =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  return gstinRegex.test(gstin);
}

/**
 * Extract state code from GSTIN
 * @param {string} gstin - GSTIN
 * @returns {string} State code
 */
function getStateCodeFromGSTIN(gstin) {
  if (!validateGSTIN(gstin)) return null;
  return gstin.substring(0, 2);
}

/**
 * Get state name from state code
 * @param {string} stateCode - GST state code
 * @returns {string} State name
 */
function getStateNameFromCode(stateCode) {
  for (const [state, code] of Object.entries(INDIAN_STATES)) {
    if (code === stateCode) {
      return state;
    }
  }
  return null;
}

/**
 * Format currency for Indian format
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
function formatIndianCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generate financial year from date
 * @param {Date} date - Date object
 * @returns {string} Financial year (e.g., "2024-2025")
 */
function getFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-11

  if (month >= 4) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

module.exports = {
  GST_RATES,
  INDIAN_STATES,
  SAC_CODES,
  DEFAULT_COMPANY_CONFIG,
  calculateGST,
  getGSTRateForService,
  getSACCodeForService,
  validateGSTIN,
  getStateCodeFromGSTIN,
  getStateNameFromCode,
  formatIndianCurrency,
  getFinancialYear,
};
