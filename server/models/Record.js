// server/models/Record.js
const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema(
  {
    // Core identification
    direction: {
      type: String,
      required: true,
      enum: ["Inward", "Outward", "DELETION_REQUEST"],
    },

    // Client information
    clientType: {
      type: String,
      enum: ["Client", "NonClient"],
      default: "Client",
    },
    clientCode: {
      type: String,
      default: "",
    },
    clientName: {
      type: String,
      required: true,
    },

    // Personnel involved
    broughtBy: {
      type: String,
      default: "",
    },
    receiverId: {
      type: String,
      default: "",
    },
    giverId: {
      type: String,
      default: "",
    },
    receiver: {
      type: String,
      default: "",
    },

    // Record details
    recordType: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      required: true,
    },
    storageLocation: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      required: true,
    },

    // Return tracking
    returnable: {
      type: Boolean,
      default: false,
    },
    isReturned: {
      type: Boolean,
      default: false,
    },
    linkedInwardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Record",
      default: null,
    },

    // Status
    status: {
      type: String,
      enum: ["Active", "Inactive", "Returned"],
      default: "Active",
    },

    // Timestamps
    timestamp: {
      type: Date,
      required: true,
    },
    actualTimestamp: {
      type: Date,
      default: Date.now,
    },

    // Approval system
    pendingAdminApproval: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },

    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // For deletion requests
    originalRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Record",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
recordSchema.index({ direction: 1, timestamp: -1 });
recordSchema.index({ clientCode: 1 });
recordSchema.index({ clientName: "text" });
recordSchema.index({ pendingAdminApproval: 1 });
recordSchema.index({ returnable: 1, isReturned: 1 });
recordSchema.index({ createdBy: 1 });
recordSchema.index({ timestamp: 1 });

// Virtual for checking if record is backdated
recordSchema.virtual("isBackdated").get(function () {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.timestamp < oneDayAgo;
});

// Virtual for formatted timestamp
recordSchema.virtual("formattedTimestamp").get(function () {
  return this.timestamp.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
});

// Virtual for formatted actual timestamp
recordSchema.virtual("formattedActualTimestamp").get(function () {
  if (!this.actualTimestamp) return null;
  return this.actualTimestamp.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

// Pre-save middleware to ensure data consistency
recordSchema.pre("save", function (next) {
  // Ensure actualTimestamp is set
  if (!this.actualTimestamp) {
    this.actualTimestamp = new Date();
  }

  // Validate client information based on type
  if (this.clientType === "Client" && !this.clientCode) {
    return next(new Error("Client code is required for existing clients"));
  }

  if (this.clientType === "NonClient" && !this.clientName) {
    return next(new Error("Client name is required for non-clients"));
  }

  // Validate direction-specific fields
  if (this.direction === "Inward") {
    if (!this.receiverId || !this.broughtBy) {
      return next(
        new Error("Receiver and brought by are required for inward records")
      );
    }
  }

  if (this.direction === "Outward") {
    if (!this.giverId || !this.receiver) {
      return next(
        new Error("Giver and receiver are required for outward records")
      );
    }
  }

  next();
});

// Static method to find pending returns
recordSchema.statics.findPendingReturns = function () {
  return this.find({
    direction: "Inward",
    returnable: true,
    isReturned: { $ne: true },
    pendingAdminApproval: { $ne: true },
  }).sort({ timestamp: -1 });
};

// Static method to find records by client
recordSchema.statics.findByClient = function (clientSearch) {
  const searchRegex = new RegExp(clientSearch, "i");
  return this.find({
    $or: [{ clientCode: searchRegex }, { clientName: searchRegex }],
    pendingAdminApproval: { $ne: true },
  }).sort({ timestamp: -1 });
};

// Instance method to check if user can edit this record
recordSchema.methods.canEdit = function (userId, isAdmin) {
  if (isAdmin) return true;
  return this.createdBy.toString() === userId.toString();
};

// Instance method to check if record needs approval for changes
recordSchema.methods.needsApprovalForChanges = function (newTimestamp) {
  if (!newTimestamp) return false;
  const newDate = new Date(newTimestamp);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return newDate < oneDayAgo;
};

module.exports = mongoose.model("Record", recordSchema);
