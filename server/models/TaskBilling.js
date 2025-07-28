// server/models/TaskBilling.js - ENHANCED VERSION WITH PERIOD BILLING SUPPORT
const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const taskBillingSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    clientCode: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    serviceCode: {
      type: String,
      required: true,
      trim: true,
      default: "TASK",
    },
    serviceName: {
      type: String,
      trim: true,
      default: "Task Service",
    },
    servicePeriod: {
      type: String,
      required: true,
      trim: true,
      default: "N/A",
    },
    financialYear: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    billedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["Billed", "Paid", "Cancelled"],
      default: "Billed",
      index: true,
    },

    // NEW: Period billing fields
    billingType: {
      type: String,
      enum: ["individual", "period"],
      default: "individual",
      index: true,
    },

    // For period billing entries
    periodBillingDetails: {
      parentServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service", // Reference to the period service in invoice
      },
      periodType: {
        type: String,
        enum: ["weekly", "monthly", "quarterly", "custom"],
      },
      periodStartDate: Date,
      periodEndDate: Date,
      rate: Number,
      totalTasksInPeriod: Number,
      taskPosition: Number, // Position of this task in the period (1, 2, 3, etc.)
    },

    // Enhanced metadata with period billing support
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Additional fields for better tracking
    originalTaskData: {
      assignedAt: Date,
      dueDate: Date,
      completedAt: Date,
      status: String,
      teamMemberId: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Additional indexes for better query performance
taskBillingSchema.index({ taskId: 1, invoiceId: 1 });
taskBillingSchema.index({ clientCode: 1, financialYear: 1 });
taskBillingSchema.index({ status: 1, billedDate: -1 });
taskBillingSchema.index({ billingType: 1, clientCode: 1 });
taskBillingSchema.index({ "periodBillingDetails.periodType": 1 });
taskBillingSchema.index({
  "periodBillingDetails.periodStartDate": 1,
  "periodBillingDetails.periodEndDate": 1,
});

// Unique constraint for individual task billing (prevent duplicate billing)
taskBillingSchema.index(
  { taskId: 1, billingType: 1 },
  {
    unique: true,
    partialFilterExpression: { billingType: "individual" },
  }
);

// Virtual for formatted billing date
taskBillingSchema.virtual("formattedBilledDate").get(function () {
  return this.billedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
});

// Virtual for period information
taskBillingSchema.virtual("periodInfo").get(function () {
  if (this.billingType !== "period" || !this.periodBillingDetails) {
    return null;
  }

  return {
    type: this.periodBillingDetails.periodType,
    startDate: this.periodBillingDetails.periodStartDate,
    endDate: this.periodBillingDetails.periodEndDate,
    rate: this.periodBillingDetails.rate,
    totalTasks: this.periodBillingDetails.totalTasksInPeriod,
    position: this.periodBillingDetails.taskPosition,
  };
});

// Virtual for billing summary
taskBillingSchema.virtual("billingSummary").get(function () {
  return {
    type: this.billingType,
    amount: this.amount,
    status: this.status,
    billedDate: this.formattedBilledDate,
    isPeriodBilling: this.billingType === "period",
    periodInfo: this.periodInfo,
  };
});

// Static methods
taskBillingSchema.statics.findByClientCode = function (
  clientCode,
  options = {}
) {
  return this.find({ clientCode })
    .populate("taskId", "serviceName status dueDate")
    .populate("invoiceId", "invoiceNumber status totalAmount")
    .sort({ billedDate: -1 })
    .limit(options.limit || 50);
};

taskBillingSchema.statics.getBilledTaskIds = async function (
  clientCode = null,
  options = {}
) {
  const query = clientCode ? { clientCode } : {};

  if (options.billingType) {
    query.billingType = options.billingType;
  }

  const billings = await this.find(query).select("taskId billingType").lean();
  return billings.map((billing) => ({
    taskId: billing.taskId.toString(),
    billingType: billing.billingType,
  }));
};

// NEW: Get period billing statistics
taskBillingSchema.statics.getPeriodBillingStats = async function (
  filters = {}
) {
  const pipeline = [
    {
      $match: {
        billingType: "period",
        ...filters,
      },
    },
    {
      $group: {
        _id: {
          periodType: "$periodBillingDetails.periodType",
          clientCode: "$clientCode",
          invoiceId: "$invoiceId",
        },
        tasksCount: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        avgAmount: { $avg: "$amount" },
        periodStartDate: { $first: "$periodBillingDetails.periodStartDate" },
        periodEndDate: { $first: "$periodBillingDetails.periodEndDate" },
        serviceName: { $first: "$serviceName" },
      },
    },
    {
      $group: {
        _id: "$_id.periodType",
        totalPeriods: { $sum: 1 },
        totalTasks: { $sum: "$tasksCount" },
        totalAmount: { $sum: "$totalAmount" },
        avgTasksPerPeriod: { $avg: "$tasksCount" },
        avgAmountPerPeriod: { $avg: "$totalAmount" },
        clients: { $addToSet: "$_id.clientCode" },
      },
    },
    {
      $project: {
        periodType: "$_id",
        totalPeriods: 1,
        totalTasks: 1,
        totalAmount: { $round: ["$totalAmount", 2] },
        avgTasksPerPeriod: { $round: ["$avgTasksPerPeriod", 1] },
        avgAmountPerPeriod: { $round: ["$avgAmountPerPeriod", 2] },
        uniqueClients: { $size: "$clients" },
        _id: 0,
      },
    },
    { $sort: { totalAmount: -1 } },
  ];

  return await this.aggregate(pipeline);
};

taskBillingSchema.statics.getStats = async function (filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalBillings: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        avgAmount: { $avg: "$amount" },
        statusCounts: { $push: "$status" },
        billingTypeCounts: { $push: "$billingType" },
        individualBillings: {
          $sum: {
            $cond: [{ $eq: ["$billingType", "individual"] }, 1, 0],
          },
        },
        periodBillings: {
          $sum: {
            $cond: [{ $eq: ["$billingType", "period"] }, 1, 0],
          },
        },
      },
    },
  ];

  const [stats] = await this.aggregate(pipeline);
  return (
    stats || {
      totalBillings: 0,
      totalAmount: 0,
      avgAmount: 0,
      statusCounts: [],
      billingTypeCounts: [],
      individualBillings: 0,
      periodBillings: 0,
    }
  );
};

// NEW: Find period billing groups
taskBillingSchema.statics.findPeriodBillingGroups = async function (
  clientCode,
  options = {}
) {
  const matchCondition = {
    clientCode,
    billingType: "period",
  };

  if (options.startDate || options.endDate) {
    matchCondition.billedDate = {};
    if (options.startDate)
      matchCondition.billedDate.$gte = new Date(options.startDate);
    if (options.endDate)
      matchCondition.billedDate.$lte = new Date(options.endDate);
  }

  const pipeline = [
    { $match: matchCondition },
    {
      $group: {
        _id: {
          invoiceId: "$invoiceId",
          periodType: "$periodBillingDetails.periodType",
          periodStartDate: "$periodBillingDetails.periodStartDate",
          periodEndDate: "$periodBillingDetails.periodEndDate",
        },
        tasks: {
          $push: {
            taskId: "$taskId",
            serviceName: "$serviceName",
            amount: "$amount",
            billedDate: "$billedDate",
            status: "$status",
          },
        },
        totalAmount: { $sum: "$amount" },
        tasksCount: { $sum: 1 },
        avgAmount: { $avg: "$amount" },
      },
    },
    {
      $lookup: {
        from: "invoices",
        localField: "_id.invoiceId",
        foreignField: "_id",
        as: "invoice",
      },
    },
    {
      $project: {
        periodType: "$_id.periodType",
        periodStartDate: "$_id.periodStartDate",
        periodEndDate: "$_id.periodEndDate",
        invoiceNumber: { $arrayElemAt: ["$invoice.invoiceNumber", 0] },
        invoiceStatus: { $arrayElemAt: ["$invoice.status", 0] },
        tasks: 1,
        totalAmount: { $round: ["$totalAmount", 2] },
        tasksCount: 1,
        avgAmount: { $round: ["$avgAmount", 2] },
        _id: 0,
      },
    },
    { $sort: { periodStartDate: -1 } },
  ];

  return await this.aggregate(pipeline);
};

// Instance methods
taskBillingSchema.methods.markAsPaid = function () {
  this.status = "Paid";
  this.metadata = {
    ...this.metadata,
    paidAt: new Date(),
  };
  return this.save();
};

taskBillingSchema.methods.cancel = function (reason = "") {
  this.status = "Cancelled";
  this.metadata = {
    ...this.metadata,
    cancelledAt: new Date(),
    cancellationReason: reason,
  };
  return this.save();
};

// NEW: Method to update period billing details
taskBillingSchema.methods.updatePeriodDetails = function (periodDetails) {
  if (this.billingType === "period") {
    this.periodBillingDetails = {
      ...this.periodBillingDetails,
      ...periodDetails,
    };
  }
  return this.save();
};

// Pre-save middleware
taskBillingSchema.pre("save", function (next) {
  if (this.isNew) {
    this.billedDate = this.billedDate || new Date();

    // Set billing type based on service code or existing data
    if (!this.billingType) {
      this.billingType =
        this.serviceCode === "PERIOD" ? "period" : "individual";
    }
  }

  // Ensure period billing has required details
  if (this.billingType === "period" && !this.periodBillingDetails) {
    this.periodBillingDetails = {};
  }

  next();
});

// Post-save middleware for updating task billing status
taskBillingSchema.post("save", async function (doc) {
  try {
    const Task = mongoose.model("Task");
    const task = await Task.findById(doc.taskId);

    if (task && !task.billingMetadata.isBilled) {
      await task.markAsBilled(doc.invoiceId, doc._id, doc.billingType);
    }
  } catch (err) {
    console.warn(
      `Failed to update task billing status for task ${doc.taskId}:`,
      err
    );
  }
});

// Post-remove middleware for updating task billing status
taskBillingSchema.post("remove", async function (doc) {
  try {
    const Task = mongoose.model("Task");
    const task = await Task.findById(doc.taskId);

    if (task && task.billingMetadata.isBilled) {
      await task.unmarkAsBilled();
    }
  } catch (err) {
    console.warn(
      `Failed to update task billing status after removal for task ${doc.taskId}:`,
      err
    );
  }
});

// Add pagination plugin
taskBillingSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("TaskBilling", taskBillingSchema);
