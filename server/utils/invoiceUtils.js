// client/src/utils/invoiceUtils.js
import { format, parse, isValid } from "date-fns";

// Convert number to words (Indian style)
export const numberToWords = (num) => {
  if (num === 0) return "Zero";

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

  const convertHundreds = (n) => {
    let result = "";
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      result += ones[n] + " ";
    }
    return result.trim();
  };

  let result = "";
  let crores = Math.floor(num / 10000000);
  num %= 10000000;
  let lakhs = Math.floor(num / 100000);
  num %= 100000;
  let thousands = Math.floor(num / 1000);
  num %= 1000;
  let hundreds = num;

  if (crores > 0) result += convertHundreds(crores) + " Crore ";
  if (lakhs > 0) result += convertHundreds(lakhs) + " Lakh ";
  if (thousands > 0) result += convertHundreds(thousands) + " Thousand ";
  if (hundreds > 0) result += convertHundreds(hundreds);

  return result.trim();
};

// Format date to dd-MMM-yyyy
export const formatIndianDate = (date) => {
  try {
    return format(new Date(date), "dd-MMM-yyyy");
  } catch (error) {
    console.error("Error formatting date:", error.message);
    return "";
  }
};

// Parse various formats to yyyy-MM-dd
export const parseIndianDate = (dateString) => {
  if (!dateString) return new Date().toISOString().split("T")[0];

  const formats = [
    "dd-MMM-yyyy",
    "yyyy-MM-dd",
    "MM/dd/yyyy",
    "dd/MM/yyyy",
    "yyyy/MM/dd",
    "MMM dd, yyyy",
  ];

  for (const formatString of formats) {
    try {
      const parsed = parse(dateString, formatString, new Date());
      if (isValid(parsed)) {
        return format(parsed, "yyyy-MM-dd");
      }
    } catch (error) {
      // Try next format
    }
  }

  console.error("Invalid date format:", dateString);
  return new Date().toISOString().split("T")[0];
};

// Format currency as INR
export const formatIndianCurrency = (amount) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error("Error formatting currency:", error.message);
    return "₹0.00";
  }
};

// Payment summary calculation
export const calculatePaymentSummary = (invoice) => {
  if (!invoice.payments || invoice.payments.length === 0) {
    return {
      totalPaid: 0,
      totalPending: Math.round(invoice.totalAmount),
      paymentPercentage: 0,
      formattedTotalPaid: formatIndianCurrency(0),
      formattedTotalPending: formatIndianCurrency(
        Math.round(invoice.totalAmount)
      ),
      paymentsByMode: {},
    };
  }

  const totalPaid = invoice.payments.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0
  );
  const roundedTotalPaid = Math.round(totalPaid);
  const totalPending = Math.round(invoice.totalAmount) - roundedTotalPaid;
  const paymentPercentage = Math.round(
    (roundedTotalPaid / Math.round(invoice.totalAmount)) * 100
  );

  const paymentsByMode = invoice.payments.reduce((acc, payment) => {
    const mode = payment.mode || "Unknown";
    if (!acc[mode]) acc[mode] = { amount: 0, count: 0 };
    acc[mode].amount += payment.amount || 0;
    acc[mode].count += 1;
    return acc;
  }, {});

  Object.keys(paymentsByMode).forEach((mode) => {
    paymentsByMode[mode].formattedAmount = formatIndianCurrency(
      paymentsByMode[mode].amount
    );
  });

  return {
    totalPaid: roundedTotalPaid,
    totalPending,
    paymentPercentage,
    formattedTotalPaid: formatIndianCurrency(roundedTotalPaid),
    formattedTotalPending: formatIndianCurrency(totalPending),
    paymentsByMode,
  };
};

// Validate payment array
export const validatePayment = (payments) => {
  const errors = [];

  if (!payments || payments.length === 0) {
    errors.push("At least one payment entry is required");
    return { errors };
  }

  let totalAmount = 0;

  payments.forEach((payment, index) => {
    if (!payment.amount || parseFloat(payment.amount) <= 0) {
      errors.push(`Payment ${index + 1}: Amount must be greater than 0`);
    } else {
      totalAmount += parseFloat(payment.amount);
    }

    if (!payment.mode || payment.mode.trim() === "") {
      errors.push(`Payment ${index + 1}: Payment mode is required`);
    }

    if (!payment.date) {
      errors.push(`Payment ${index + 1}: Payment date is required`);
    }
  });

  return { errors, totalAmount };
};

// Decode user from JWT
export const getUserFromToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      id: payload.id,
      username: payload.username || payload.name,
      role: payload.role,
      isAdmin: payload.isAdmin,
    };
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

export {
  numberToWords,
  formatIndianCurrency,
  formatIndianDate,
  calculatePaymentSummary,
  validatePayment,
  getUserFromToken,
  parseIndianDate,
};
