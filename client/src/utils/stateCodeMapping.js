// client/src/utils/stateCodeMapping.js
// State code mapping for automatic place of supply determination from GSTIN

export const STATE_CODE_MAPPING = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  10: "Bihar",
  11: "Sikkim",
  12: "Arunachal Pradesh",
  13: "Nagaland",
  14: "Manipur",
  15: "Mizoram",
  16: "Tripura",
  17: "Meghalaya",
  18: "Assam",
  19: "West Bengal",
  20: "Jharkhand",
  21: "Odisha",
  22: "Chhattisgarh",
  23: "Madhya Pradesh",
  24: "Gujarat",
  25: "Daman and Diu",
  26: "Dadra and Nagar Haveli",
  27: "Maharashtra",
  28: "Andhra Pradesh (before split)",
  29: "Karnataka",
  30: "Goa",
  31: "Lakshadweep",
  32: "Kerala",
  33: "Tamil Nadu",
  34: "Puducherry",
  35: "Andaman and Nicobar Islands",
  36: "Telangana",
  37: "Andhra Pradesh",
  38: "Ladakh",
};

/**
 * Extract state name from GSTIN
 * @param {string} gstin - 15 character GSTIN
 * @returns {string|null} - State name or null if invalid
 */
export const getStateFromGSTIN = (gstin) => {
  if (!gstin || typeof gstin !== "string") {
    return null;
  }

  const cleanGSTIN = gstin.trim().toUpperCase();

  // GSTIN should be exactly 15 characters
  if (cleanGSTIN.length !== 15) {
    return null;
  }

  // Extract state code (first 2 digits)
  const stateCode = cleanGSTIN.substring(0, 2);

  return STATE_CODE_MAPPING[stateCode] || null;
};

/**
 * Validate GSTIN format
 * @param {string} gstin - GSTIN to validate
 * @returns {boolean} - True if valid format
 */
export const isValidGSTIN = (gstin) => {
  if (!gstin || typeof gstin !== "string") {
    return false;
  }

  const cleanGSTIN = gstin.trim().toUpperCase();

  // Basic format check: 15 characters, starts with 2 digits
  const gstinPattern = /^[0-9]{2}[A-Z0-9]{13}$/;

  if (!gstinPattern.test(cleanGSTIN)) {
    return false;
  }

  // Check if state code is valid
  const stateCode = cleanGSTIN.substring(0, 2);
  return STATE_CODE_MAPPING.hasOwnProperty(stateCode);
};

/**
 * Get detailed GSTIN information
 * @param {string} gstin - GSTIN to analyze
 * @returns {object} - Detailed GSTIN information
 */
export const getGSTINInfo = (gstin) => {
  if (!gstin || typeof gstin !== "string") {
    return {
      isValid: false,
      stateCode: null,
      stateName: null,
      entityCode: null,
      pan: null,
      checksum: null,
    };
  }

  const cleanGSTIN = gstin.trim().toUpperCase();

  if (cleanGSTIN.length !== 15) {
    return {
      isValid: false,
      stateCode: null,
      stateName: null,
      entityCode: null,
      pan: null,
      checksum: null,
    };
  }

  const stateCode = cleanGSTIN.substring(0, 2);
  const pan = cleanGSTIN.substring(2, 12);
  const entityCode = cleanGSTIN.substring(12, 13);
  const checksum = cleanGSTIN.substring(14, 15);

  return {
    isValid: isValidGSTIN(cleanGSTIN),
    stateCode,
    stateName: STATE_CODE_MAPPING[stateCode] || null,
    entityCode,
    pan,
    checksum,
    fullGSTIN: cleanGSTIN,
  };
};

/**
 * Determine place of supply based on GST registration status
 * @param {object} clientData - Client information
 * @param {string} supplierState - Supplier's state
 * @returns {object} - Place of supply determination result
 */
export const determinePlaceOfSupply = (clientData, supplierState) => {
  if (!clientData) {
    return {
      placeOfSupply: supplierState || "",
      determinedBy: "supplier_location",
      reason: "No client data provided",
      isRegistered: false,
    };
  }

  const gstin = clientData.gstin?.trim();

  if (gstin && gstin.length === 15) {
    const gstinInfo = getGSTINInfo(gstin);

    if (gstinInfo.isValid && gstinInfo.stateName) {
      return {
        placeOfSupply: gstinInfo.stateName,
        determinedBy: "recipient_location",
        reason: "Recipient is GST registered",
        isRegistered: true,
        gstStateCode: gstinInfo.stateCode,
        gstinInfo,
      };
    } else {
      return {
        placeOfSupply: supplierState || "",
        determinedBy: "supplier_location",
        reason: "Invalid GST number format",
        isRegistered: false,
        gstinInfo,
      };
    }
  } else {
    return {
      placeOfSupply: supplierState || "",
      determinedBy: "supplier_location",
      reason: "Recipient is not GST registered",
      isRegistered: false,
    };
  }
};

export default {
  STATE_CODE_MAPPING,
  getStateFromGSTIN,
  isValidGSTIN,
  getGSTINInfo,
  determinePlaceOfSupply,
};
