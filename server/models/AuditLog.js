const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  clientCode: { type: String, required: true },
  clientName: { type: String, required: true },
  actionPerformed: { type: String, required: true }, // e.g., "lock_import", "unlock_import"
  userId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
