// server/routes/settings.js
const express = require("express");
const Settings = require("../models/Settings");
const router = express.Router();

const auth = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "No authorization header provided." });
  }
  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "null") {
    return res.status(401).json({ message: "No token provided." });
  }
  try {
    const decoded = require("jsonwebtoken").verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
    req.user = decoded;
    req.isAdmin = decoded.isAdmin || false;
    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    return res.status(401).json({ message: "Invalid token." });
  }
};

const adminAuth = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
};

router.get("/invoice", auth, async (req, res) => {
  try {
    const settings = await Settings.findOne({ type: "invoice" });
    if (!settings) {
      return res.status(404).json({ message: "Invoice settings not found" });
    }
    res.json(settings.invoiceSettings);
  } catch (err) {
    console.error("Error fetching invoice settings:", err.message, err.stack);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

router.post("/invoice", auth, adminAuth, async (req, res) => {
  try {
    const settingsData = req.body;
    if (
      !settingsData.biller1FirmName ||
      !settingsData.biller2FirmName ||
      !settingsData.biller1State ||
      !settingsData.biller2State
    ) {
      return res.status(400).json({
        message: "Firm names and states are required for both billers",
      });
    }
    if (settingsData.isBiller1GSTApplicable && !settingsData.biller1Gstin) {
      return res.status(400).json({
        message: "GSTIN required for Biller-1 when GST is applicable",
      });
    }
    if (settingsData.isBiller2GSTApplicable && !settingsData.biller2Gstin) {
      return res.status(400).json({
        message: "GSTIN required for Biller-2 when GST is applicable",
      });
    }
    if (settingsData.startingSequence < 1) {
      return res
        .status(400)
        .json({ message: "Starting sequence must be a positive number" });
    }

    const settings = await Settings.findOneAndUpdate(
      { type: "invoice" },
      { $set: { invoiceSettings: settingsData } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(settings.invoiceSettings);
  } catch (err) {
    console.error("Error saving invoice settings:", err.message, err.stack);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

router.get("/invoice/default", auth, async (req, res) => {
  try {
    const defaultSettings = {
      biller1Terminology: "Biller-1",
      biller2Terminology: "Biller-2",
      biller1FirmName: "Default Firm",
      biller2FirmName: "Default Firm",
      biller1InvoicePrefix: "INV-FY",
      biller2InvoicePrefix: "BILL",
      invoiceNumberFormat: "YYYY-SEQ",
      biller1Address: "",
      biller2Address: "",
      biller1Contact: "",
      biller2Contact: "",
      biller1Gstin: "",
      biller2Gstin: "",
      biller1Email: "",
      biller2Email: "",
      biller1Terms:
        "1. Payment due within 7 days.\n2. Late payment charges may apply.\n3. Disputes subject to local jurisdiction.",
      biller2Terms:
        "1. Payment due within 7 days.\n2. Late payment charges may apply.\n3. Disputes subject to local jurisdiction.",
      biller1BankDetails: {
        accountName: "",
        accountNumber: "",
        bankName: "",
        ifsc: "",
        branch: "",
      },
      biller2BankDetails: {
        accountName: "",
        accountNumber: "",
        bankName: "",
        ifsc: "",
        branch: "",
      },
      isBiller1GSTApplicable: true,
      isBiller2GSTApplicable: false,
      biller1State: "",
      biller2State: "",
      startingSequence: 1,
    };
    res.json(defaultSettings);
  } catch (err) {
    console.error(
      "Error fetching default invoice settings:",
      err.message,
      err.stack
    );
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

module.exports = router;
