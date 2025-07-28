const express = require("express");
const Config = require("../models/Config");
const AuditLog = require("../models/AuditLog");

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Get import lock state
router.get("/import-lock", async (req, res) => {
  try {
    const config = await Config.findOne({ key: "isImportLocked" });
    res.status(200).json({ isImportLocked: config ? config.value : false });
  } catch (err) {
    console.error("Error fetching import lock state:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Set import lock state (admin only)
router.post("/import-lock", isAdmin, async (req, res) => {
  const { isImportLocked, clientCode, clientName } = req.body; // Added clientCode and clientName
  try {
    await Config.updateOne(
      { key: "isImportLocked" },
      { key: "isImportLocked", value: isImportLocked },
      { upsert: true }
    );

    // Log the action
    const auditLog = new AuditLog({
      clientCode: clientCode || "N/A",
      clientName: clientName || "N/A",
      actionPerformed: isImportLocked ? "lock_import" : "unlock_import",
      userId: req.user.id,
      timestamp: new Date(),
    });
    await auditLog.save();

    res.status(200).json({ message: "Import lock state updated successfully" });
  } catch (err) {
    console.error("Error updating import lock state:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;
