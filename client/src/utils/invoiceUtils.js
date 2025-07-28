// Enhanced invoiceUtils.js with Design System Integration
import { jwtDecode } from "jwt-decode";
import { designSystem } from "../theme/designSystem";

/**
 * Format currency in Indian Rupee format
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatIndianCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return "₹0.00";

  const numAmount = parseFloat(amount);
  if (numAmount === 0) return "₹0.00";

  // Use Indian numbering system (lakhs, crores)
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
};

/**
 * Format date in Indian format (DD/MM/YYYY)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatIndianDate = (date) => {
  if (!date) return "N/A";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "Invalid Date";

    return dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

/**
 * Format date for display with time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time string
 */
export const formatIndianDateTime = (date) => {
  if (!date) return "N/A";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "Invalid Date";

    return dateObj.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return "Invalid Date";
  }
};

/**
 * Get user information from JWT token
 * @returns {object|null} User object or null if invalid
 */
export const getUserFromToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") return null;

    const decoded = jwtDecode(token);

    // Check if token is expired
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      localStorage.removeItem("token");
      return null;
    }

    return {
      id: decoded.id || decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || "user",
      isAdmin: decoded.role === "admin" || decoded.isAdmin,
      permissions: decoded.permissions || [],
    };
  } catch (error) {
    console.error("Error decoding token:", error);
    localStorage.removeItem("token");
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} Authentication status
 */
export const isAuthenticated = () => {
  const user = getUserFromToken();
  return user !== null;
};

/**
 * Check if user has specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean} Permission status
 */
export const hasPermission = (permission) => {
  const user = getUserFromToken();
  if (!user) return false;

  // Admin has all permissions
  if (user.isAdmin) return true;

  // Check specific permission
  return user.permissions?.includes(permission) || false;
};

/**
 * Format invoice for display with computed fields
 * @param {object} invoice - Raw invoice object
 * @returns {object} Formatted invoice object
 */
export const formatInvoiceForDisplay = (invoice) => {
  if (!invoice) return null;

  try {
    // Calculate totals
    const services = invoice.services || [];
    const subtotal = services.reduce(
      (sum, service) => sum + (parseFloat(service.amount) || 0),
      0
    );

    // Calculate GST
    const gstRate = invoice.gstRate || 18; // Default 18% GST
    const isInterState = invoice.isInterState || false;

    let taxDetails = {
      taxableAmount: subtotal,
      gstRate: gstRate,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
    };

    if (subtotal > 0 && gstRate > 0) {
      if (isInterState) {
        // Inter-state: IGST
        taxDetails.igst = (subtotal * gstRate) / 100;
      } else {
        // Intra-state: CGST + SGST
        taxDetails.cgst = (subtotal * gstRate) / 2 / 100;
        taxDetails.sgst = (subtotal * gstRate) / 2 / 100;
      }
      taxDetails.totalTax = taxDetails.cgst + taxDetails.sgst + taxDetails.igst;
    }

    // Calculate payment status
    const totalAmount = subtotal + taxDetails.totalTax;
    const paidAmount = invoice.paidAmount || 0;
    const remainingAmount = totalAmount - paidAmount;

    let paymentStatus = "Unpaid";
    if (paidAmount >= totalAmount) {
      paymentStatus = "Fully Paid";
    } else if (paidAmount > 0) {
      paymentStatus = "Partially Paid";
    }

    // Check if overdue
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const isOverdue = today > dueDate && remainingAmount > 0;

    return {
      ...invoice,
      taxDetails,
      subtotal,
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentStatus: invoice.paymentStatus || paymentStatus,
      isPaid: paidAmount >= totalAmount,
      isOverdue,
      displayInvoiceDate: formatIndianDate(invoice.invoiceDate),
      displayDueDate: formatIndianDate(invoice.dueDate),
      displayCreatedAt: formatIndianDateTime(invoice.createdAt),
      displayUpdatedAt: formatIndianDateTime(invoice.updatedAt),
    };
  } catch (error) {
    console.error("Error formatting invoice:", error);
    return { ...invoice, error: "Error processing invoice data" };
  }
};

/**
 * Validate invoice data
 * @param {object} invoiceData - Invoice data to validate
 * @returns {object} Validation result with errors array
 */
export const validateInvoiceData = (invoiceData) => {
  const errors = [];

  // Required fields
  if (!invoiceData.clientCode) {
    errors.push({ field: "clientCode", message: "Client code is required" });
  }

  if (!invoiceData.clientName) {
    errors.push({ field: "clientName", message: "Client name is required" });
  }

  if (!invoiceData.invoiceDate) {
    errors.push({ field: "invoiceDate", message: "Invoice date is required" });
  }

  if (!invoiceData.dueDate) {
    errors.push({ field: "dueDate", message: "Due date is required" });
  }

  // Services validation
  if (
    !invoiceData.services ||
    !Array.isArray(invoiceData.services) ||
    invoiceData.services.length === 0
  ) {
    errors.push({
      field: "services",
      message: "At least one service is required",
    });
  } else {
    invoiceData.services.forEach((service, index) => {
      if (!service.serviceName) {
        errors.push({
          field: `services[${index}].serviceName`,
          message: `Service ${index + 1} name is required`,
        });
      }
      if (!service.amount || parseFloat(service.amount) <= 0) {
        errors.push({
          field: `services[${index}].amount`,
          message: `Service ${index + 1} amount must be greater than 0`,
        });
      }
    });
  }

  // Date validation
  if (invoiceData.invoiceDate && invoiceData.dueDate) {
    const invoiceDate = new Date(invoiceData.invoiceDate);
    const dueDate = new Date(invoiceData.dueDate);

    if (dueDate < invoiceDate) {
      errors.push({
        field: "dueDate",
        message: "Due date cannot be before invoice date",
      });
    }
  }

  // Amount validation
  if (invoiceData.totalAmount && parseFloat(invoiceData.totalAmount) <= 0) {
    errors.push({
      field: "totalAmount",
      message: "Total amount must be greater than 0",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate invoice number
 * @param {object} settings - Invoice settings
 * @param {boolean} isBiller2 - Is biller 2
 * @param {number} sequence - Sequence number
 * @returns {string} Generated invoice number
 */
export const generateInvoiceNumber = (settings, isBiller2, sequence) => {
  try {
    const prefix = isBiller2
      ? settings.biller2Prefix || "INV-B2"
      : settings.biller1Prefix || "INV-B1";

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");

    // Format: PREFIX-YYYY-MM-SEQUENCE
    const sequenceStr = String(sequence).padStart(4, "0");

    return `${prefix}-${year}-${month}-${sequenceStr}`;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    return `INV-${Date.now()}`;
  }
};

/**
 * Calculate GST amounts
 * @param {number} amount - Taxable amount
 * @param {number} gstRate - GST rate percentage
 * @param {boolean} isInterState - Is inter-state transaction
 * @returns {object} GST calculation details
 */
export const calculateGST = (amount, gstRate = 18, isInterState = false) => {
  const taxableAmount = parseFloat(amount) || 0;
  const rate = parseFloat(gstRate) || 0;

  if (taxableAmount <= 0 || rate <= 0) {
    return {
      taxableAmount,
      gstRate: rate,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
      totalAmount: taxableAmount,
    };
  }

  let cgst = 0,
    sgst = 0,
    igst = 0;

  if (isInterState) {
    // Inter-state: IGST only
    igst = (taxableAmount * rate) / 100;
  } else {
    // Intra-state: CGST + SGST
    cgst = (taxableAmount * rate) / 2 / 100;
    sgst = (taxableAmount * rate) / 2 / 100;
  }

  const totalTax = cgst + sgst + igst;
  const totalAmount = taxableAmount + totalTax;

  return {
    taxableAmount,
    gstRate: rate,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
};

/**
 * Format payment method display
 * @param {string} method - Payment method
 * @returns {string} Formatted payment method
 */
export const formatPaymentMethod = (method) => {
  const methodMap = {
    cash: "Cash",
    cheque: "Cheque",
    bank_transfer: "Bank Transfer",
    rtgs: "RTGS",
    neft: "NEFT",
    imps: "IMPS",
    upi: "UPI",
    card: "Card",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    online_payment: "Online Payment",
    other: "Other",
  };

  return methodMap[method?.toLowerCase()] || method || "Unknown";
};

/**
 * Calculate days overdue
 * @param {string|Date} dueDate - Due date
 * @returns {number} Days overdue (0 if not overdue)
 */
export const getDaysOverdue = (dueDate) => {
  if (!dueDate) return 0;

  try {
    const due = new Date(dueDate);
    const today = new Date();

    // Set time to start of day for accurate comparison
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (today <= due) return 0;

    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    console.error("Error calculating days overdue:", error);
    return 0;
  }
};

/**
 * Get payment status color for UI using design system
 * @param {string} status - Payment status
 * @returns {string} Color code from design system
 */
export const getPaymentStatusColor = (status) => {
  const colorMap = {
    "Fully Paid": designSystem.colors.success.main,
    "Partially Paid": designSystem.colors.warning.main,
    Unpaid: designSystem.colors.error.main,
    Overdue: designSystem.colors.secondary.main,
    Cancelled: designSystem.colors.grey.main,
  };

  return colorMap[status] || designSystem.colors.grey.main;
};

/**
 * Get status badge configuration using design system
 * @param {string} status - Payment status
 * @returns {object} Status configuration
 */
export const getStatusBadgeConfig = (status) => {
  const statusMap = {
    "Fully Paid": {
      color: designSystem.status.paid.color,
      background: designSystem.status.paid.background,
      icon: "✅",
    },
    "Partially Paid": {
      color: designSystem.status.partial.color,
      background: designSystem.status.partial.background,
      icon: "⚠️",
    },
    Unpaid: {
      color: designSystem.status.unpaid.color,
      background: designSystem.status.unpaid.background,
      icon: "❌",
    },
    Overdue: {
      color: designSystem.status.overdue.color,
      background: designSystem.status.overdue.background,
      icon: "🚨",
    },
    Cancelled: {
      color: designSystem.status.cancelled.color,
      background: designSystem.status.cancelled.background,
      icon: "🚫",
    },
  };

  return statusMap[status] || statusMap.Unpaid;
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Debounce function for search optimization
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Export utility functions
 */
export default {
  formatIndianCurrency,
  formatIndianDate,
  formatIndianDateTime,
  getUserFromToken,
  isAuthenticated,
  hasPermission,
  formatInvoiceForDisplay,
  validateInvoiceData,
  generateInvoiceNumber,
  calculateGST,
  formatPaymentMethod,
  getDaysOverdue,
  getPaymentStatusColor,
  getStatusBadgeConfig,
  formatFileSize,
  debounce,
};
