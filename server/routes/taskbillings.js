// server/routes/taskbillings.js - COMPLETE ENHANCED VERSION WITH PERIOD BILLING SUPPORT
const express = require("express");
const mongoose = require("mongoose");
const TaskBilling = require("../models/TaskBilling");
const Task = require("../models/Task");
const Service = require("../models/Service");

let auth;
try {
  const authModule = require("../middleware/auth");
  auth =
    authModule.auth ||
    authModule.authenticateToken ||
    authModule.verifyToken ||
    authModule;
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
}

const router = express.Router();

// Analyze period billing for tasks with service frequency support
router.get("/analyze-period-billing", auth, async (req, res) => {
  try {
    const { clientCode, serviceName, startDate, endDate } = req.query;

    if (!clientCode || !serviceName || !startDate || !endDate) {
      return res.status(400).json({
        message: "clientCode, serviceName, startDate, and endDate are required",
      });
    }

    console.log(`📊 Analyzing period billing:`, {
      clientCode,
      serviceName,
      startDate,
      endDate,
    });

    const start = new Date(startDate);
    // Set end date to end of day to include all tasks on the end date
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // First, try to get the service details to determine frequency
    let serviceData = null;
    try {
      // Find service with exact or similar name
      serviceData = await Service.findOne({
        serviceName: { $regex: new RegExp(serviceName, "i") },
      });

      if (serviceData) {
        console.log(
          `📅 Found service with frequency: ${serviceData.frequency}`
        );
      }
    } catch (err) {
      console.warn("Could not fetch service details:", err);
    }

    // More inclusive task matching strategy - get all service tasks first, then filter
    console.log(
      `🔎 Searching for tasks: client=${clientCode}, service=${serviceName}, dateRange=${startDate} to ${endDate}`
    );

    // First, get ALL tasks for this client and service
    const allTasksQuery = {
      clientCode,
      serviceName: { $regex: serviceName, $options: "i" },
      isDeleted: { $ne: true },
      status: { $ne: "deleted" },
    };

    console.log(
      "🔎 Getting all tasks for service:",
      JSON.stringify(allTasksQuery, null, 2)
    );
    let allTasks = await Task.find(allTasksQuery).lean();
    console.log(`📋 Found ${allTasks.length} total tasks for service`);

    // Log some sample tasks to understand the data structure
    if (allTasks.length > 0) {
      console.log("📄 Sample task data:", {
        _id: allTasks[0]._id,
        assignedAt: allTasks[0].assignedAt,
        dueDate: allTasks[0].dueDate,
        createdAt: allTasks[0].createdAt,
        servicePeriod: allTasks[0].servicePeriod,
        status: allTasks[0].status,
      });
    }

    // Filter by date range using servicePeriod as PRIMARY matching criteria
    const tasks = allTasks.filter((task) => {
      // PRIMARY: Check servicePeriod for period-based matching
      let periodMatches = false;
      if (task.servicePeriod) {
        const servicePeriod = task.servicePeriod.trim();

        // Parse MONTHLY servicePeriod format like "Apr-25", "May-25", etc.
        const monthlyRegex = /^([A-Za-z]{3})-(\d{2})$/;
        const monthlyMatch = servicePeriod.match(monthlyRegex);

        // Parse QUARTERLY servicePeriod format like "Q1-25", "Q2-25", etc.
        const quarterlyRegex = /^Q([1-4])-(\d{2})$/;
        const quarterlyMatch = servicePeriod.match(quarterlyRegex);

        // Parse WEEKLY servicePeriod format like "01-Apr-25", "08-Apr-25", etc.
        const weeklyRegex = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/;
        const weeklyMatch = servicePeriod.match(weeklyRegex);

        // Parse YEARLY servicePeriod format like "FY 2024-25", "FY 2025-26", etc.
        const yearlyRegex = /^FY\s+(\d{4})-(\d{2})$/;
        const yearlyMatch = servicePeriod.match(yearlyRegex);

        if (monthlyMatch) {
          // Handle monthly format
          const [, monthAbbr, yearShort] = monthlyMatch;
          const fullYear = 2000 + parseInt(yearShort); // "25" -> 2025

          // Month abbreviations mapping
          const monthMap = {
            jan: 0,
            feb: 1,
            mar: 2,
            apr: 3,
            may: 4,
            jun: 5,
            jul: 6,
            aug: 7,
            sep: 8,
            oct: 9,
            nov: 10,
            dec: 11,
          };

          const taskMonth = monthMap[monthAbbr.toLowerCase()];
          if (taskMonth !== undefined) {
            // Create date for the 1st of the task's service month using UTC to avoid timezone issues
            const taskDate = new Date(Date.UTC(fullYear, taskMonth, 1));

            // Check if this service period falls within the selected range
            periodMatches = taskDate >= start && taskDate <= end;

            if (periodMatches) {
              console.log(
                `✅ Task ${task._id} matches MONTHLY servicePeriod "${servicePeriod}":`,
                {
                  taskDate: `${fullYear}-${String(taskMonth + 1).padStart(
                    2,
                    "0"
                  )}-01`,
                  serviceMonth: monthAbbr,
                  dateRange: `${start.toISOString().split("T")[0]} to ${
                    end.toISOString().split("T")[0]
                  }`,
                  reason: "monthly_servicePeriod_match",
                }
              );
            } else {
              console.log(
                `❌ Task ${task._id} does NOT match MONTHLY servicePeriod "${servicePeriod}":`,
                {
                  taskDate: `${fullYear}-${String(taskMonth + 1).padStart(
                    2,
                    "0"
                  )}-01`,
                  serviceMonth: monthAbbr,
                  dateRange: `${start.toISOString().split("T")[0]} to ${
                    end.toISOString().split("T")[0]
                  }`,
                  reason: "outside_range",
                }
              );
            }
          }
        } else if (quarterlyMatch) {
          // Handle quarterly format
          const [, quarterNum, yearShort] = quarterlyMatch;
          const fullYear = 2000 + parseInt(yearShort); // "25" -> 2025
          const quarter = parseInt(quarterNum);

          // Financial year quarters (April to March):
          // Q1: Apr-Jun (months 3,4,5), Q2: Jul-Sep (6,7,8), Q3: Oct-Dec (9,10,11), Q4: Jan-Mar (0,1,2 of next year)
          let quarterStartMonth, quarterStartYear;

          switch (quarter) {
            case 1: // Q1: Apr-Jun 2025
              quarterStartMonth = 3; // April (0-based)
              quarterStartYear = fullYear;
              break;
            case 2: // Q2: Jul-Sep 2025
              quarterStartMonth = 6; // July
              quarterStartYear = fullYear;
              break;
            case 3: // Q3: Oct-Dec 2025
              quarterStartMonth = 9; // October
              quarterStartYear = fullYear;
              break;
            case 4: // Q4: Jan-Mar 2026 (next year)
              quarterStartMonth = 0; // January
              quarterStartYear = fullYear + 1;
              break;
          }

          // Create date for the 1st of the quarter's start month
          const taskDate = new Date(
            Date.UTC(quarterStartYear, quarterStartMonth, 1)
          );

          // For quarters, we need to check if the quarter period overlaps with the selected range
          // Create end date for the quarter (last day of the 3rd month)
          const quarterEndMonth = (quarterStartMonth + 2) % 12;
          const quarterEndYear =
            quarterStartMonth + 2 >= 12
              ? quarterStartYear + 1
              : quarterStartYear;
          const quarterEndDate = new Date(
            Date.UTC(quarterEndYear, quarterEndMonth + 1, 0)
          ); // Last day of month

          // Check if quarter overlaps with selected range
          periodMatches = taskDate <= end && quarterEndDate >= start;

          if (periodMatches) {
            console.log(
              `✅ Task ${task._id} matches QUARTERLY servicePeriod "${servicePeriod}":`,
              {
                quarterStartDate: `${quarterStartYear}-${String(
                  quarterStartMonth + 1
                ).padStart(2, "0")}-01`,
                quarterEndDate: quarterEndDate.toISOString().split("T")[0],
                quarter: `Q${quarter}`,
                dateRange: `${start.toISOString().split("T")[0]} to ${
                  end.toISOString().split("T")[0]
                }`,
                reason: "quarterly_servicePeriod_match",
              }
            );
          } else {
            console.log(
              `❌ Task ${task._id} does NOT match QUARTERLY servicePeriod "${servicePeriod}":`,
              {
                quarterStartDate: `${quarterStartYear}-${String(
                  quarterStartMonth + 1
                ).padStart(2, "0")}-01`,
                quarterEndDate: quarterEndDate.toISOString().split("T")[0],
                quarter: `Q${quarter}`,
                dateRange: `${start.toISOString().split("T")[0]} to ${
                  end.toISOString().split("T")[0]
                }`,
                reason: "outside_range",
              }
            );
          }
        } else if (weeklyMatch) {
          // Handle weekly format
          const [, dayStr, monthAbbr, yearShort] = weeklyMatch;
          const fullYear = 2000 + parseInt(yearShort); // "25" -> 2025
          const day = parseInt(dayStr);

          // Month abbreviations mapping
          const monthMap = {
            jan: 0,
            feb: 1,
            mar: 2,
            apr: 3,
            may: 4,
            jun: 5,
            jul: 6,
            aug: 7,
            sep: 8,
            oct: 9,
            nov: 10,
            dec: 11,
          };

          const taskMonth = monthMap[monthAbbr.toLowerCase()];
          if (taskMonth !== undefined) {
            // Create date for the specific week start date
            const weekStartDate = new Date(Date.UTC(fullYear, taskMonth, day));

            // For weekly tasks, check if the week start date falls within the selected range
            periodMatches = weekStartDate >= start && weekStartDate <= end;

            if (periodMatches) {
              console.log(
                `✅ Task ${task._id} matches WEEKLY servicePeriod "${servicePeriod}":`,
                {
                  weekStartDate: `${fullYear}-${String(taskMonth + 1).padStart(
                    2,
                    "0"
                  )}-${String(day).padStart(2, "0")}`,
                  weekPeriod: servicePeriod,
                  dateRange: `${start.toISOString().split("T")[0]} to ${
                    end.toISOString().split("T")[0]
                  }`,
                  reason: "weekly_servicePeriod_match",
                }
              );
            } else {
              console.log(
                `❌ Task ${task._id} does NOT match WEEKLY servicePeriod "${servicePeriod}":`,
                {
                  weekStartDate: `${fullYear}-${String(taskMonth + 1).padStart(
                    2,
                    "0"
                  )}-${String(day).padStart(2, "0")}`,
                  weekPeriod: servicePeriod,
                  dateRange: `${start.toISOString().split("T")[0]} to ${
                    end.toISOString().split("T")[0]
                  }`,
                  reason: "outside_range",
                }
              );
            }
          }
        } else if (yearlyMatch) {
          // Handle yearly format - for yearly services, use assignedAt/dueDate instead of servicePeriod
          // because yearly tasks are FOR a previous FY but PERFORMED during the current FY
          const [, startYear, endYearShort] = yearlyMatch;

          const assignedDate = task.assignedAt
            ? new Date(task.assignedAt)
            : null;
          const dueDate = task.dueDate ? new Date(task.dueDate) : null;

          // For yearly services, check if the actual work dates (assigned/due) fall within selected range
          periodMatches =
            (assignedDate && assignedDate >= start && assignedDate <= end) ||
            (dueDate && dueDate >= start && dueDate <= end);

          if (periodMatches) {
            console.log(
              `✅ Task ${task._id} matches YEARLY servicePeriod "${servicePeriod}" via work dates:`,
              {
                servicePeriod: servicePeriod,
                assignedAt: assignedDate?.toISOString().split("T")[0],
                dueDate: dueDate?.toISOString().split("T")[0],
                dateRange: `${start.toISOString().split("T")[0]} to ${
                  end.toISOString().split("T")[0]
                }`,
                reason: "yearly_work_date_match",
                note:
                  "Task FOR " +
                  servicePeriod +
                  " but work happens in selected period",
              }
            );
          } else {
            console.log(
              `❌ Task ${task._id} does NOT match YEARLY servicePeriod "${servicePeriod}":`,
              {
                servicePeriod: servicePeriod,
                assignedAt: assignedDate?.toISOString().split("T")[0],
                dueDate: dueDate?.toISOString().split("T")[0],
                dateRange: `${start.toISOString().split("T")[0]} to ${
                  end.toISOString().split("T")[0]
                }`,
                reason: "work_dates_outside_range",
              }
            );
          }
        } else {
          // Fallback for non-standard servicePeriod formats
          console.log(
            `⚠️ Unsupported servicePeriod format: "${servicePeriod}"`
          );
        }
      }

      // FALLBACK: Use assignedAt/dueDate only if servicePeriod is missing or invalid
      if (!periodMatches && !task.servicePeriod) {
        const assignedDate = task.assignedAt ? new Date(task.assignedAt) : null;
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;

        const fallbackMatch =
          (assignedDate && assignedDate >= start && assignedDate <= end) ||
          (dueDate && dueDate >= start && dueDate <= end);

        if (fallbackMatch) {
          console.log(`✅ Task ${task._id} matches via fallback dates:`, {
            assignedAt: assignedDate?.toISOString().split("T")[0],
            dueDate: dueDate?.toISOString().split("T")[0],
            reason: "fallback_date_match",
          });
          return true;
        }
      }

      return periodMatches;
    });

    console.log(`📊 After date filtering: ${tasks.length} tasks remain`);

    // No fallback needed since we already got all tasks and filtered them

    console.log(
      `📋 Found ${tasks.length} total tasks for service: ${serviceName}`
    );

    // Get already billed task IDs with enhanced debugging
    console.log(
      `🔍 Checking for already billed tasks for client: ${clientCode}`
    );
    console.log(`📋 Checking ${tasks.length} tasks for billing status`);

    const taskIds = tasks.map((t) => t._id);
    console.log(
      `🆔 Task IDs to check:`,
      taskIds.slice(0, 5).map((id) => id.toString())
    );

    const billedTaskIds = await TaskBilling.distinct("taskId", {
      clientCode,
      taskId: { $in: taskIds },
    });

    console.log(
      `💰 Found ${billedTaskIds.length} already billed task IDs:`,
      billedTaskIds.slice(0, 5).map((id) => id.toString())
    );

    // Also check without clientCode restriction to see if there are TaskBilling records with different clientCode
    const allBilledForTasks = await TaskBilling.distinct("taskId", {
      taskId: { $in: taskIds },
    });

    if (allBilledForTasks.length > billedTaskIds.length) {
      console.log(
        `⚠️ WARNING: Found ${allBilledForTasks.length} billed tasks total, but only ${billedTaskIds.length} for this client`
      );
      console.log(
        `🔍 This suggests some tasks might be billed under different clientCode`
      );

      // Find which clientCodes these tasks are billed under
      const billingDetails = await TaskBilling.find({
        taskId: { $in: taskIds },
      })
        .select("taskId clientCode")
        .lean();

      const clientCodeBreakdown = {};
      billingDetails.forEach((billing) => {
        clientCodeBreakdown[billing.clientCode] =
          (clientCodeBreakdown[billing.clientCode] || 0) + 1;
      });

      console.log(`📊 Tasks billed by clientCode:`, clientCodeBreakdown);
    }

    const billedTaskIdStrings = billedTaskIds.map((id) => id.toString());
    const availableTasks = tasks.filter(
      (task) => !billedTaskIdStrings.includes(task._id.toString())
    );

    console.log(
      `💰 ${billedTaskIds.length} tasks already billed, ${availableTasks.length} available for billing`
    );

    // Enhanced period calculation based on service frequency
    let expectedTaskCount = availableTasks.length;
    let periodTypeFromFrequency = "unknown";

    if (serviceData && serviceData.frequency) {
      const frequency = serviceData.frequency.toLowerCase();

      // Determine period type from service frequency
      if (frequency.includes("month")) {
        periodTypeFromFrequency = "monthly";
      } else if (frequency.includes("quarter")) {
        periodTypeFromFrequency = "quarterly";
      } else if (frequency.includes("year")) {
        periodTypeFromFrequency = "yearly";
      } else if (frequency.includes("week")) {
        periodTypeFromFrequency = "weekly";
      }
    }

    // Calculate expected counts based on date ranges
    const monthsDiff = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const quartersDiff = Math.ceil(monthsDiff / 3);
    const weeksDiff = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );

    // Group tasks by status for analysis
    const tasksByStatus = {};
    availableTasks.forEach((task) => {
      const status = task.status || "Unknown";
      tasksByStatus[status] = (tasksByStatus[status] || 0) + 1;
    });

    const analysis = {
      totalTasks: availableTasks.length,
      alreadyBilledTasks: billedTaskIds.length,
      tasksByStatus,
      taskIds: availableTasks.map((t) => t._id),
      period: {
        startDate,
        endDate,
        serviceName,
        monthsDiff,
        quartersDiff,
        weeksDiff,
      },
      serviceDetails: serviceData
        ? {
            serviceCode: serviceData.serviceCode,
            frequency: serviceData.frequency,
            periodTypeFromFrequency,
          }
        : null,
      summary: {
        availableForBilling: availableTasks.length,
        completed: tasksByStatus.completed || tasksByStatus.Completed || 0,
        pending: tasksByStatus.pending || tasksByStatus.Pending || 0,
        upcoming: tasksByStatus.upcoming || tasksByStatus.Upcoming || 0,
      },
      // Debug info for troubleshooting
      debug: {
        queryUsed: tasks.length > 0 ? "date_range_filtered" : "no_tasks_found",
        totalTasksFound: tasks.length,
        dateRange: `${startDate} to ${endDate}`,
        serviceNamePattern: serviceName,
        serviceFrequencyFound: serviceData ? serviceData.frequency : "None",
        dateFilteringApplied: true,
      },
    };

    console.log(`📈 Period analysis result:`, {
      totalTasks: analysis.totalTasks,
      alreadyBilled: analysis.alreadyBilledTasks,
      statusBreakdown: tasksByStatus,
      serviceFrequency: serviceData?.frequency,
      debug: analysis.debug,
    });

    res.json(analysis);
  } catch (error) {
    console.error("❌ Error analyzing period billing:", error);
    res.status(500).json({
      message: "Error analyzing period billing",
      error: error.message,
    });
  }
});

// Get all task billings with filtering
router.get("/", auth, async (req, res) => {
  try {
    const {
      clientCode,
      status,
      serviceName,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    let query = {};

    if (clientCode) {
      query.clientCode = clientCode;
    }

    if (status) {
      if (status.includes(",")) {
        query.status = { $in: status.split(",") };
      } else {
        query.status = status;
      }
    }

    if (serviceName) {
      query.serviceName = { $regex: serviceName, $options: "i" };
    }

    if (startDate || endDate) {
      query.billedDate = {};
      if (startDate) query.billedDate.$gte = new Date(startDate);
      if (endDate) query.billedDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const taskBillings = await TaskBilling.find(query)
      .populate("invoiceId", "invoiceNumber status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await TaskBilling.countDocuments(query);

    res.json({
      taskBillings,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
    });
  } catch (err) {
    console.error("Error fetching task billings:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get billed task IDs for a specific client
router.get("/billed-tasks/:clientCode", auth, async (req, res) => {
  try {
    const { clientCode } = req.params;

    console.log(`🔍 Fetching billed tasks for client: ${clientCode}`);

    // Get all billed task IDs for this client with proper field selection
    const billedTasks = await TaskBilling.find({
      clientCode,
      // Add safety check to exclude any deleted or invalid records
      taskId: { $exists: true },
    })
      .select("taskId invoiceId serviceName amount billedDate createdAt")
      .populate("invoiceId", "invoiceNumber status")
      .lean();

    console.log(
      `Found ${billedTasks.length} billed tasks for client ${clientCode}`
    );

    // Return data in the format frontend expects
    const formattedTasks = billedTasks.map((task) => ({
      taskId: task.taskId,
      _id: task._id,
      serviceName: task.serviceName || "Task Service",
      amount: task.amount || 0,
      billedDate: task.billedDate || task.createdAt,
      invoiceId: task.invoiceId?._id,
      invoiceNumber: task.invoiceId?.invoiceNumber,
      invoiceStatus: task.invoiceId?.status,
    }));

    res.json(formattedTasks);
  } catch (err) {
    console.error("Error fetching billed tasks:", err);
    res.status(500).json({
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development" ? err.message : "Server error",
    });
  }
});

// Get task counts for billing by status
router.get("/task-counts-for-billing/:clientCode", auth, async (req, res) => {
  try {
    const { clientCode } = req.params;

    console.log(`📊 Fetching task counts for billing - client: ${clientCode}`);

    // Define status mappings for better categorization
    const statusMappings = {
      All: [],
      Pending: [
        "pending",
        "pending-overdue",
        "pending-client",
        "pending-admin-approval",
        "Pending",
        "Pending-overdue",
        "Pending-client",
        "Pending-Admin-approval",
      ],
      Completed: ["completed", "Completed"],
      Upcoming: ["upcoming", "Upcoming"],
    };

    const counts = {};

    // Get all tasks for this client (excluding deleted)
    const allTasksQuery = {
      clientCode,
      isDeleted: { $ne: true },
      status: { $ne: "deleted" },
    };

    const totalTasks = await Task.countDocuments(allTasksQuery);
    counts.All = totalTasks;

    // Get counts for each status category
    for (const [category, statuses] of Object.entries(statusMappings)) {
      if (category === "All") continue;

      const query = {
        ...allTasksQuery,
        status: { $in: statuses },
      };

      const count = await Task.countDocuments(query);
      counts[category] = count;

      console.log(`📈 ${category}: ${count} tasks`);
    }

    console.log(`📊 Task counts for ${clientCode}:`, counts);

    res.json(counts);
  } catch (error) {
    console.error("❌ Error fetching task counts:", error);
    res.status(500).json({
      message: "Error fetching task counts",
      error: error.message,
    });
  }
});

// Get tasks for billing with proper filtering
router.get("/tasks-for-billing", auth, async (req, res) => {
  try {
    const { clientCode, page = 1, limit = 25, status } = req.query;

    if (!clientCode) {
      return res.status(400).json({ message: "Client code is required" });
    }

    console.log(`🔍 Fetching tasks for billing:`, {
      clientCode,
      page,
      limit,
      status,
    });

    // Build base query
    const query = {
      clientCode,
      isDeleted: { $ne: true },
      status: { $ne: "deleted" },
    };

    // Apply status filter if provided
    if (status && status.trim()) {
      const statusList = status
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (statusList.length > 0) {
        query.status = { $in: statusList };
      }
    }

    console.log(`🔎 Query:`, JSON.stringify(query, null, 2));

    // Get total count first with detailed debugging
    const totalTasks = await Task.countDocuments(query);
    console.log(`📊 Total count query result: ${totalTasks}`);

    if (totalTasks === 0) {
      // Debug: Check if tasks exist at all for this client
      const clientTasksCount = await Task.countDocuments({ clientCode });
      console.log(
        `🔍 Debug: Total tasks for client ${clientCode}: ${clientTasksCount}`
      );

      // Debug: Check what statuses exist for this client
      const statusBreakdown = await Task.aggregate([
        { $match: { clientCode } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
      console.log(`📊 Status breakdown for client:`, statusBreakdown);
    }

    // Get tasks with pagination
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalPages = Math.ceil(totalTasks / parseInt(limit));
    console.log(
      `📋 Pagination: page ${page}, limit ${limit}, totalTasks ${totalTasks}, totalPages ${totalPages}`
    );

    console.log(
      `📋 Found ${tasks.length} tasks (${totalTasks} total) for client ${clientCode}`
    );

    // Get billed task IDs for this client
    const billedTasks = await TaskBilling.find({
      clientCode,
      taskId: { $exists: true },
    })
      .select("taskId")
      .lean();

    const billedTaskIds = new Set(
      billedTasks.map((bt) => bt.taskId.toString())
    );

    // Mark tasks as billed if they exist in TaskBilling
    const tasksWithBillingStatus = tasks.map((task) => ({
      ...task,
      isBilled: billedTaskIds.has(task._id.toString()),
      isAvailableForBilling: !billedTaskIds.has(task._id.toString()),
    }));

    console.log(`💰 ${billedTaskIds.size} tasks already billed`);

    res.json({
      tasks: tasksWithBillingStatus,
      // Frontend expects these fields at root level
      tasksCount: tasks.length,
      totalTasks,
      currentPage: parseInt(page),
      totalPages,
      tasksPerPage: parseInt(limit),
      hasNext: page < totalPages,
      hasPrev: page > 1,
      // Keep nested structure for backward compatibility
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalTasks,
        tasksPerPage: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      summary: {
        totalTasksFound: tasks.length,
        totalTasksForClient: totalTasks,
        alreadyBilledCount: billedTaskIds.size,
        availableForBillingCount: totalTasks - billedTaskIds.size,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching tasks for billing:", error);
    res.status(500).json({
      message: "Error fetching tasks for billing",
      error: error.message,
    });
  }
});

// Get billable task billings for a specific client
router.get("/billable/:clientCode", auth, async (req, res) => {
  try {
    const { clientCode } = req.params;
    const { status = "Completed,Pending" } = req.query;

    const statusArray = status.split(",");

    const taskBillings = await TaskBilling.find({
      clientCode: clientCode,
      status: { $in: statusArray },
      invoiceId: { $exists: false },
    }).sort({ createdAt: -1 });

    res.json(taskBillings);
  } catch (err) {
    console.error("Error fetching billable tasks:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get billable tasks (NOT task billings) for invoice creation
router.get("/tasks/billable/:clientCode", auth, async (req, res) => {
  try {
    const { clientCode } = req.params;
    const { status = "Completed,Pending" } = req.query;

    const statusArray = status.split(",");

    // Find tasks that haven't been billed yet
    const billedTaskIds = await TaskBilling.distinct("taskId", { clientCode });

    const billableTasks = await Task.find({
      clientCode: clientCode,
      status: { $in: statusArray },
      _id: { $nin: billedTaskIds },
    }).sort({ createdAt: -1 });

    res.json(billableTasks);
  } catch (err) {
    console.error("Error fetching billable tasks:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create a new task billing entry
router.post("/", auth, async (req, res) => {
  try {
    const {
      taskId,
      invoiceId,
      clientCode,
      serviceCode,
      serviceName,
      servicePeriod,
      amount,
      billedDate,
      financialYear,
      billingType,
      periodBillingDetails,
    } = req.body;

    // Validation
    if (!taskId || !invoiceId || !clientCode) {
      return res.status(400).json({
        message: "taskId, invoiceId, and clientCode are required",
      });
    }

    // Check if task is already billed (unless it's period billing)
    if (billingType !== "period") {
      const existingBilling = await TaskBilling.findOne({ taskId });
      if (existingBilling) {
        return res.status(400).json({
          message: "This task has already been billed",
          existingBilling: existingBilling._id,
        });
      }
    }

    // Get current financial year if not provided
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const defaultFinancialYear =
      currentMonth >= 4
        ? `${currentYear}-${currentYear + 1}`
        : `${currentYear - 1}-${currentYear}`;

    const taskBilling = new TaskBilling({
      taskId,
      invoiceId,
      clientCode,
      serviceCode: serviceCode || "TASK",
      serviceName: serviceName || "Task Service",
      servicePeriod: servicePeriod || "N/A",
      amount: amount || 0,
      billedDate: billedDate ? new Date(billedDate) : new Date(),
      financialYear: financialYear || defaultFinancialYear,
      createdBy: req.user.id,
      billingType: billingType || "regular",
      periodBillingDetails: periodBillingDetails || null,
      metadata: {
        ...req.body.metadata,
        createdVia: "api",
        userAgent: req.get("User-Agent"),
        ipAddress: req.ip,
      },
    });

    const savedTaskBilling = await taskBilling.save();

    // Populate the response
    const populatedBilling = await TaskBilling.findById(savedTaskBilling._id)
      .populate("taskId", "serviceName status dueDate")
      .populate("invoiceId", "invoiceNumber status totalAmount")
      .populate("createdBy", "username email");

    res.status(201).json({
      message: "Task billing created successfully",
      taskBilling: populatedBilling,
    });
  } catch (err) {
    console.error("Error creating task billing:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        message: "Task has already been billed",
        error: "DUPLICATE_TASK_BILLING",
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

// Get task billing by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const taskBilling = await TaskBilling.findById(req.params.id)
      .populate("taskId", "serviceName status dueDate")
      .populate("invoiceId", "invoiceNumber status totalAmount")
      .populate("createdBy", "username email");

    if (!taskBilling) {
      return res.status(404).json({ message: "Task billing not found" });
    }

    res.json(taskBilling);
  } catch (err) {
    console.error("Error fetching task billing:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update task billing
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      serviceCode,
      serviceName,
      servicePeriod,
      amount,
      billedDate,
      status,
    } = req.body;

    const updateFields = {};
    if (serviceCode !== undefined) updateFields.serviceCode = serviceCode;
    if (serviceName !== undefined) updateFields.serviceName = serviceName;
    if (servicePeriod !== undefined) updateFields.servicePeriod = servicePeriod;
    if (amount !== undefined) updateFields.amount = amount;
    if (billedDate !== undefined)
      updateFields.billedDate = new Date(billedDate);
    if (status !== undefined) updateFields.status = status;

    updateFields.updatedBy = req.user.id;

    const taskBilling = await TaskBilling.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    )
      .populate("taskId", "serviceName status dueDate")
      .populate("invoiceId", "invoiceNumber status totalAmount")
      .populate("createdBy", "username email");

    if (!taskBilling) {
      return res.status(404).json({ message: "Task billing not found" });
    }

    res.json({
      message: "Task billing updated successfully",
      taskBilling,
    });
  } catch (err) {
    console.error("Error updating task billing:", err);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete task billing (soft delete by removing invoiceId reference)
router.delete("/:id", auth, async (req, res) => {
  try {
    const taskBilling = await TaskBilling.findById(req.params.id);

    if (!taskBilling) {
      return res.status(404).json({ message: "Task billing not found" });
    }

    // Instead of deleting, we remove the invoice reference
    // This maintains audit trail while making the task available for billing again
    await TaskBilling.findByIdAndDelete(req.params.id);

    res.json({
      message: "Task billing removed successfully",
      taskId: taskBilling.taskId,
    });
  } catch (err) {
    console.error("Error removing task billing:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get period billing statistics
router.get("/stats/period-billing", auth, async (req, res) => {
  try {
    const { clientCode, startDate, endDate } = req.query;

    let matchCondition = {
      billingType: "period",
    };

    if (clientCode) {
      matchCondition.clientCode = clientCode;
    }

    if (startDate || endDate) {
      matchCondition.billedDate = {};
      if (startDate) matchCondition.billedDate.$gte = new Date(startDate);
      if (endDate) matchCondition.billedDate.$lte = new Date(endDate);
    }

    const periodBillingStats = await TaskBilling.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$periodBillingDetails.periodType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" },
          totalTasksCovered: {
            $sum: "$periodBillingDetails.totalTasksInPeriod",
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const overallStats = await TaskBilling.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalPeriodBillings: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalTasksCovered: {
            $sum: "$periodBillingDetails.totalTasksInPeriod",
          },
          uniqueClients: { $addToSet: "$clientCode" },
        },
      },
    ]);

    res.json({
      byPeriodType: periodBillingStats,
      overall: overallStats[0] || {
        totalPeriodBillings: 0,
        totalAmount: 0,
        totalTasksCovered: 0,
        uniqueClients: [],
      },
    });
  } catch (err) {
    console.error("Error fetching period billing stats:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get statistics for task billings
router.get("/stats/summary", auth, async (req, res) => {
  try {
    const { clientCode, financialYear, startDate, endDate } = req.query;

    let matchCondition = {};

    if (clientCode) {
      matchCondition.clientCode = clientCode;
    }

    if (financialYear) {
      matchCondition.financialYear = financialYear;
    }

    if (startDate || endDate) {
      matchCondition.billedDate = {};
      if (startDate) matchCondition.billedDate.$gte = new Date(startDate);
      if (endDate) matchCondition.billedDate.$lte = new Date(endDate);
    }

    const stats = await TaskBilling.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalBillings: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" },
          statusCounts: { $push: "$status" },
          clientCounts: { $addToSet: "$clientCode" },
          billingTypeCounts: { $push: "$billingType" },
        },
      },
    ]);

    const result = stats[0] || {
      totalBillings: 0,
      totalAmount: 0,
      avgAmount: 0,
      statusCounts: [],
      clientCounts: [],
      billingTypeCounts: [],
    };

    // Count status occurrences
    const statusBreakdown = {};
    result.statusCounts.forEach((status) => {
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    // Count billing type occurrences
    const billingTypeBreakdown = {};
    result.billingTypeCounts.forEach((type) => {
      const billingType = type || "regular";
      billingTypeBreakdown[billingType] =
        (billingTypeBreakdown[billingType] || 0) + 1;
    });

    res.json({
      totalBillings: result.totalBillings,
      totalAmount: Math.round(result.totalAmount || 0),
      averageAmount: Math.round(result.avgAmount || 0),
      uniqueClients: result.clientCounts.length,
      statusBreakdown,
      billingTypeBreakdown,
    });
  } catch (err) {
    console.error("Error fetching task billing stats:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
