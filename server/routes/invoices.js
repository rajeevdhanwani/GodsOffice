const express = require("express");
const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const TaskBilling = require("../models/TaskBilling");
const Task = require("../models/Task");
const Client = require("../models/Client");
const Settings = require("../models/Settings");

let auth, adminAuth;
try {
  const authModule = require("../middleware/auth");
  auth =
    authModule.auth ||
    authModule.authenticateToken ||
    authModule.verifyToken ||
    authModule;
  adminAuth =
    authModule.adminAuth ||
    authModule.verifyAdmin ||
    authModule.requireAdmin ||
    auth;
} catch (err) {
  console.warn("Auth middleware not found, using fallback authentication");
  auth = (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );
      req.user = decoded;
      req.isAdmin = decoded.role === "admin" || decoded.isAdmin;
      next();
    } catch (err) {
      res.status(400).json({ message: "Invalid token." });
    }
  };

  adminAuth = (req, res, next) => {
    if (!req.isAdmin && req.user?.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }
    next();
  };
}

let Service, AuditLog;
try {
  Service = require("../models/Service");
} catch (err) {
  console.warn("Service model not found, continuing without service details");
}
try {
  AuditLog = require("../models/AuditLog");
} catch (err) {
  console.warn("AuditLog model not found, continuing without audit logging");
}

let generateInvoicePDF;
try {
  const pdfUtils = require("../utils/pdfGenerator");
  generateInvoicePDF = pdfUtils.generateInvoicePDF;
} catch (err) {
  console.warn("PDF generator not found, PDF generation will be disabled");
  generateInvoicePDF = null;
}

const router = express.Router();

const validateServices = (services) => {
  const errors = [];

  if (!Array.isArray(services)) {
    errors.push("Services must be an array");
    return errors;
  }

  services.forEach((service, index) => {
    if (!service.serviceName || typeof service.serviceName !== "string") {
      errors.push(
        `Service ${index + 1}: serviceName is required and must be a string`
      );
    }

    if (
      !service.amount ||
      isNaN(parseFloat(service.amount)) ||
      parseFloat(service.amount) <= 0
    ) {
      errors.push(
        `Service ${index + 1}: amount is required and must be a positive number`
      );
    }

    if (service.serviceCode && typeof service.serviceCode !== "string") {
      errors.push(
        `Service ${index + 1}: serviceCode must be a string if provided`
      );
    }

    if (service.sacCode && typeof service.sacCode !== "string") {
      errors.push(`Service ${index + 1}: sacCode must be a string if provided`);
    }
  });

  return errors;
};

const calculateGST = (
  subtotal,
  placeOfSupply,
  billerState,
  isGSTApplicable = true
) => {
  if (!isGSTApplicable || subtotal <= 0) {
    return {
      cgst: 0,
      sgst: 0,
      igst: 0,
      gstRate: 0,
    };
  }

  const gstRate = 18;
  const gstAmount = (subtotal * gstRate) / 100;

  // Normalize state names for comparison
  const normalizeState = (state) =>
    state ? state.toLowerCase().trim().replace(/\s+/g, " ") : "";

  const isSameState =
    normalizeState(placeOfSupply) === normalizeState(billerState);

  if (isSameState) {
    return {
      cgst: Math.round(gstAmount / 2),
      sgst: Math.round(gstAmount / 2),
      igst: 0,
      gstRate,
    };
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: Math.round(gstAmount),
      gstRate,
    };
  }
};

// NEW: Period billing analytics endpoint
router.get("/period-billing-analytics", auth, async (req, res) => {
  try {
    const { clientCode, startDate, endDate } = req.query;

    let matchCondition = {
      "services.isPeriodBilling": true,
    };

    if (clientCode) {
      matchCondition.clientCode = clientCode;
    }

    if (startDate || endDate) {
      matchCondition.invoiceDate = {};
      if (startDate) matchCondition.invoiceDate.$gte = new Date(startDate);
      if (endDate) matchCondition.invoiceDate.$lte = new Date(endDate);
    }

    const analytics = await Invoice.analyzePeriodBilling(matchCondition);

    // Get overall stats
    const overallStats = await Invoice.aggregate([
      { $match: matchCondition },
      { $unwind: "$services" },
      { $match: { "services.isPeriodBilling": true } },
      {
        $group: {
          _id: null,
          totalPeriodBillings: { $sum: 1 },
          totalAmount: { $sum: "$services.amount" },
          totalTasksCovered: { $sum: "$services.periodDetails.tasksCount" },
          avgTasksPerPeriod: { $avg: "$services.periodDetails.tasksCount" },
          avgAmountPerPeriod: { $avg: "$services.amount" },
          uniqueClients: { $addToSet: "$clientCode" },
        },
      },
    ]);

    const result = {
      byPeriodType: analytics,
      overall: overallStats[0] || {
        totalPeriodBillings: 0,
        totalAmount: 0,
        totalTasksCovered: 0,
        avgTasksPerPeriod: 0,
        avgAmountPerPeriod: 0,
        uniqueClients: [],
      },
    };

    result.overall.uniqueClientsCount = result.overall.uniqueClients.length;
    delete result.overall.uniqueClients;

    res.json(result);
  } catch (err) {
    console.error("Error fetching period billing analytics:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
});

router.get("/service-amounts/:clientCode", auth, async (req, res) => {
  try {
    const { clientCode } = req.params;

    console.log(
      `Fetching service amount suggestions for client: ${clientCode}`
    );

    const serviceAmounts = await Invoice.aggregate([
      {
        $match: {
          clientCode: clientCode,
          createdAt: {
            $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
        },
      },
      { $unwind: "$services" },
      {
        $group: {
          _id: "$services.serviceName",
          count: { $sum: 1 },
          avgAmount: { $avg: "$services.amount" },
          lastAmount: { $last: "$services.amount" },
          maxAmount: { $max: "$services.amount" },
          minAmount: { $min: "$services.amount" },
          lastUsed: { $max: "$invoiceDate" },
          isPeriodBilling: { $last: "$services.isPeriodBilling" },
        },
      },
      {
        $match: {
          count: { $gte: 1 },
        },
      },
      {
        $project: {
          serviceName: "$_id",
          suggestedAmount: {
            $round: [
              {
                $cond: {
                  if: { $gte: ["$count", 3] },
                  then: "$avgAmount",
                  else: "$lastAmount",
                },
              },
              0,
            ],
          },
          count: 1,
          lastUsed: 1,
          isPeriodBilling: 1,
          _id: 0,
        },
      },
      {
        $sort: { lastUsed: -1, count: -1 },
      },
    ]);

    const suggestions = {};
    serviceAmounts.forEach((item) => {
      suggestions[item.serviceName] = {
        amount: item.suggestedAmount,
        isPeriodBilling: item.isPeriodBilling || false,
        usageCount: item.count,
        lastUsed: item.lastUsed,
      };
    });

    console.log(
      `Found ${
        Object.keys(suggestions).length
      } service amount suggestions for client ${clientCode}`
    );

    res.json(suggestions);
  } catch (err) {
    console.error("Error fetching service amounts:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
});

router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.isAdmin;

    let matchCondition = {};

    const [biller1Stats, biller2Stats] = await Promise.all([
      Invoice.aggregate([
        { $match: { ...matchCondition, isBiller2: false } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
            unpaid: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$paymentStatus", "Unpaid"] },
                      { $eq: ["$status", "Sent"] },
                      { $eq: ["$status", "Draft"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            partiallyPaid: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "Partially Paid"] }, 1, 0],
              },
            },
            fullyPaid: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      { $eq: ["$status", "Paid"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            // NEW: Period billing stats
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
      ]),
      Invoice.aggregate([
        { $match: { ...matchCondition, isBiller2: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
            unpaid: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$paymentStatus", "Unpaid"] },
                      { $eq: ["$status", "Sent"] },
                      { $eq: ["$status", "Draft"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            partiallyPaid: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "Partially Paid"] }, 1, 0],
              },
            },
            fullyPaid: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      { $eq: ["$status", "Paid"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            // NEW: Period billing stats
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
      ]),
    ]);

    const biller1Result = biller1Stats[0] || {
      total: 0,
      totalAmount: 0,
      unpaid: 0,
      partiallyPaid: 0,
      fullyPaid: 0,
      periodBillingCount: 0,
    };

    const biller2Result = biller2Stats[0] || {
      total: 0,
      totalAmount: 0,
      unpaid: 0,
      partiallyPaid: 0,
      fullyPaid: 0,
      periodBillingCount: 0,
    };

    const result = {
      total: biller1Result.total + biller2Result.total,
      biller1: {
        total: biller1Result.total,
        unpaid: biller1Result.unpaid,
        partiallyPaid: biller1Result.partiallyPaid,
        fullyPaid: biller1Result.fullyPaid,
        totalAmount: Math.round(biller1Result.totalAmount || 0),
        periodBillingCount: biller1Result.periodBillingCount || 0,
      },
      biller2: {
        total: biller2Result.total,
        unpaid: biller2Result.unpaid,
        partiallyPaid: biller2Result.partiallyPaid,
        fullyPaid: biller2Result.fullyPaid,
        totalAmount: Math.round(biller2Result.totalAmount || 0),
        periodBillingCount: biller2Result.periodBillingCount || 0,
      },
      totalAmount: Math.round(
        (biller1Result.totalAmount || 0) + (biller2Result.totalAmount || 0)
      ),
      totalPeriodBillingCount:
        (biller1Result.periodBillingCount || 0) +
        (biller2Result.periodBillingCount || 0),
    };

    res.json(result);
  } catch (err) {
    console.error("Error fetching invoice stats:", err.message, err.stack);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      paymentStatus,
      clientCode,
      startDate,
      endDate,
      isBiller2,
    } = req.query;

    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { invoiceNumber: searchRegex },
        { clientName: searchRegex },
        { clientCode: searchRegex },
      ];
    }

    if (status) {
      if (status.includes(",")) {
        query.status = { $in: status.split(",") };
      } else {
        query.status = status;
      }
    }

    if (paymentStatus) {
      if (paymentStatus.includes(",")) {
        query.paymentStatus = { $in: paymentStatus.split(",") };
      } else {
        query.paymentStatus = paymentStatus;
      }
    }

    if (clientCode) {
      query.clientCode = clientCode;
    }

    if (isBiller2 !== undefined) {
      query.isBiller2 = isBiller2 === "true";
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        query.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.invoiceDate.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate("createdBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Invoice.countDocuments(query),
    ]);

    const invoicesWithDates = invoices.map((invoice) => ({
      ...invoice,
      displayInvoiceDate: new Date(invoice.invoiceDate).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      ),
      displayDueDate: new Date(invoice.dueDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      generatedBy: invoice.createdBy?.username || "System",
      // NEW: Add period billing info
      periodBillingServices: invoice.services.filter((s) => s.isPeriodBilling)
        .length,
      hasPeriodBilling: invoice.services.some((s) => s.isPeriodBilling),
    }));

    res.json({
      invoices: invoicesWithDates,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    });
  } catch (err) {
    console.error("Error fetching invoices:", err.message, err.stack);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

router.get("/requests/pending", auth, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const invoicesWithPendingRequests = await Invoice.find({
      $or: [
        { editRequests: { $elemMatch: { status: "Pending" } } },
        { deleteRequests: { $elemMatch: { status: "Pending" } } },
      ],
    })
      .populate("editRequests.requestedBy", "username")
      .populate("deleteRequests.requestedBy", "username")
      .sort({ updatedAt: -1 })
      .lean();

    console.log(
      `Found ${invoicesWithPendingRequests.length} invoices with pending requests`
    );
    res.json(invoicesWithPendingRequests);
  } catch (err) {
    console.error("Error fetching pending requests:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice ID format" });
    }

    const invoice = await Invoice.findById(id)
      .populate("createdBy", "username role")
      .populate("editRequests.requestedBy", "username")
      .populate("deleteRequests.requestedBy", "username")
      .lean();

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const invoiceWithUserInfo = {
      ...invoice,
      generatedBy: invoice.createdBy?.username || "System",
      generatedByRole: invoice.createdBy?.role || "Unknown",
      displayInvoiceDate: new Date(invoice.invoiceDate).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      ),
      displayDueDate: new Date(invoice.dueDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      // NEW: Add period billing analysis
      periodBillingServices: invoice.services.filter((s) => s.isPeriodBilling),
      regularServices: invoice.services.filter((s) => !s.isPeriodBilling),
      hasPeriodBilling: invoice.services.some((s) => s.isPeriodBilling),
    };

    res.json(invoiceWithUserInfo);
  } catch (err) {
    console.error("Error fetching invoice:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const {
      clientCode,
      clientName,
      salutation,
      address,
      gstin,
      placeOfSupply,
      isBiller2,
      invoiceDate,
      dueDate,
      services,
      notes,
      customerNotes,
      firmName,
      billerState,
      clientType,
    } = req.body;

    console.log("📝 Creating invoice with data:", {
      clientType,
      clientCode,
      clientName,
      servicesCount: services?.length,
      periodBillingServices:
        services?.filter((s) => s.isPeriodBilling)?.length || 0,
    });

    // ENHANCED: Validation with period billing support
    const validationErrors = [];

    if (clientType === "Client" || (!clientType && clientCode)) {
      if (!clientCode || !clientCode.trim()) {
        validationErrors.push("Client code is required for existing clients");
      }
    }

    if (!clientName || !clientName.trim()) {
      validationErrors.push("Client name is required");
    }

    if (!placeOfSupply || !placeOfSupply.trim()) {
      validationErrors.push("Place of supply is required");
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      validationErrors.push("At least one service is required");
    }

    if (!invoiceDate) {
      validationErrors.push("Invoice date is required");
    }

    if (!dueDate) {
      validationErrors.push("Due date is required");
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: `Validation failed: ${validationErrors.join(", ")}`,
        errors: validationErrors,
      });
    }

    // Validate services (including period billing validation)
    const serviceErrors = validateServices(services);
    if (serviceErrors.length > 0) {
      return res.status(400).json({
        message: "Invalid service data",
        errors: serviceErrors,
      });
    }

    // ENHANCED: Handle period billing and regular task billing
    const regularServices = services.filter(
      (s) => !s.isPeriodBilling && !s.isCustom && s.taskId
    );
    const periodBillingServices = services.filter((s) => s.isPeriodBilling);
    const customServices = services.filter(
      (s) => s.isCustom && !s.isPeriodBilling
    );

    console.log("📊 Service breakdown:", {
      regular: regularServices.length,
      periodBilling: periodBillingServices.length,
      custom: customServices.length,
    });

    // Check for already billed tasks (only for regular services)
    if (regularServices.length > 0) {
      const taskIds = regularServices.map((s) => s.taskId);
      const existingBillings = await TaskBilling.find({
        taskId: { $in: taskIds },
      });

      if (existingBillings.length > 0) {
        const alreadyBilledIds = existingBillings.map((b) =>
          b.taskId.toString()
        );
        return res.status(400).json({
          message: `Some tasks are already billed: ${alreadyBilledIds.join(
            ", "
          )}`,
        });
      }
    }

    // For period billing services, create virtual task billings for covered tasks
    if (periodBillingServices.length > 0 && clientCode) {
      for (const periodService of periodBillingServices) {
        if (periodService.periodDetails?.taskIds?.length > 0) {
          // Check if any of the period tasks are already billed
          const existingPeriodBillings = await TaskBilling.find({
            taskId: { $in: periodService.periodDetails.taskIds },
          });

          if (existingPeriodBillings.length > 0) {
            const alreadyBilledIds = existingPeriodBillings.map((b) =>
              b.taskId.toString()
            );
            return res.status(400).json({
              message: `Some tasks in period billing are already billed: ${alreadyBilledIds.join(
                ", "
              )}`,
            });
          }
        }
      }
    }

    // Get settings for invoice number generation
    const settings = await Settings.findOne({ type: "invoice" });
    if (!settings) {
      return res.status(500).json({ message: "Invoice settings not found" });
    }

    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber(isBiller2);

    // Calculate totals
    const subtotal = services.reduce(
      (sum, service) => sum + parseFloat(service.amount),
      0
    );

    // Determine GST applicability
    const isGSTApplicable = isBiller2
      ? settings.invoiceSettings?.isBiller2GSTApplicable || false
      : settings.invoiceSettings?.isBiller1GSTApplicable || true;

    const taxDetails = calculateGST(
      subtotal,
      placeOfSupply,
      billerState,
      isGSTApplicable
    );
    taxDetails.taxableAmount = Math.round(subtotal);

    const totalAmount = Math.round(
      subtotal + taxDetails.cgst + taxDetails.sgst + taxDetails.igst
    );

    // ENHANCED: Create invoice with period billing support
    const invoice = new Invoice({
      invoiceNumber,
      clientCode: clientType === "Client" ? clientCode || "" : "",
      clientName: clientName.trim(),
      salutation: salutation || "M/s",
      address: address || "",
      gstin: gstin || "",
      placeOfSupply: placeOfSupply.trim(),
      isBiller2: isBiller2 || false,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      services: services.map((service) => ({
        ...service,
        addedBy: req.user.id,
      })),
      totalAmount,
      taxDetails,
      notes: notes || "",
      customerNotes: customerNotes || "",
      firmName: firmName || "",
      billerState: billerState || "",
      createdBy: req.user.id,
      status: "Draft",
      paymentStatus: "Unpaid",
      metadata: {
        clientType: clientType || "Client",
        createdVia: "web_interface",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        periodBillingServicesCount: periodBillingServices.length,
        totalTasksCoveredByPeriodBilling: periodBillingServices.reduce(
          (sum, s) => sum + (s.periodDetails?.tasksCount || 0),
          0
        ),
      },
    });

    const savedInvoice = await invoice.save();
    console.log("✅ Invoice saved:", savedInvoice.invoiceNumber);

    // Create task billings for regular services
    const taskBillings = [];
    if (regularServices.length > 0 && clientCode) {
      for (const service of regularServices) {
        try {
          const task = await Task.findById(service.taskId);
          if (task) {
            const taskBilling = new TaskBilling({
              taskId: service.taskId,
              invoiceId: savedInvoice._id,
              clientCode: clientCode,
              serviceCode: service.serviceCode || task.serviceCode || "UNKNOWN",
              serviceName:
                service.serviceName || task.serviceName || "Task Service",
              amount: service.amount || 0,
              servicePeriod:
                service.servicePeriod || task.servicePeriod || "N/A",
              financialYear: task.financialYear || "FY25",
              createdBy: req.user.id,
            });

            const savedTaskBilling = await taskBilling.save();
            taskBillings.push(savedTaskBilling._id);
          }
        } catch (err) {
          console.warn(
            `Failed to create task billing for task ${service.taskId}:`,
            err
          );
        }
      }
    }

    // ENHANCED: Create task billings for period billing covered tasks
    if (periodBillingServices.length > 0 && clientCode) {
      for (const periodService of periodBillingServices) {
        if (periodService.periodDetails?.taskIds?.length > 0) {
          for (const taskId of periodService.periodDetails.taskIds) {
            try {
              const task = await Task.findById(taskId);
              if (task) {
                const taskBilling = new TaskBilling({
                  taskId: taskId,
                  invoiceId: savedInvoice._id,
                  clientCode: clientCode,
                  serviceCode: "PERIOD",
                  serviceName: `${periodService.serviceName} - Period Billing`,
                  amount: periodService.periodDetails.rate || 0,
                  servicePeriod: periodService.servicePeriod,
                  financialYear: task.financialYear || "FY25",
                  createdBy: req.user.id,
                  billingType: "period",
                  periodBillingDetails: {
                    periodType: periodService.periodDetails.type,
                    periodStartDate: periodService.periodDetails.startDate,
                    periodEndDate: periodService.periodDetails.endDate,
                    rate: periodService.periodDetails.rate,
                    totalTasksInPeriod: periodService.periodDetails.tasksCount,
                  },
                  metadata: {
                    isPeriodBilling: true,
                    parentServiceId: periodService._id,
                  },
                });

                const savedTaskBilling = await taskBilling.save();
                taskBillings.push(savedTaskBilling._id);
              }
            } catch (err) {
              console.warn(
                `Failed to create period task billing for task ${taskId}:`,
                err
              );
            }
          }
        }
      }
    }

    // Update invoice with task billing references
    if (taskBillings.length > 0) {
      savedInvoice.taskBillingIds = taskBillings;
      await savedInvoice.save();
    }

    console.log(
      `✅ Created ${taskBillings.length} task billings for invoice ${savedInvoice.invoiceNumber}`
    );

    res.status(201).json({
      message: "Invoice created successfully",
      invoice: {
        _id: savedInvoice._id,
        invoiceNumber: savedInvoice.invoiceNumber,
        clientName: savedInvoice.clientName,
        totalAmount: savedInvoice.totalAmount,
        status: savedInvoice.status,
        taskBillingsCreated: taskBillings.length,
        periodBillingServicesCount: periodBillingServices.length,
      },
    });
  } catch (err) {
    console.error("❌ Error creating invoice:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        message: "Duplicate invoice detected",
        error: "DUPLICATE_INVOICE",
      });
    }

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const editData = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const editRequest = {
      requestedBy: req.user.id,
      requestedAt: new Date(),
      status: "Pending",
      changes: editData,
    };

    invoice.editRequests = invoice.editRequests || [];
    invoice.editRequests.push(editRequest);

    await invoice.save();

    console.log(
      `Edit request submitted for invoice ${id} by user ${req.user.id}`
    );
    res.json({
      message: "Edit request submitted for admin approval",
      editRequest,
    });
  } catch (err) {
    console.error("Error submitting edit request:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:id/approve-edit", auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { editRequestId, approve, modifiedChanges } = req.body;

    console.log(
      `Processing edit request approval: invoiceId=${id}, editRequestId=${editRequestId}, approve=${approve}, modifiedChanges=${JSON.stringify(
        modifiedChanges
      )}`
    );

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(editRequestId)) {
      return res.status(400).json({ message: "Invalid edit request ID" });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    let editRequest = null;
    let editRequestIndex = -1;

    if (invoice.editRequests && Array.isArray(invoice.editRequests)) {
      editRequestIndex = invoice.editRequests.findIndex(
        (req) => req._id && req._id.toString() === editRequestId.toString()
      );

      if (editRequestIndex !== -1) {
        editRequest = invoice.editRequests[editRequestIndex];
      }
    }

    if (!editRequest) {
      console.log(
        "Edit request not found. Available requests:",
        invoice.editRequests
      );
      return res.status(404).json({
        message: "Edit request not found",
        availableRequests:
          invoice.editRequests?.map((req) => ({
            id: req._id,
            status: req.status,
            requestedAt: req.requestedAt,
          })) || [],
      });
    }

    if (approve) {
      const changes = modifiedChanges || editRequest.changes;
      if (changes) {
        if (changes.services) {
          const serviceErrors = validateServices(changes.services);
          if (serviceErrors.length > 0) {
            return res.status(400).json({
              message: "Invalid service data in modified changes",
              errors: serviceErrors,
            });
          }
        }
        Object.assign(invoice, changes);
        console.log("Applied changes to invoice:", changes);

        if (changes.services || changes.totalAmount) {
          const subtotal = changes.services
            ? changes.services.reduce(
                (sum, service) => sum + (parseFloat(service.amount) || 0),
                0
              )
            : invoice.services.reduce(
                (sum, service) => sum + (parseFloat(service.amount) || 0),
                0
              );

          const settings = await Settings.findOne({ type: "invoice" }).lean();
          const isGSTApplicableFinal = invoice.isBiller2
            ? settings?.invoiceSettings?.isBiller2GSTApplicable || false
            : settings?.invoiceSettings?.isBiller1GSTApplicable || true;

          const taxDetails = calculateGST(
            subtotal,
            invoice.placeOfSupply,
            invoice.billerState,
            isGSTApplicableFinal
          );

          invoice.taxDetails = {
            ...taxDetails,
            taxableAmount: Math.round(subtotal),
          };
          invoice.totalAmount = Math.round(
            subtotal + taxDetails.cgst + taxDetails.sgst + taxDetails.igst
          );
        }

        invoice.lastModifiedBy = req.user.id;
        invoice.lastModifiedAt = new Date();
        invoice.version = (invoice.version || 0) + 1;

        editRequest.status = "Approved";
        console.log(`Edit request approved for invoice ${id}`);
      } else {
        return res
          .status(400)
          .json({ message: "No changes provided in edit request" });
      }
    } else {
      editRequest.status = "Rejected";
      console.log(`Edit request rejected for invoice ${id}`);
    }

    editRequest.processedBy = req.user.id;
    editRequest.processedAt = new Date();

    await invoice.save();

    const responseInvoice = await Invoice.findById(id)
      .populate("createdBy", "username role")
      .populate("editRequests.requestedBy", "username")
      .populate("editRequests.processedBy", "username")
      .lean();

    res.json({
      message: approve
        ? "Edit request approved and changes applied"
        : "Edit request rejected",
      invoice: responseInvoice,
    });
  } catch (err) {
    console.error("Error processing edit request:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        message: "Deletion reason is required (minimum 5 characters)",
      });
    }

    const deleteRequest = {
      requestedBy: req.user.id,
      requestedAt: new Date(),
      reason: reason.trim(),
      status: "Pending",
    };

    invoice.deleteRequests = invoice.deleteRequests || [];
    invoice.deleteRequests.push(deleteRequest);

    await invoice.save();

    console.log(
      `Delete request submitted for invoice ${id} by user ${req.user.id}`
    );
    res.json({
      message: "Delete request submitted for admin approval",
      deleteRequest,
    });
  } catch (err) {
    console.error("Error submitting delete request:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:id/approve-delete", auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteRequestId, approve } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(deleteRequestId)) {
      return res.status(400).json({ message: "Invalid delete request ID" });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const deleteRequestIndex = invoice.deleteRequests.findIndex(
      (req) => req._id.toString() === deleteRequestId.toString()
    );

    if (deleteRequestIndex === -1) {
      return res.status(404).json({ message: "Delete request not found" });
    }

    const deleteRequest = invoice.deleteRequests[deleteRequestIndex];

    if (approve) {
      await TaskBilling.deleteMany({ invoiceId: id });
      await Invoice.findByIdAndDelete(id);

      console.log(`Invoice ${id} deleted by admin ${req.user.id}`);
      res.json({ message: "Invoice deleted successfully" });
    } else {
      deleteRequest.status = "Rejected";
      deleteRequest.processedBy = req.user.id;
      deleteRequest.processedAt = new Date();

      await invoice.save();

      console.log(`Delete request rejected for invoice ${id}`);
      res.json({ message: "Delete request rejected" });
    }
  } catch (err) {
    console.error("Error processing delete request:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:id/add-payment", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate, method, reference, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid payment amount required" });
    }

    if (!method) {
      return res.status(400).json({ message: "Payment method is required" });
    }

    const payment = {
      amount: parseFloat(amount),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      method,
      reference: reference || "",
      notes: notes || "",
      recordedBy: req.user.id,
      recordedAt: new Date(),
    };

    invoice.payments = invoice.payments || [];
    invoice.payments.push(payment);

    const totalPaid = invoice.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    invoice.paidAmount = totalPaid;

    if (totalPaid >= invoice.totalAmount) {
      invoice.paymentStatus = "Paid";
      invoice.status = "Paid";
    } else if (totalPaid > 0) {
      invoice.paymentStatus = "Partially Paid";
    }

    await invoice.save();

    console.log(
      `Payment of ₹${amount} added to invoice ${invoice.invoiceNumber}`
    );
    res.json({
      message: "Payment added successfully",
      invoice: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        paidAmount: invoice.paidAmount,
        paymentStatus: invoice.paymentStatus,
        status: invoice.status,
      },
    });
  } catch (err) {
    console.error("Error adding payment:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id/pdf", auth, async (req, res) => {
  try {
    if (!generateInvoicePDF) {
      return res.status(501).json({ message: "PDF generation not available" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    const invoice = await Invoice.findById(id)
      .populate("createdBy", "username")
      .lean();

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`
    );

    res.send(pdfBuffer);
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({ message: "Error generating PDF" });
  }
});

module.exports = router;
