// server/models/Invoice.js - ENHANCED VERSION WITH PERIOD BILLING SUPPORT
const mongoose = require("mongoose");

// ENHANCED: Service schema with period billing support
const serviceSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: false,
  },
  serviceCode: {
    type: String,
    required: true,
    trim: true,
    default: "UNKNOWN",
  },
  serviceName: {
    type: String,
    required: true,
    trim: true,
  },
  sacCode: {
    type: String,
    default: "998314",
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  servicePeriod: {
    type: String,
    default: "N/A",
    trim: true,
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  customServiceType: {
    type: String,
    enum: [
      "DSC_ISSUANCE",
      "CONSULTATION",
      "ADMIN_FEE",
      "MISC",
      "PERIOD_BILLING",
      "OTHER",
    ],
    default: "OTHER",
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // NEW: Period billing fields
  isPeriodBilling: {
    type: Boolean,
    default: false,
  },
  periodDetails: {
    frequency: {
      type: String,
      enum: ["weekly", "monthly", "quarterly", "yearly", "custom"],
    },
    startDate: Date,
    endDate: Date,
    rate: Number,
    tasksCount: Number,
    expectedTasks: Number, // NEW: Expected tasks based on frequency calculation
    actualTasks: Number, // NEW: Actual tasks found
    taskIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    displayText: String, // NEW: Clean display text for period
    periodSettings: {
      startMonth: Number,
      endMonth: Number,
      startQuarter: String,
      endQuarter: String,
      startWeek: Number,
      endWeek: Number,
    },
  },
});

// Tax details schema
const taxDetailsSchema = new mongoose.Schema({
  cgst: {
    type: Number,
    default: 0,
    min: 0,
  },
  sgst: {
    type: Number,
    default: 0,
    min: 0,
  },
  igst: {
    type: Number,
    default: 0,
    min: 0,
  },
  taxableAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  gstRate: {
    type: Number,
    default: 18,
  },
});

// Payment schema for embedded payments
const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  method: {
    type: String,
    enum: ["Cash", "Cheque", "Bank Transfer", "UPI", "Card", "Other"],
    required: true,
  },
  reference: {
    type: String,
    trim: true,
    default: "",
  },
  notes: {
    type: String,
    trim: true,
    default: "",
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recordedAt: {
    type: Date,
    default: Date.now,
  },
});

// Edit request schema
const editRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  reason: {
    type: String,
    trim: true,
    default: "",
  },
  adminNotes: {
    type: String,
    trim: true,
    default: "",
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  processedAt: {
    type: Date,
  },
});

// Delete request schema
const deleteRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  adminNotes: {
    type: String,
    trim: true,
    default: "",
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  processedAt: {
    type: Date,
  },
});

// Main Invoice schema
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    clientCode: {
      type: String,
      required: false, // FIXED: Made optional for non-client invoices
      trim: true,
      index: true,
      default: "", // Default to empty string for non-client invoices
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    firmName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    gstin: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function (v) {
          // GSTIN validation: 15 characters if provided
          return !v || v.length === 0 || v.length === 15;
        },
        message: "GSTIN must be exactly 15 characters when provided",
      },
    },
    placeOfSupply: {
      type: String,
      required: true,
      trim: true,
    },
    salutation: {
      type: String,
      enum: ["M/s", "Mr.", "Ms.", "Mrs.", "Dr.", "Prof.", "Sir", "Madam"],
      default: "M/s",
    },
    billerState: {
      type: String,
      required: true,
      trim: true,
    },
    taskBillingIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TaskBilling",
      },
    ],
    services: [serviceSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    taxDetails: taxDetailsSchema,
    isBiller2: {
      type: Boolean,
      default: false,
    },
    includeInGSTR1: {
      type: Boolean,
      default: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid", "Overdue"],
      default: "Unpaid",
      index: true,
    },
    payments: [paymentSchema],
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    customerNotes: {
      type: String,
      trim: true,
      default: "",
    },
    editRequests: [editRequestSchema],
    deleteRequests: [deleteRequestSchema],
    status: {
      type: String,
      enum: ["Draft", "Sent", "Paid", "Overdue", "Cancelled"],
      default: "Draft",
      index: true,
    },
    // FIXED: Enhanced fields for better place of supply management
    placeOfSupplyDeterminedBy: {
      type: String,
      enum: ["recipient_location", "supplier_location", "manual"],
      default: "manual",
    },
    // Additional fields for enhanced functionality
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastModifiedAt: {
      type: Date,
    },
    // Versioning for edit history
    version: {
      type: Number,
      default: 1,
    },
    // Financial year for reporting
    financialYear: {
      type: String,
      default: function () {
        const year = new Date().getFullYear();
        return `FY${year % 100}`;
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
invoiceSchema.index({ clientCode: 1, invoiceDate: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ paymentStatus: 1, invoiceDate: -1 });
invoiceSchema.index({ createdBy: 1, createdAt: -1 });
invoiceSchema.index({ isBiller2: 1, financialYear: 1 });
invoiceSchema.index({ "editRequests.status": 1 });
invoiceSchema.index({ "deleteRequests.status": 1 });
invoiceSchema.index({ gstin: 1 });
invoiceSchema.index({ placeOfSupply: 1 });
invoiceSchema.index({ "services.isPeriodBilling": 1 });

// Virtual fields
invoiceSchema.virtual("formattedInvoiceNumber").get(function () {
  return `#${this.invoiceNumber}`;
});

invoiceSchema.virtual("isFullyPaid").get(function () {
  return this.paidAmount >= this.totalAmount;
});

invoiceSchema.virtual("isOverdue").get(function () {
  return new Date() > this.dueDate && this.paymentStatus !== "Paid";
});

invoiceSchema.virtual("daysPastDue").get(function () {
  if (this.paymentStatus === "Paid") return 0;
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = today - dueDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

invoiceSchema.virtual("gstStatus").get(function () {
  return this.gstin && this.gstin.trim().length > 0
    ? "registered"
    : "unregistered";
});

invoiceSchema.virtual("isGSTRegistered").get(function () {
  return this.gstin && this.gstin.trim().length > 0;
});

// NEW: Virtual for period billing services count
invoiceSchema.virtual("periodBillingServicesCount").get(function () {
  return this.services.filter((service) => service.isPeriodBilling).length;
});

// Pre-save middleware for calculations and validations
invoiceSchema.pre("save", function (next) {
  // Calculate balance amount
  this.balanceAmount = this.totalAmount - this.paidAmount;

  // Update payment status based on payment amount
  if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = "Paid";
    this.status = "Paid";
  } else if (this.paidAmount > 0) {
    this.paymentStatus = "Partial";
  } else {
    this.paymentStatus = "Unpaid";
  }

  // Check if overdue
  if (this.paymentStatus !== "Paid" && new Date() > this.dueDate) {
    this.paymentStatus = "Overdue";
    this.status = "Overdue";
  }

  // Set last modified fields
  if (this.isModified() && !this.isNew) {
    this.lastModifiedAt = new Date();
    this.version += 1;
  }

  next();
});

// Static methods
invoiceSchema.statics.generateInvoiceNumber = async function (
  isBiller2 = false
) {
  try {
    const Settings = mongoose.model("Settings");
    const settings = await Settings.findOne({ type: "invoice" });

    if (!settings) {
      throw new Error("Invoice settings not found");
    }

    const year = new Date().getFullYear();
    const prefix = isBiller2
      ? settings.invoiceSettings.biller2InvoicePrefix || "BILL"
      : settings.invoiceSettings.biller1InvoicePrefix || "INV-FY";

    const lastInvoice = await this.findOne(
      { invoiceNumber: { $regex: `^${prefix}` } },
      {},
      { sort: { createdAt: -1 } }
    );

    let sequence = 1;
    if (lastInvoice) {
      const lastNumber = lastInvoice.invoiceNumber.split("-").pop();
      sequence = parseInt(lastNumber) + 1;
    }

    const paddedSequence = sequence.toString().padStart(3, "0");
    return `${prefix}-${year}-${paddedSequence}`;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    throw error;
  }
};

invoiceSchema.statics.findByClientCode = function (clientCode, options = {}) {
  return this.find({ clientCode })
    .populate("createdBy", "username email")
    .populate("services.taskId", "serviceName")
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

invoiceSchema.statics.getStats = async function (filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
        paidAmount: { $sum: "$paidAmount" },
        avgAmount: { $avg: "$totalAmount" },
        statusCounts: {
          $push: "$status",
        },
        paymentStatusCounts: {
          $push: "$paymentStatus",
        },
        periodBillingCount: {
          $sum: {
            $size: {
              $filter: {
                input: "$services",
                cond: { $eq: ["$$this.isPeriodBilling", true] },
              },
            },
          },
        },
      },
    },
  ];

  const [stats] = await this.aggregate(pipeline);
  return (
    stats || {
      totalInvoices: 0,
      totalAmount: 0,
      paidAmount: 0,
      avgAmount: 0,
      statusCounts: [],
      paymentStatusCounts: [],
      periodBillingCount: 0,
    }
  );
};

// Enhanced static method for place of supply determination
invoiceSchema.statics.determinePlaceOfSupply = function (
  clientData,
  billerState
) {
  if (!clientData) return "";

  // If recipient has GSTIN (registered), place of supply = recipient location
  if (clientData.gstin && clientData.gstin.trim()) {
    return {
      placeOfSupply: clientData.placeOfSupply || clientData.state || "",
      determinedBy: "recipient_location",
      reason: "Recipient is GST registered",
    };
  }

  // If recipient has no GSTIN (unregistered), place of supply = supplier location
  return {
    placeOfSupply: billerState,
    determinedBy: "supplier_location",
    reason: "Recipient is not GST registered",
  };
};

// NEW: Static method for period billing analysis
invoiceSchema.statics.analyzePeriodBilling = async function (filters = {}) {
  const pipeline = [
    { $match: filters },
    { $unwind: "$services" },
    { $match: { "services.isPeriodBilling": true } },
    {
      $group: {
        _id: {
          frequency: "$services.periodDetails.frequency",
          clientCode: "$clientCode",
        },
        count: { $sum: 1 },
        totalAmount: { $sum: "$services.amount" },
        avgAmount: { $avg: "$services.amount" },
        totalTasksCount: { $sum: "$services.periodDetails.tasksCount" },
        expectedTasksCount: { $sum: "$services.periodDetails.expectedTasks" },
        invoices: { $addToSet: "$_id" },
      },
    },
    {
      $group: {
        _id: "$_id.frequency",
        clientsCount: { $sum: 1 },
        totalPeriodBillings: { $sum: "$count" },
        totalAmount: { $sum: "$totalAmount" },
        avgAmountPerBilling: { $avg: "$avgAmount" },
        totalTasksCovered: { $sum: "$totalTasksCount" },
        totalExpectedTasks: { $sum: "$expectedTasksCount" },
        totalInvoices: { $sum: { $size: "$invoices" } },
      },
    },
    { $sort: { totalAmount: -1 } },
  ];

  return await this.aggregate(pipeline);
};

// Instance methods
invoiceSchema.methods.addPayment = function (paymentData) {
  if (!paymentData.amount || paymentData.amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  if (this.paidAmount + paymentData.amount > this.totalAmount) {
    throw new Error("Payment amount exceeds balance due");
  }

  this.payments.push(paymentData);
  this.paidAmount = this.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return this.save();
};

invoiceSchema.methods.updateServices = function (newServices, userId) {
  this.services = newServices.map((service) => ({
    ...service,
    addedBy: userId,
  }));

  // Recalculate total
  const subtotal = newServices.reduce(
    (sum, service) => sum + service.amount,
    0
  );

  // Recalculate taxes based on existing tax structure
  const gstRate = this.taxDetails.gstRate || 18;
  const taxAmount = (subtotal * gstRate) / 100;

  if (this.taxDetails.igst > 0) {
    this.taxDetails.igst = taxAmount;
    this.taxDetails.cgst = 0;
    this.taxDetails.sgst = 0;
  } else {
    this.taxDetails.cgst = taxAmount / 2;
    this.taxDetails.sgst = taxAmount / 2;
    this.taxDetails.igst = 0;
  }

  this.taxDetails.taxableAmount = subtotal;
  this.totalAmount = subtotal + taxAmount;

  return this.save();
};

invoiceSchema.methods.createEditRequest = function (
  changes,
  requestedBy,
  reason = ""
) {
  const editRequest = {
    requestedBy,
    changes,
    reason,
    status: "Pending",
  };

  this.editRequests.push(editRequest);
  return this.save();
};

invoiceSchema.methods.createDeleteRequest = function (reason, requestedBy) {
  const deleteRequest = {
    requestedBy,
    reason,
    status: "Pending",
  };

  this.deleteRequests.push(deleteRequest);
  return this.save();
};

// Enhanced method for automatic place of supply update
invoiceSchema.methods.updatePlaceOfSupply = function (clientData, billerState) {
  const result = this.constructor.determinePlaceOfSupply(
    clientData,
    billerState
  );
  this.placeOfSupply = result.placeOfSupply;
  this.placeOfSupplyDeterminedBy = result.determinedBy;

  // Store determination metadata
  this.metadata = {
    ...this.metadata,
    placeOfSupplyDetermination: {
      reason: result.reason,
      updatedAt: new Date(),
      clientGSTIN: clientData.gstin || null,
    },
  };

  return this;
};

// NEW: Method to add period billing service
invoiceSchema.methods.addPeriodBillingService = function (
  periodBillingData,
  userId
) {
  const periodService = {
    taskId: null, // Period billing doesn't have a specific task ID
    serviceCode: "PERIOD",
    serviceName: periodBillingData.serviceName,
    sacCode: periodBillingData.sacCode || "998314",
    amount: periodBillingData.amount,
    servicePeriod: periodBillingData.servicePeriod,
    isCustom: true,
    isPeriodBilling: true,
    description: periodBillingData.description || "",
    addedBy: userId,
    periodDetails: {
      frequency: periodBillingData.frequency,
      startDate: periodBillingData.startDate,
      endDate: periodBillingData.endDate,
      rate: periodBillingData.rate,
      tasksCount: periodBillingData.tasksCount,
      expectedTasks: periodBillingData.expectedTasks,
      actualTasks: periodBillingData.actualTasks,
      taskIds: periodBillingData.taskIds || [],
      displayText: periodBillingData.displayText,
      periodSettings: periodBillingData.periodSettings,
    },
  };

  this.services.push(periodService);
  return this;
};

module.exports = mongoose.model("Invoice", invoiceSchema);
