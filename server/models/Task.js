// server/models/Task.js - ENHANCED VERSION WITH PERIOD BILLING SUPPORT
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TaskSchema = new Schema(
  {
    clientCode: { type: String, required: true, index: true },
    serviceCode: { type: String, required: true },
    serviceName: { type: String, required: true, index: true },
    teamMemberId: { type: String, required: true },
    assignedAt: { type: Date, required: true, index: true },
    dueDate: { type: Date, required: true },
    status: { type: String, required: true, default: "Pending", index: true },
    completedAt: { type: Date },
    financialYear: { type: String, required: true, index: true },
    relatedFinancialYear: { type: String, required: true },
    servicePeriod: { type: String, required: true },
    overdue: { type: Boolean, default: false },

    // CRITICAL: Fields for admin approval workflow and deletion protection
    pendingAction: { type: String }, // "delete", "complete", "status_change", etc.
    previousStatus: { type: String }, // Store previous status for rollback
    pendingStatus: { type: String }, // Store intended status change
    remarks: [
      {
        action: String,
        remark: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // NEW: Period billing related fields
    isPartOfPeriodBilling: { type: Boolean, default: false },
    periodBillingInfo: {
      invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
      },
      periodType: {
        type: String,
        enum: ["weekly", "monthly", "quarterly", "custom"],
      },
      periodStartDate: Date,
      periodEndDate: Date,
      periodServiceName: String,
      rate: Number,
      billedAt: Date,
    },

    // ENHANCED: Billing metadata
    billingMetadata: {
      isBilled: { type: Boolean, default: false },
      billedAt: Date,
      billingType: {
        type: String,
        enum: ["individual", "period"],
        default: "individual",
      },
      invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
      },
      taskBillingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TaskBilling",
      },
    },

    // Additional fields for better organization
    tags: [String],
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    estimatedHours: Number,
    actualHours: Number,
    description: String,
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add indexes for better query performance
TaskSchema.index({ status: 1, clientCode: 1 });
TaskSchema.index({ teamMemberId: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ assignedAt: 1 });
TaskSchema.index({ serviceName: 1, clientCode: 1 });
TaskSchema.index({ "billingMetadata.isBilled": 1 });
TaskSchema.index({ isPartOfPeriodBilling: 1 });
TaskSchema.index({ financialYear: 1, clientCode: 1 });

// Virtual fields
TaskSchema.virtual("isOverdue").get(function () {
  return new Date() > this.dueDate && this.status !== "Completed";
});

TaskSchema.virtual("daysPastDue").get(function () {
  if (this.status === "Completed") return 0;
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = today - dueDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

TaskSchema.virtual("canBeBilled").get(function () {
  return (
    !this.billingMetadata.isBilled &&
    !this.isDeleted &&
    this.status !== "deleted"
  );
});

TaskSchema.virtual("billingStatus").get(function () {
  if (this.billingMetadata.isBilled) {
    return this.billingMetadata.billingType === "period"
      ? "Period Billed"
      : "Individually Billed";
  }
  return "Not Billed";
});

// Static methods
TaskSchema.statics.findBillableTasks = function (clientCode, options = {}) {
  const query = {
    clientCode,
    "billingMetadata.isBilled": false,
    isDeleted: { $ne: true },
    status: { $ne: "deleted" },
  };

  if (options.status) {
    const statusArray = Array.isArray(options.status)
      ? options.status
      : [options.status];
    query.status = { $in: statusArray };
  }

  if (options.serviceName) {
    query.serviceName = { $regex: options.serviceName, $options: "i" };
  }

  if (options.startDate || options.endDate) {
    query.assignedAt = {};
    if (options.startDate) query.assignedAt.$gte = new Date(options.startDate);
    if (options.endDate) query.assignedAt.$lte = new Date(options.endDate);
  }

  return this.find(query).sort({ assignedAt: -1 });
};

TaskSchema.statics.findForPeriodBilling = function (
  clientCode,
  serviceName,
  startDate,
  endDate
) {
  return this.find({
    clientCode,
    serviceName: { $regex: serviceName, $options: "i" },
    assignedAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    "billingMetadata.isBilled": false,
    isDeleted: { $ne: true },
    status: { $ne: "deleted" },
  }).sort({ assignedAt: 1 });
};

TaskSchema.statics.getBillingStats = async function (clientCode, options = {}) {
  const matchCondition = { clientCode };

  if (options.startDate || options.endDate) {
    matchCondition.assignedAt = {};
    if (options.startDate)
      matchCondition.assignedAt.$gte = new Date(options.startDate);
    if (options.endDate)
      matchCondition.assignedAt.$lte = new Date(options.endDate);
  }

  const pipeline = [
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        billedTasks: {
          $sum: {
            $cond: ["$billingMetadata.isBilled", 1, 0],
          },
        },
        periodBilledTasks: {
          $sum: {
            $cond: [{ $eq: ["$billingMetadata.billingType", "period"] }, 1, 0],
          },
        },
        individuallyBilledTasks: {
          $sum: {
            $cond: [
              { $eq: ["$billingMetadata.billingType", "individual"] },
              1,
              0,
            ],
          },
        },
        unbilledTasks: {
          $sum: {
            $cond: ["$billingMetadata.isBilled", 0, 1],
          },
        },
        statusBreakdown: { $push: "$status" },
      },
    },
  ];

  const [stats] = await this.aggregate(pipeline);
  return (
    stats || {
      totalTasks: 0,
      billedTasks: 0,
      periodBilledTasks: 0,
      individuallyBilledTasks: 0,
      unbilledTasks: 0,
      statusBreakdown: [],
    }
  );
};

// Instance methods
TaskSchema.methods.markAsBilled = function (
  invoiceId,
  taskBillingId,
  billingType = "individual"
) {
  this.billingMetadata = {
    isBilled: true,
    billedAt: new Date(),
    billingType,
    invoiceId,
    taskBillingId,
  };

  if (billingType === "period") {
    this.isPartOfPeriodBilling = true;
  }

  return this.save();
};

TaskSchema.methods.markAsPeriodBilled = function (invoiceId, periodInfo) {
  this.billingMetadata = {
    isBilled: true,
    billedAt: new Date(),
    billingType: "period",
    invoiceId,
  };

  this.isPartOfPeriodBilling = true;
  this.periodBillingInfo = {
    invoiceId,
    periodType: periodInfo.type,
    periodStartDate: periodInfo.startDate,
    periodEndDate: periodInfo.endDate,
    periodServiceName: periodInfo.serviceName,
    rate: periodInfo.rate,
    billedAt: new Date(),
  };

  return this.save();
};

TaskSchema.methods.unmarkAsBilled = function () {
  this.billingMetadata = {
    isBilled: false,
    billingType: "individual",
  };

  this.isPartOfPeriodBilling = false;
  this.periodBillingInfo = undefined;

  return this.save();
};

TaskSchema.methods.addRemark = function (action, remark) {
  this.remarks.push({
    action,
    remark,
    timestamp: new Date(),
  });

  return this.save();
};

// Pre-save middleware
TaskSchema.pre("save", function (next) {
  // Auto-set overdue flag
  if (this.status !== "Completed" && new Date() > this.dueDate) {
    this.overdue = true;
  } else {
    this.overdue = false;
  }

  // Ensure billing metadata consistency
  if (this.billingMetadata.isBilled && !this.billingMetadata.billedAt) {
    this.billingMetadata.billedAt = new Date();
  }

  next();
});

// Post-save middleware for logging
TaskSchema.post("save", function (doc) {
  if (doc.isModified("billingMetadata.isBilled")) {
    console.log(
      `📋 Task ${doc._id} billing status changed: ${
        doc.billingMetadata.isBilled ? "Billed" : "Unbilled"
      }`
    );
  }
});

module.exports = mongoose.model("Task", TaskSchema);
