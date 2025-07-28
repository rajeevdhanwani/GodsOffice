const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Task = require("../models/Task");
const Team = require("../models/Team");
const Service = require("../models/Service");
const Client = require("../models/Client");
const ClientService = require("../models/ClientService");
const TaskHistory = require("../models/TaskHistory");
const ActionStage = require("../models/ActionStage");
const {
  format,
  parse,
  isValid,
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfQuarter,
} = require("date-fns");

const router = express.Router();

// Authentication middleware
const auth = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({
      message: "No authorization header provided. Access denied.",
    });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({
      message: "No token provided or invalid format. Access denied.",
    });
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
    console.error("❌ Token verification failed:", err.message);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token has expired. Please login again.",
      });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token format. Please login again.",
      });
    } else {
      return res.status(401).json({
        message: "Token verification failed. Access denied.",
      });
    }
  }
};

const jwt = require("jsonwebtoken");

const adminAuth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    console.log("adminAuth: No token provided");
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("adminAuth: Decoded token:", {
      id: decoded.id,
      isAdmin: decoded.isAdmin,
    });
    if (!decoded.isAdmin) {
      console.log("adminAuth: User is not an admin");
      return res
        .status(403)
        .json({ message: "Admin access required for this operation" });
    }
    req.user = decoded;
    req.isAdmin = decoded.isAdmin; // Set for compatibility with existing checks
    next();
  } catch (err) {
    console.error("adminAuth: Token verification error:", err.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Validation middleware for task input
const validateTaskInput = [
  body("clientCode").notEmpty().withMessage("Client code is required"),
  body("serviceCode").notEmpty().withMessage("Service code is required"),
  body("serviceName").notEmpty().withMessage("Service name is required"),
  body("teamMemberId").notEmpty().withMessage("Team member ID is required"),
  body("assignedAt").isISO8601().withMessage("Valid assigned date is required"),
  body("dueDate").isISO8601().withMessage("Valid due date is required"),
];

// Check validation result middleware
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Enhanced utility function to get financial year
const getFinancialYear = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month >= 3) {
    return `FY ${year}-${(year + 1) % 100}`.padStart(8, "0");
  } else {
    return `FY ${year - 1}-${year % 100}`.padStart(8, "0");
  }
};

// New endpoint to check collection status
router.get("/upload/status", auth, async (req, res) => {
  try {
    const [
      teamsCount,
      clientsCount,
      servicesCount,
      clientServicesCount,
      tasksCount,
    ] = await Promise.all([
      Team.countDocuments(),
      Client.countDocuments(),
      Service.countDocuments(),
      ClientService.countDocuments(),
      Task.countDocuments(),
    ]);

    res.json({
      teams: teamsCount,
      clients: clientsCount,
      services: servicesCount,
      clientservices: clientServicesCount,
      tasks: tasksCount,
    });
  } catch (err) {
    console.error("❌ Error fetching collection status:", err);
    res.status(500).json({
      message: "Server error while fetching collection status",
      error: err.message,
    });
  }
});

// Get all tasks with improved filtering and pagination
router.get("/", auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      clientCode,
      status,
      financialYear,
      teamMemberId,
      serviceName,
      fromDate,
      toDate,
      search,
      sortBy = "assignedAt",
      sortOrder = "desc",
      isOverdue,
    } = req.query;

    // Build dynamic filter object
    const filter = {};

    if (clientCode) {
      filter.clientCode = new RegExp(clientCode, "i");
    }

    if (status) {
      if (status === "Pending-Overdue") {
        filter.status = "Pending";
        filter.overdue = true;
      } else if (status === "Pending") {
        filter.status = "Pending";
        // Handle isOverdue parameter for Pending status
        if (isOverdue === "true") {
          filter.overdue = true;
        } else if (isOverdue === "false") {
          filter.overdue = false;
        } else {
          filter.overdue = false; // default to non-overdue for Pending
        }
      } else {
        filter.status = status;
      }
    } else if (isOverdue) {
      // Handle standalone isOverdue parameter
      if (isOverdue === "true") {
        filter.status = "Pending";
        filter.overdue = true;
      } else if (isOverdue === "false") {
        filter.status = "Pending";
        filter.overdue = false;
      }
    }

    if (financialYear) {
      filter.financialYear = financialYear;
    }

    if (teamMemberId) {
      filter.teamMemberId = teamMemberId;
    }

    if (serviceName) {
      const serviceArray = Array.isArray(serviceName)
        ? serviceName
        : serviceName.split(",");
      filter.serviceName = { $in: serviceArray.map((s) => new RegExp(s, "i")) };
    }

    if (fromDate && toDate) {
      filter.dueDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    } else if (fromDate) {
      filter.dueDate = { $gte: new Date(fromDate) };
    } else if (toDate) {
      filter.dueDate = { $lte: new Date(toDate) };
    }

    if (search) {
      filter.$or = [
        { clientCode: new RegExp(search, "i") },
        { serviceName: new RegExp(search, "i") },
        { teamMemberId: new RegExp(search, "i") },
      ];
    }

    // Debug: Log the filter being applied
    console.log("Task filter:", filter);

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tasks = await Task.find(filter)
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    console.log("Tasks fetched for filter:", filter);
    console.log(
      "Tasks with overdue status:",
      tasks.map((task) => ({
        _id: task._id,
        status: task.status,
        overdue: task.overdue,
        dueDate: task.dueDate,
      }))
    );

    const totalTasks = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalTasks / parseInt(limit));

    res.json({
      tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalTasks,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching tasks:", err);
    res.status(500).json({
      message: "Server error while fetching tasks",
      error: err.message,
    });
  }
});

// Get task statistics (with filtering support)
router.get("/stats", auth, async (req, res) => {
  try {
    const { clientCode, financialYear, teamMemberId, serviceName } = req.query;

    // Build filter for the query
    const filter = {};

    if (clientCode) {
      filter.clientCode = new RegExp(clientCode, "i");
    }
    if (financialYear) {
      filter.financialYear = financialYear;
    }
    if (teamMemberId) {
      filter.teamMemberId = teamMemberId;
    }
    if (serviceName) {
      const serviceArray = Array.isArray(serviceName)
        ? serviceName
        : serviceName.split(",");
      filter.serviceName = { $in: serviceArray.map((s) => new RegExp(s, "i")) };
    }

    // Update overdue status for all pending tasks before aggregating
    const updateResult = await Task.updateMany(
      {
        status: "Pending",
        dueDate: { $lt: new Date() },
        overdue: false,
      },
      { overdue: true }
    );
    await Task.updateMany(
      {
        status: "Pending",
        dueDate: { $gte: new Date() },
        overdue: true,
      },
      { overdue: false }
    );
    console.log("Overdue tasks updated for stats:", updateResult);

    // Aggregate statistics
    const stats = await Task.aggregate([
      { $match: filter },
      {
        $facet: {
          statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          overallStats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                pending: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "Pending"] },
                          { $eq: ["$overdue", false] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                upcoming: {
                  $sum: { $cond: [{ $eq: ["$status", "Upcoming"] }, 1, 0] },
                },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
                },
                pendingOverdue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "Pending"] },
                          { $eq: ["$overdue", true] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    const result = stats[0];
    const overallStats = result.overallStats[0] || {
      total: 0,
      pending: 0,
      upcoming: 0,
      completed: 0,
      pendingOverdue: 0,
    };

    const formattedStats = {
      total: overallStats.total,
      pending: overallStats.pending,
      upcoming: overallStats.upcoming,
      completed: overallStats.completed,
      pendingOverdue: overallStats.pendingOverdue,
      statusCounts: {
        ...result.statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        Pending: overallStats.pending, // Use non-overdue count
        "Pending-Overdue": overallStats.pendingOverdue,
      },
      completionRate:
        overallStats.total > 0
          ? Math.round((overallStats.completed / overallStats.total) * 100)
          : 0,
    };

    res.json(formattedStats);
  } catch (err) {
    console.error("❌ Error fetching task statistics:", err);
    res.status(500).json({
      message: "Server error while fetching statistics",
      error: err.message,
    });
  }
});

// Get distinct financial years
router.get("/financial-years", auth, async (req, res) => {
  try {
    const financialYears = await Task.distinct("financialYear");
    res.json(financialYears);
  } catch (err) {
    console.error("❌ Error fetching financial years:", err);
    res.status(500).json({
      message: "Server error while fetching financial years",
      error: err.message,
    });
  }
});

// Get team members
router.get("/teams", auth, async (req, res) => {
  try {
    const teams = await Team.find().lean();
    res.json(teams);
  } catch (err) {
    console.error("❌ Error fetching teams:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get action stages
router.get("/action-stages", auth, async (req, res) => {
  try {
    const stages = await ActionStage.find().lean();
    // Ensure no duplicate stage names
    const uniqueStages = Array.from(
      new Set(stages.map((stage) => stage.name))
    ).map((name) => stages.find((stage) => stage.name === name));
    res.json(uniqueStages);
  } catch (err) {
    console.error("❌ Error fetching action stages:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create an action stage
router.post("/action-stages", auth, adminAuth, async (req, res) => {
  const { name, color } = req.body;
  try {
    const existing = await ActionStage.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Action stage already exists" });
    }
    const stage = new ActionStage({ name, color });
    await stage.save();
    res
      .status(201)
      .json({ message: "Action stage created successfully", stage });
  } catch (err) {
    console.error("Error creating action stage:", err.message, err.stack);
    res
      .status(400)
      .json({ message: err.message || "Failed to create action stage" });
  }
});

// Update an action stage
router.put("/action-stages/:id", auth, adminAuth, async (req, res) => {
  const { name, color } = req.body;
  try {
    const stage = await ActionStage.findById(req.params.id);
    if (!stage) {
      return res.status(404).json({ message: "Action stage not found" });
    }
    stage.name = name || stage.name;
    stage.color = color || stage.color;
    await stage.save();
    res.json({ message: "Action stage updated successfully", stage });
  } catch (err) {
    console.error("Error updating action stage:", err.message, err.stack);
    res
      .status(400)
      .json({ message: err.message || "Failed to update action stage" });
  }
});

// Delete an action stage
router.delete("/action-stages/:id", auth, adminAuth, async (req, res) => {
  try {
    const result = await ActionStage.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Action stage not found" });
    }
    res.json({ message: "Action stage deleted successfully" });
  } catch (err) {
    console.error("Error deleting action stage:", err.message, err.stack);
    res
      .status(400)
      .json({ message: err.message || "Failed to delete action stage" });
  }
});

// Create a single task (Manual Task Creation)
router.post(
  "/",
  auth,
  validateTaskInput,
  checkValidationResult,
  async (req, res) => {
    const {
      clientCode,
      serviceCode,
      serviceName,
      teamMemberId,
      assignedAt,
      dueDate,
      status,
      financialYear,
      relatedFinancialYear,
      servicePeriod,
    } = req.body;

    console.log("POST /api/tasks called with payload:", req.body);

    try {
      if (
        !clientCode ||
        !serviceCode ||
        !serviceName ||
        !teamMemberId ||
        !assignedAt ||
        !dueDate
      ) {
        return res.status(400).json({
          message:
            "Missing required fields: clientCode, serviceCode, serviceName, teamMemberId, assignedAt, and dueDate are required",
        });
      }

      const existing = await Task.findOne({
        clientCode,
        serviceCode,
        assignedAt,
      });
      if (existing) {
        console.log("Task already exists:", existing);
        return res.status(400).json({
          message: "Task already exists for this client, service, and period",
        });
      }

      const currentDate = new Date();
      const taskStatus =
        new Date(assignedAt) > currentDate ? "Upcoming" : status || "Pending";

      const task = new Task({
        clientCode,
        serviceCode,
        serviceName,
        teamMemberId,
        assignedAt: new Date(assignedAt),
        dueDate: new Date(dueDate),
        status: taskStatus,
        financialYear,
        relatedFinancialYear,
        servicePeriod,
        overdue: new Date(dueDate) < currentDate && taskStatus !== "Completed",
      });

      await task.save();

      // Log task creation in history
      const historyEntry = new TaskHistory({
        taskId: task._id,
        type: "creation",
        value: "Created",
        remark: `Task created by ${req.user.username || "Unknown"}`,
        userId: req.user.id,
        timestamp: new Date(),
      });
      await historyEntry.save();

      console.log("Task created successfully:", task);
      res.status(201).json({ message: "Task created successfully", task });
    } catch (err) {
      console.error("❌ Error creating task:", err);
      res.status(400).json({
        message: err.message || "Failed to create task",
        error: err.message,
      });
    }
  }
);

// Enhanced update task with admin approval logic and delete protection
router.put("/:id", auth, async (req, res) => {
  console.log(`🚀 PUT /api/tasks/${req.params.id} - Starting task update`);

  try {
    // Extract request body fields FIRST
    const { status, teamMemberId, completedAt, pendingAction, remark } =
      req.body;

    console.log(`📝 Request data:`, {
      taskId: req.params.id,
      status,
      teamMemberId,
      completedAt,
      pendingAction,
      remark,
      isAdmin: req.isAdmin,
      userId: req.user?.id,
    });
    // Find the task
    const task = await Task.findById(req.params.id);
    if (!task) {
      console.log(`❌ Task not found: ${req.params.id}`);
      return res.status(404).json({ message: "Task not found" });
    }
    console.log(`📋 Current task state:`, {
      taskId: task._id,
      currentStatus: task.status,
      clientCode: task.clientCode,
      serviceName: task.serviceName,
    });
    // CRITICAL: Prevent any modifications to deleted tasks
    if (task.status === "Deleted") {
      console.log(`🚫 Attempted to modify deleted task: ${task._id}`);
      return res.status(400).json({
        message:
          "Cannot update a task that is marked as Deleted. Deleted tasks are immutable.",
      });
    }
    // Validate status if provided
    if (status) {
      const validStatuses = [
        "Pending",
        "Completed",
        "Pending-Client",
        "Pending-Admin-Approval",
        "Upcoming",
        "Deleted",
        "In Progress",
        "Pending for Review",
      ];
      // Add action stage statuses
      try {
        const actionStages = await ActionStage.find();
        const actionStageNames = actionStages.map((stage) => stage.name);
        validStatuses.push(...actionStageNames);
        console.log(`✅ Valid statuses loaded: ${validStatuses.length} total`);
      } catch (actionStageError) {
        console.warn(
          `⚠️ Could not load action stages:`,
          actionStageError.message
        );
      }
      if (!validStatuses.includes(status)) {
        console.log(`❌ Invalid status provided: ${status}`);
        return res.status(400).json({
          message: `Invalid status. Valid statuses are: ${validStatuses.join(
            ", "
          )}`,
        });
      }
    }
    // Check if completion is backdated or status change from Completed or deletion is requested
    const isBackdated =
      completedAt &&
      new Date(completedAt) < new Date(new Date().setHours(0, 0, 0, 0));
    const isStatusChangeFromCompleted =
      task.status === "Completed" && status && status !== task.status;
    const isDeletionRequest =
      pendingAction === "delete" || status === "Deleted";
    console.log(`🔍 Request analysis:`, {
      isBackdated,
      isStatusChangeFromCompleted,
      isDeletionRequest,
      requiresApproval:
        (isBackdated || isStatusChangeFromCompleted || isDeletionRequest) &&
        !req.isAdmin,
    });
    // Update task fields with enhanced admin approval logic
    const previousStatus = task.status;
    if (status) {
      if (
        (isBackdated || isStatusChangeFromCompleted || isDeletionRequest) &&
        !req.isAdmin
      ) {
        // Requires admin approval
        task.status = "Pending-Admin-Approval";
        task.previousStatus = previousStatus;
        task.pendingAction =
          pendingAction ||
          (isDeletionRequest
            ? "delete"
            : isBackdated
            ? "complete"
            : "status_change");
        task.pendingStatus = status;

        console.log(`📋 Setting up admin approval:`, {
          taskId: task._id,
          previousStatus: task.previousStatus,
          pendingAction: task.pendingAction,
          pendingStatus: task.pendingStatus,
        });
      } else {
        // Direct update (admin or allowed action)
        task.status = status;
        console.log(`✅ Direct status update: ${task._id} → ${status}`);
      }
    }
    // Update other fields
    if (teamMemberId) {
      console.log(
        `👤 Updating team member: ${task.teamMemberId} → ${teamMemberId}`
      );
      task.teamMemberId = teamMemberId;
    }
    if (completedAt) {
      console.log(`📅 Setting completion date: ${completedAt}`);
      task.completedAt = new Date(completedAt);
    }
    // Update overdue status
    if (task.dueDate < new Date() && task.status === "Pending") {
      task.overdue = true;
      console.log(`⏰ Marking task as overdue: ${task._id}`);
    }
    // Save the task
    console.log(`💾 Saving task ${task._id} with status: ${task.status}`);
    await task.save();
    console.log(`✅ Task saved successfully: ${task._id}`);
    // Log action in history for all meaningful changes
    const hasStatusChange = status && status !== previousStatus;
    const hasTeamMemberChange =
      teamMemberId && teamMemberId !== task.teamMemberId;
    const hasCompletionDateChange = completedAt;

    if (hasStatusChange || hasTeamMemberChange || hasCompletionDateChange) {
      console.log(`📝 Creating history entry for task update`);
      try {
        const historyEntry = new TaskHistory({
          taskId: task._id,
          type: hasTeamMemberChange ? "reassignment" : "status_change",
          value: hasTeamMemberChange ? teamMemberId : status || task.status,
          remark: remark && remark.trim() ? remark.trim() : "",
          userId: req.user.id,
          completedAt: completedAt ? new Date(completedAt) : undefined,
          pendingApproval:
            (isBackdated || isDeletionRequest || isStatusChangeFromCompleted) &&
            !req.isAdmin,
          pendingAction: task.pendingAction,
          timestamp: new Date(),
        });
        await historyEntry.save();
        console.log(`✅ History entry created: ${historyEntry._id}`);
      } catch (historyError) {
        console.error(`❌ Failed to create history entry:`, historyError);
        // Don't fail the request for history errors
      }
    }
    // Return success response
    const successMessage =
      (isBackdated || isDeletionRequest || isStatusChangeFromCompleted) &&
      !req.isAdmin
        ? `Task submitted for admin approval for ${
            isDeletionRequest
              ? "deletion"
              : isBackdated
              ? "backdated completion"
              : "status change"
          }`
        : "Task updated successfully";
    console.log(`🎉 Task update completed successfully: ${task._id}`);
    res.json({
      message: successMessage,
      task,
    });
  } catch (err) {
    console.error("❌ ERROR in PUT /api/tasks/:id:", err);
    console.error("❌ Error name:", err.name);
    console.error("❌ Error message:", err.message);
    console.error("❌ Full error stack:", err.stack);
    console.error("❌ Request body:", req.body);
    console.error("❌ Task ID:", req.params.id);
    console.error("❌ User:", { id: req.user?.id, isAdmin: req.isAdmin });

    if (err.name === "CastError") {
      return res.status(400).json({
        message: "Invalid task ID format",
        taskId: req.params.id,
      });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        details: err.message,
        errors: err.errors,
      });
    }
    res.status(500).json({
      message: "Server error while updating task",
      error: err.message,
      taskId: req.params.id,
    });
  }
});
// Test endpoint to verify the route is working
router.get("/test", (req, res) => {
  res.json({
    message: "Tasks route is working",
    timestamp: new Date().toISOString(),
  });
});

// Approve or reject task (for completion or deletion)
router.post("/approve/:id", auth, adminAuth, async (req, res) => {
  try {
    const { approve } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "Pending-Admin-Approval") {
      return res.status(400).json({
        message: "Task is not pending admin approval",
      });
    }

    const pendingAction = task.pendingAction;
    console.log(`🔍 Processing approval for task ${task._id}:`, {
      approve,
      pendingAction,
      currentStatus: task.status,
      pendingStatus: task.pendingStatus,
      previousStatus: task.previousStatus,
    });

    if (approve) {
      // Apply the requested action based on pendingAction
      if (pendingAction === "delete") {
        task.status = "Deleted";
        console.log(`✅ Setting task ${task._id} status to: Deleted`);
      } else if (pendingAction === "complete") {
        task.status = "Completed";
        if (task.pendingStatus === "Completed") {
          // Set completion date if it was a backdated completion
          task.completedAt = task.completedAt || new Date();
        }
        console.log(`✅ Setting task ${task._id} status to: Completed`);
      } else if (pendingAction === "status_change") {
        task.status = task.pendingStatus || "Pending";
        console.log(
          `✅ Setting task ${task._id} status to: ${task.status} (status change)`
        );
      } else {
        // Fallback: use pendingStatus if available, otherwise default to previous status
        task.status = task.pendingStatus || task.previousStatus || "Pending";
        console.log(
          `⚠️ Fallback: Setting task ${task._id} status to: ${task.status} (unknown pendingAction: ${pendingAction})`
        );
      }
    } else {
      // Reject - revert to previous status
      task.status = task.previousStatus || "Pending";
      console.log(
        `❌ Rejecting: Reverting task ${task._id} status to: ${task.status}`
      );
    }

    // Clear pending fields after processing
    const finalStatus = task.status;
    task.previousStatus = undefined;
    task.pendingAction = undefined;
    task.pendingStatus = undefined;

    // Additional validation before saving
    if (approve && pendingAction === "delete" && finalStatus !== "Deleted") {
      console.error(
        `❌ CRITICAL ERROR: Deletion approved but status is ${finalStatus}, forcing to Deleted`
      );
      task.status = "Deleted";
    }

    await task.save();
    console.log(`💾 Task ${task._id} saved with final status: ${task.status}`);

    // Log approval/rejection in task history
    const historyEntry = new TaskHistory({
      taskId: task._id,
      type: "admin_action",
      value: approve
        ? pendingAction === "delete"
          ? "deleted"
          : pendingAction === "complete"
          ? "completed"
          : pendingAction === "status_change"
          ? "status_changed"
          : "approved"
        : "rejected",
      remark: `Task ${
        approve
          ? pendingAction === "delete"
            ? "deleted"
            : pendingAction === "complete"
            ? "completion approved"
            : pendingAction === "status_change"
            ? "status change approved"
            : "approved"
          : "rejected"
      } by ${req.user.username || "Unknown"}`,
      userId: req.user.id,
      timestamp: new Date(),
    });
    await historyEntry.save();

    res.json({
      message: `Task ${
        approve
          ? pendingAction === "delete"
            ? "deleted"
            : pendingAction === "complete"
            ? "completion approved"
            : pendingAction === "status_change"
            ? "status change approved"
            : "approved"
          : "rejected"
      } successfully`,
      task,
    });
  } catch (err) {
    console.error("❌ Error approving/rejecting task:", err);
    res.status(500).json({
      message: "Server error while processing approval",
      error: err.message,
    });
  }
});

// Enhanced delete task endpoint (soft delete with admin approval)
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status === "Deleted") {
      return res.status(400).json({ message: "Task is already deleted" });
    }

    // Store previous status for rejection case
    task.previousStatus = task.status;

    // Non-admin users require approval
    if (!req.isAdmin) {
      task.status = "Pending-Admin-Approval";
      task.pendingAction = "delete";
      await task.save();

      // Log pending approval in task history
      const historyEntry = new TaskHistory({
        taskId: task._id,
        type: "status_change",
        value: "Pending-Admin-Approval",
        remark: `Task deletion submitted for admin approval by ${
          req.user.username || "Unknown"
        }`,
        userId: req.user.id,
        pendingApproval: true,
        pendingAction: "delete",
        timestamp: new Date(),
      });
      await historyEntry.save();

      res.json({
        message: "Task deletion submitted for admin approval",
        task,
      });
    } else {
      // Admin users can delete directly
      task.status = "Deleted";
      await task.save();

      // Log deletion in task history
      const historyEntry = new TaskHistory({
        taskId: task._id,
        type: "status_change",
        value: "Deleted",
        remark: `Task deleted by ${req.user.username || "Unknown"}`,
        userId: req.user.id,
        timestamp: new Date(),
      });
      await historyEntry.save();

      res.json({
        message: "Task deleted successfully (soft delete)",
        task,
      });
    }
  } catch (err) {
    console.error("Error deleting task:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid task ID format" });
    }
    res.status(500).json({
      message: "Server error while deleting task",
      error: err.message,
    });
  }
});

// Task history endpoints
router.post("/task-history", auth, async (req, res) => {
  try {
    const {
      taskId,
      type,
      value,
      remark,
      completedAt,
      pendingApproval,
      pendingAction,
    } = req.body;

    // Ensure value is a string
    if (!value || typeof value !== "string") {
      return res.status(400).json({
        message: "Value must be a non-empty string",
      });
    }

    const historyEntry = new TaskHistory({
      taskId,
      type,
      value,
      remark: remark || `Action by ${req.user.username || "Unknown"}`,
      userId: req.user.id,
      completedAt: completedAt ? new Date(completedAt) : undefined,
      pendingApproval: pendingApproval || false,
      pendingAction,
      timestamp: new Date(),
    });

    await historyEntry.save();
    res.status(201).json({
      message: "Task history logged successfully",
      historyEntry,
    });
  } catch (err) {
    console.error("❌ Error logging task history:", err);
    res.status(500).json({
      message: "Server error while logging task history",
      error: err.message,
    });
  }
});

router.get("/task-history/:taskId", auth, async (req, res) => {
  try {
    const history = await TaskHistory.find({ taskId: req.params.taskId })
      .populate("taskId", "clientCode serviceName teamMemberId")
      .populate("userId", "username")
      .sort({ timestamp: -1 })
      .lean();

    res.json(history);
  } catch (err) {
    console.error("❌ Error fetching task history:", err);
    res.status(500).json({
      message: "Server error while fetching task history",
      error: err.message,
    });
  }
});

// Bulk update tasks
router.post("/bulk-update", auth, async (req, res) => {
  try {
    const { taskIds, action, completedAt } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Valid task IDs array is required" });
    }

    // Check if any selected tasks are already deleted
    const deletedTasks = await Task.find({
      _id: { $in: taskIds },
      status: "Deleted",
    });
    if (deletedTasks.length > 0) {
      return res.status(400).json({
        message: "Cannot perform bulk action on deleted tasks",
      });
    }

    const updateObj = {};
    if (action === "Completed") {
      updateObj.status = req.isAdmin ? "Completed" : "Pending-Admin-Approval";
      if (completedAt) updateObj.completedAt = new Date(completedAt);
    } else if (action === "Re-Assign Task") {
      updateObj.status = "Pending";
    } else {
      updateObj.status = action;
    }

    const result = await Task.updateMany({ _id: { $in: taskIds } }, updateObj);

    // Log bulk action in history
    for (const taskId of taskIds) {
      const historyEntry = new TaskHistory({
        taskId,
        type: "bulk_action",
        value: action,
        remark: `Bulk action: ${action} by ${req.user.username || "Unknown"}`,
        userId: req.user.id,
        timestamp: new Date(),
      });
      await historyEntry.save();
    }

    res.json({
      message: `Successfully updated ${result.modifiedCount} tasks`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("❌ Error in bulk update:", err);
    res.status(500).json({
      message: "Server error during bulk update",
      error: err.message,
    });
  }
});

// POST /api/tasks/generate-new
router.post("/generate-new", auth, async (req, res) => {
  try {
    const { clientCode, serviceCode, teamMemberId, startDate, financialYear } =
      req.body;
    console.log("POST /api/tasks/generate-new called with payload:", req.body);

    // Validate required fields
    if (
      !clientCode ||
      !serviceCode ||
      !teamMemberId ||
      !startDate ||
      !financialYear
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate financial year format
    if (!/^FY \d{4}-\d{2}$/.test(financialYear)) {
      return res
        .status(400)
        .json({ message: "Invalid financial year format (use FY YYYY-YY)" });
    }

    // Validate startDate
    const referenceDate = new Date(startDate);
    if (!isValid(referenceDate)) {
      return res.status(400).json({ message: "Invalid start date provided" });
    }

    // Fetch service
    const service = await Service.findOne({ serviceCode });
    if (!service) {
      return res
        .status(400)
        .json({ message: `Service with code ${serviceCode} not found` });
    }

    // Validate service dates
    if (!service.assignmentDates || service.assignmentDates.length === 0) {
      return res.status(400).json({
        message: `No assignment dates defined for service ${serviceCode}`,
      });
    }
    if (!service.dueDate) {
      return res
        .status(400)
        .json({ message: `No due date defined for service ${serviceCode}` });
    }

    // Parse financial year
    const [fyStartYear, fyEndYear] = financialYear
      .replace("FY ", "")
      .split("-")
      .map(Number);
    const baseYear = fyStartYear < 100 ? 2000 + fyStartYear : fyStartYear;
    const fyEndDate = new Date(baseYear + 1, 2, 31); // March 31 of next year

    const tasks = [];
    const errors = [];

    // Determine assignment and due dates based on frequency
    const generateTask = (assignedAt, dueDate, servicePeriod) => {
      if (!isValid(assignedAt) || !isValid(dueDate)) {
        throw new Error(
          `Invalid task dates: assignedAt=${assignedAt}, dueDate=${dueDate}`
        );
      }
      const task = new Task({
        clientCode,
        serviceCode,
        serviceName: service.serviceName,
        teamMemberId,
        assignedAt,
        dueDate,
        status: assignedAt > new Date() ? "Upcoming" : "Pending",
        financialYear,
        relatedFinancialYear: financialYear,
        servicePeriod,
        overdue: dueDate < new Date(),
      });
      return task;
    };

    const parseServiceDate = (
      dateStr,
      referenceDate,
      isAssignmentDate = false,
      frequency
    ) => {
      if (!dateStr || typeof dateStr !== "string") {
        return referenceDate; // Fallback to referenceDate
      }
      // Handle numeric day strings for Monthly/Quarterly assignmentDates and dueDate
      if (
        (frequency === "Monthly" || frequency === "Quarterly") &&
        !isNaN(parseInt(dateStr))
      ) {
        const day = parseInt(dateStr);
        if (day < 1 || day > 31) {
          throw new Error(`Invalid day number: ${dateStr}`);
        }
        const resultDate = new Date(referenceDate);
        resultDate.setDate(day);
        if (!isValid(resultDate)) {
          throw new Error(`Invalid date generated for day ${dateStr}`);
        }
        return resultDate;
      }
      // Handle "N days" format
      if (dateStr.includes("days")) {
        const days = parseInt(dateStr);
        if (isNaN(days)) {
          throw new Error(`Invalid due date format: ${dateStr}`);
        }
        const resultDate = addDays(referenceDate, days);
        if (!isValid(resultDate)) {
          throw new Error(`Invalid date generated for ${dateStr}`);
        }
        return resultDate;
      }
      // Handle "dd-MMM" format
      try {
        const currentYear = referenceDate.getFullYear();
        const parsedDate = parse(
          dateStr,
          "dd-MMM",
          new Date(currentYear, 0, 1)
        );
        if (!isValid(parsedDate)) {
          throw new Error(`Invalid date format: ${dateStr}`);
        }
        return parsedDate;
      } catch (err) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }
    };

    const getQuarter = (date) => {
      const month = date.getMonth();
      return Math.floor(month / 3) + 1; // Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar
    };

    if (service.frequency === "On Demand") {
      // On-Demand: Assign on startDate, due N days later
      const assignedAt = referenceDate;
      const dueDate = parseServiceDate(
        service.dueDate,
        assignedAt,
        false,
        service.frequency
      );
      if (!isValid(dueDate)) {
        errors.push({
          message: `Invalid due date for service ${serviceCode}`,
          serviceCode,
        });
        return;
      }
      const task = generateTask(assignedAt, dueDate, "On-Demand");
      tasks.push(task);
    } else if (service.frequency === "Yearly") {
      // Yearly: Assign in the financial year
      const taskYear = service.shiftNextPeriod ? baseYear + 1 : baseYear;
      const assignedAt = parseServiceDate(
        service.assignmentDates[0],
        new Date(taskYear, 0, 1),
        true,
        service.frequency
      );
      const dueDate = parseServiceDate(
        service.dueDate,
        assignedAt,
        false,
        service.frequency
      );
      if (!isValid(assignedAt) || !isValid(dueDate)) {
        errors.push({
          message: `Invalid assignment or due date for service ${serviceCode}`,
          serviceCode,
        });
        return;
      }
      const task = generateTask(assignedAt, dueDate, financialYear);
      tasks.push(task);
    } else if (service.frequency === "Monthly" && service.repetitive) {
      // Monthly: Generate tasks for each month from startDate to FY end
      const startMonth = referenceDate.getMonth();
      const startYear = referenceDate.getFullYear();
      const startPeriodIndex =
        startMonth >= 3 ? startMonth - 3 : startMonth + 9;
      for (let j = startPeriodIndex; j < 12; j++) {
        const serviceMonth = j % 12;
        const periodYear =
          baseYear +
          Math.floor(
            (3 + serviceMonth + (service.shiftNextPeriod ? 1 : 0)) / 12
          );
        const assignMonth =
          (3 + serviceMonth + (service.shiftNextPeriod ? 1 : 0)) % 12;
        const assignedAt = parseServiceDate(
          service.assignmentDates[0],
          new Date(periodYear, assignMonth, 1),
          true,
          service.frequency
        );
        const dueDate = parseServiceDate(
          service.dueDate,
          assignedAt,
          false,
          service.frequency
        );
        if (!isValid(assignedAt) || !isValid(dueDate)) {
          errors.push({
            message: `Invalid assignment or due date for service ${serviceCode} in ${format(
              new Date(baseYear, 3 + serviceMonth, 1),
              "MMM-yyyy"
            )}`,
            serviceCode,
          });
          continue;
        }
        const servicePeriod = format(
          new Date(baseYear, 3 + serviceMonth, 1),
          "MMM-yyyy"
        );
        const task = generateTask(assignedAt, dueDate, servicePeriod);
        tasks.push(task);
      }
    } else if (service.frequency === "Quarterly" && service.repetitive) {
      // Quarterly: Generate tasks for each quarter from startDate to FY end
      const startMonth = referenceDate.getMonth();
      const startYear = referenceDate.getFullYear();
      const startPeriodIndex =
        startMonth >= 3
          ? Math.floor((startMonth - 3) / 3)
          : Math.floor((startMonth + 9) / 3);
      for (let j = startPeriodIndex; j < 4; j++) {
        const quarterStartMonth = 3 + j * 3;
        const periodYear =
          baseYear +
          Math.floor(
            (quarterStartMonth + (service.shiftNextPeriod ? 3 : 0)) / 12
          );
        const assignMonth =
          (quarterStartMonth + (service.shiftNextPeriod ? 3 : 0)) % 12;
        const assignedAt = parseServiceDate(
          service.assignmentDates[0],
          new Date(periodYear, assignMonth, 1),
          true,
          service.frequency
        );
        const dueDate = parseServiceDate(
          service.dueDate,
          assignedAt,
          false,
          service.frequency
        );
        if (!isValid(assignedAt) || !isValid(dueDate)) {
          errors.push({
            message: `Invalid assignment or due date for service ${serviceCode} in Q${
              j + 1
            }-${baseYear}`,
            serviceCode,
          });
          continue;
        }
        const servicePeriod = `Q${j + 1}-${baseYear}`;
        const task = generateTask(assignedAt, dueDate, servicePeriod);
        tasks.push(task);
      }
    } else if (service.frequency === "Weekly" && service.repetitive) {
      // Weekly: Generate tasks for each assignment date in each month from startDate to FY end
      const startMonth = referenceDate.getMonth();
      const startYear = referenceDate.getFullYear();
      const startPeriodIndex =
        startMonth >= 3 ? startMonth - 3 : startMonth + 9;
      for (let j = startPeriodIndex; j < 12; j++) {
        const monthIndex = 3 + j;
        const year = baseYear + Math.floor(monthIndex / 12);
        const month = monthIndex % 12;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        service.assignmentDates.forEach((dayStr) => {
          const day = parseInt(dayStr);
          if (isNaN(day) || day < 1 || day > daysInMonth) {
            errors.push({
              message: `Invalid assignment date ${dayStr} for service ${serviceCode} in ${format(
                new Date(year, month, 1),
                "MMM-yyyy"
              )}`,
              serviceCode,
            });
            return;
          }
          const assignedAt = new Date(year, month, day);
          if (!isValid(assignedAt) || assignedAt > fyEndDate) {
            return;
          }
          const dueDate = parseServiceDate(
            service.dueDate,
            assignedAt,
            false,
            service.frequency
          );
          if (!isValid(dueDate)) {
            errors.push({
              message: `Invalid due date for service ${serviceCode} in ${format(
                new Date(year, month, 1),
                "MMM-yyyy"
              )}`,
              serviceCode,
            });
            return;
          }
          const servicePeriod = format(assignedAt, "MMM-yyyy");
          const task = generateTask(assignedAt, dueDate, servicePeriod);
          tasks.push(task);
        });
      }
    } else {
      // Non-repetitive Monthly, Quarterly, or Weekly: Generate one task
      let assignedAt, dueDate, servicePeriod;
      if (service.frequency === "Monthly") {
        const periodYear = referenceDate.getFullYear();
        const periodMonth = referenceDate.getMonth();
        const assignMonth = service.shiftNextPeriod
          ? periodMonth + 1
          : periodMonth;
        assignedAt = parseServiceDate(
          service.assignmentDates[0],
          new Date(periodYear, assignMonth, 1),
          true,
          service.frequency
        );
        dueDate = parseServiceDate(
          service.dueDate,
          assignedAt,
          false,
          service.frequency
        );
        servicePeriod = format(
          new Date(periodYear, periodMonth, 1),
          "MMM-yyyy"
        );
      } else if (service.frequency === "Quarterly") {
        const periodYear = referenceDate.getFullYear();
        const periodMonth = referenceDate.getMonth();
        const quarterStartMonth = Math.floor(periodMonth / 3) * 3;
        const assignMonth = service.shiftNextPeriod
          ? quarterStartMonth + 3
          : quarterStartMonth;
        assignedAt = parseServiceDate(
          service.assignmentDates[0],
          new Date(periodYear, assignMonth, 1),
          true,
          service.frequency
        );
        dueDate = parseServiceDate(
          service.dueDate,
          assignedAt,
          false,
          service.frequency
        );
        servicePeriod = `Q${getQuarter(
          new Date(periodYear, quarterStartMonth, 1)
        )}-${periodYear}`;
      } else if (service.frequency === "Weekly") {
        const month = referenceDate.getMonth();
        const year = referenceDate.getFullYear();
        const dayStr = service.assignmentDates[0];
        const day = parseInt(dayStr);
        if (isNaN(day) || day < 1 || day > 31) {
          errors.push({
            message: `Invalid assignment date ${dayStr} for service ${serviceCode}`,
            serviceCode,
          });
          return;
        }
        assignedAt = new Date(year, month, day);
        if (!isValid(assignedAt)) {
          errors.push({
            message: `Invalid assigned date for day ${dayStr} in service ${serviceCode}`,
            serviceCode,
          });
          return;
        }
        dueDate = parseServiceDate(
          service.dueDate,
          assignedAt,
          false,
          service.frequency
        );
        servicePeriod = format(assignedAt, "MMM-yyyy");
      }

      if (!isValid(assignedAt) || !isValid(dueDate)) {
        errors.push({
          message: `Invalid assignment or due date for service ${serviceCode}`,
          serviceCode,
        });
        return;
      }
      const task = generateTask(assignedAt, dueDate, servicePeriod);
      tasks.push(task);
    }

    // Save tasks
    for (const task of tasks) {
      const existingTask = await Task.findOne({
        clientCode,
        serviceCode: task.serviceCode,
        assignedAt: task.assignedAt,
        servicePeriod: task.servicePeriod,
        status: { $ne: "Deleted" },
      });
      if (existingTask) {
        errors.push({
          message: `Task already exists for client ${clientCode}, service ${serviceCode}, period ${
            task.servicePeriod
          }, assignedAt ${format(task.assignedAt, "dd-MMM-yyyy")}`,
          clientCode,
          serviceCode,
          servicePeriod: task.servicePeriod,
          assignedAt: format(task.assignedAt, "dd-MMM-yyyy"),
        });
        continue;
      }
      await task.save();
    }

    // Create TaskHistory entry
    const taskHistory = new TaskHistory({
      taskId: tasks.length > 0 ? tasks[0]._id : null,
      type: "creation",
      value: `Task created for ${clientCode} - ${service.serviceName}`,
      userId: req.user.id,
      pendingApproval: req.user.isAdmin ? false : true,
    });
    await taskHistory.save();

    // Response
    if (tasks.length === 0 && errors.length > 0) {
      return res.status(400).json({ message: "No tasks created", errors });
    }

    const message = req.user.isAdmin
      ? `Assigned ${tasks.length} tasks successfully`
      : `Task creation request submitted for approval (${tasks.length} tasks)`;
    res
      .status(200)
      .json({ message, tasksCreated: tasks.length, tasks, errors });
  } catch (err) {
    console.error("Task generation error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Generate existing tasks from client-service mappings
router.post("/generate-existing", adminAuth, async (req, res) => {
  try {
    const clientServices = await ClientService.find();
    const services = await Service.find();
    const clients = await Client.find();
    const teams = await Team.find();
    const results = [];
    const errors = [];
    const summary = {};
    const currentDate = new Date();
    const currentFYStartYear =
      currentDate.getMonth() < 3
        ? currentDate.getFullYear() - 1
        : currentDate.getFullYear();

    for (let i = 0; i < clientServices.length; i++) {
      const cs = clientServices[i];
      const rowNumber = i + 2;
      const service = services.find((s) => s.serviceCode === cs.serviceCode);

      if (!service) {
        errors.push({
          row: rowNumber,
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          serviceName: "",
          financialYear: cs.financialYear,
          assignedAt: "",
          dueDate: "",
          servicePeriod: "",
          assignmentDates: "",
          message: "Service not found",
        });
        continue;
      }

      if (!summary[service.serviceCode]) {
        summary[service.serviceCode] = {
          serviceName: service.serviceName,
          serviceCode: service.serviceCode,
          taskCount: 0,
          clientCount: new Set(),
        };
      }

      if (service.frequency === "On Demand") {
        results.push({
          clientCode: cs.clientCode,
          clientName:
            clients.find((c) => c.clientCode === cs.clientCode)?.clientName ||
            "Unknown",
          serviceCode: cs.serviceCode,
          serviceName: service.serviceName,
          teamMemberName:
            teams.find((t) => t.teamMemberId === cs.teamMemberId)?.name ||
            "Unknown",
          financialYear: cs.financialYear,
          status: "skipped",
          message:
            "On-Demand service; task generation deferred to manual creation",
          servicePeriod: "",
          assignmentDates: service.assignmentDates.join(","),
        });
        continue;
      }

      const client = clients.find((c) => c.clientCode === cs.clientCode);
      if (!client) {
        errors.push({
          row: rowNumber,
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          serviceName: service.serviceName || "Unknown",
          financialYear: cs.financialYear,
          assignedAt: "",
          dueDate: "",
          servicePeriod: "",
          assignmentDates: "",
          message: "Client not found",
        });
        continue;
      }

      if (!cs.teamMemberId || !cs.serviceCode || !cs.financialYear) {
        errors.push({
          row: rowNumber,
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          serviceName: service.serviceName || "Unknown",
          financialYear: cs.financialYear,
          assignedAt: "",
          dueDate: "",
          servicePeriod: "",
          assignmentDates: "",
          message: "Missing teamMemberId, serviceCode, or financialYear",
        });
        continue;
      }

      let startYear, endYear;
      try {
        const financialYearParts = cs.financialYear.split("-");
        startYear = parseInt(financialYearParts[0].replace("FY ", ""));
        endYear =
          parseInt(financialYearParts[1]) + (startYear - (startYear % 100));
        if (isNaN(startYear) || isNaN(endYear) || startYear + 1 !== endYear) {
          throw new Error("Invalid financial year format");
        }
      } catch (err) {
        errors.push({
          row: rowNumber,
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          serviceName: service.serviceName || "Unknown",
          financialYear: cs.financialYear,
          assignedAt: "",
          dueDate: "",
          servicePeriod: "",
          assignmentDates: "",
          message: `Invalid financial year: ${cs.financialYear}`,
        });
        continue;
      }

      const parsedStartDate = cs.startDate
        ? new Date(cs.startDate)
        : new Date(startYear, 3, 1);
      if (!isValid(parsedStartDate)) {
        errors.push({
          row: rowNumber,
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          serviceName: service.serviceName || "Unknown",
          financialYear: cs.financialYear,
          assignedAt: "",
          dueDate: "",
          servicePeriod: "",
          assignmentDates: "",
          message: `Invalid ClientService startDate: ${cs.startDate}`,
        });
        continue;
      }

      // Validate FY restrictions
      const startFY = getFinancialYear(parsedStartDate);
      const startFYYear = parseInt(startFY.split("-")[0].replace("FY ", ""));
      if (startFYYear < currentFYStartYear - 1) {
        errors.push({
          row: rowNumber,
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          serviceName: service.serviceName || "Unknown",
          financialYear: cs.financialYear,
          assignedAt: "",
          dueDate: "",
          servicePeriod: "",
          assignmentDates: "",
          message: `Start date must be in FY ${currentFYStartYear - 1}-${(
            currentFYStartYear % 100
          )
            .toString()
            .padStart(2, "0")} or later`,
        });
        continue;
      }
      if (service.frequency === "Weekly" && startFYYear < currentFYStartYear) {
        errors.push({
          row: rowNumber,
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          serviceName: service.serviceName || "Unknown",
          financialYear: cs.financialYear,
          assignedAt: "",
          dueDate: "",
          servicePeriod: "",
          assignmentDates: "",
          message: `Weekly services must start in FY ${currentFYStartYear}-${(
            (currentFYStartYear + 1) %
            100
          )
            .toString()
            .padStart(2, "0")} or later`,
        });
        continue;
      }

      // Determine FYs to process
      let fyYears = [startYear];
      if (
        service.frequency !== "Yearly" &&
        startYear === currentFYStartYear - 1
      ) {
        fyYears.push(currentFYStartYear);
      }

      for (const taskFYYear of fyYears) {
        let periods =
          service.frequency === "Monthly"
            ? 12
            : service.frequency === "Quarterly"
            ? 4
            : service.frequency === "Yearly"
            ? 1
            : service.frequency === "Weekly"
            ? 12
            : 0;
        let startPeriodIndex = 0;

        if (
          (service.frequency === "Monthly" ||
            service.frequency === "Quarterly") &&
          cs.startDate &&
          taskFYYear === startFYYear
        ) {
          const startMonth = parsedStartDate.getMonth();
          if (service.frequency === "Monthly") {
            startPeriodIndex = (startMonth - 3 + 12) % 12;
            if (startMonth >= 3) {
              startPeriodIndex = startMonth - 3;
            } else {
              startPeriodIndex = startMonth + 9;
            }
          } else if (service.frequency === "Quarterly") {
            startPeriodIndex = Math.floor((startMonth - 3 + 12) / 3) % 4;
            if (startMonth >= 3) {
              startPeriodIndex = Math.floor((startMonth - 3) / 3);
            } else if (startMonth < 1) {
              startPeriodIndex = 3; // Q4 only
            }
          }
        }

        for (let j = startPeriodIndex; j < periods; j++) {
          let assignedAt = null,
            dueDate = null,
            servicePeriod = "",
            relatedFinancialYear;
          try {
            if (service.frequency === "Yearly") {
              const baseYear = service.shiftNextPeriod
                ? taskFYYear + 1
                : taskFYYear;
              const assignDateStr = service.assignmentDates[0];
              const dueDateStr = service.dueDate;
              assignedAt = parse(
                `${assignDateStr}-${baseYear}`,
                "dd-MMM-yyyy",
                new Date()
              );
              dueDate = parse(
                `${dueDateStr}-${baseYear}`,
                "dd-MMM-yyyy",
                new Date()
              );
              if (!isValid(assignedAt) || !isValid(dueDate)) {
                throw new Error(
                  `Invalid date format: ${assignDateStr} or ${dueDateStr}`
                );
              }
              servicePeriod = `FY ${startYear}-${(startYear + 1) % 100}`;
              relatedFinancialYear = `FY ${taskFYYear}-${
                (taskFYYear + 1) % 100
              }`;
            } else if (service.frequency === "Monthly") {
              const serviceMonth = j % 12;
              const assignDay = parseInt(service.assignmentDates[0]) || 1;
              const dueDay = parseInt(service.dueDate) || 11;
              const monthOffset = service.shiftNextPeriod ? 1 : 0;
              const periodYear =
                taskFYYear + Math.floor((3 + serviceMonth + monthOffset) / 12);
              const periodMonth = (3 + serviceMonth + monthOffset) % 12;
              assignedAt = new Date(periodYear, periodMonth, assignDay);
              dueDate = new Date(periodYear, periodMonth, dueDay);
              if (!isValid(dueDate)) {
                throw new Error(`Invalid due date: ${service.dueDate}`);
              }
              servicePeriod = format(
                new Date(taskFYYear, 3 + serviceMonth, 1),
                "MMM-yy"
              );
              relatedFinancialYear = `FY ${taskFYYear}-${
                (taskFYYear + 1) % 100
              }`;
            } else if (service.frequency === "Quarterly") {
              const quarterIndex = j % 4;
              const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];
              const quarterStartMonth = 3 + quarterIndex * 3;
              const assignDay = parseInt(service.assignmentDates[0]) || 1;
              const dueDay = parseInt(service.dueDate) || 11;
              const periodYear =
                taskFYYear +
                Math.floor(
                  (quarterStartMonth + (service.shiftNextPeriod ? 3 : 0)) / 12
                );
              const periodMonth =
                (quarterStartMonth + (service.shiftNextPeriod ? 3 : 0)) % 12;
              assignedAt = new Date(periodYear, periodMonth, assignDay);
              dueDate = new Date(periodYear, periodMonth, dueDay);
              if (!isValid(dueDate)) {
                throw new Error(`Invalid due date: ${service.dueDate}`);
              }
              servicePeriod = `${quarterLabels[quarterIndex]}-${
                taskFYYear % 100
              }`;
              relatedFinancialYear = `FY ${taskFYYear}-${
                (taskFYYear + 1) % 100
              }`;
            } else if (service.frequency === "Weekly") {
              const monthIndex = 3 + j;
              const fyEnd = new Date(taskFYYear + 1, 2, 31);
              const assignmentDays = service.assignmentDates
                .map((day) => parseInt(day))
                .filter((day) => !isNaN(day) && day >= 1 && day <= 31);
              if (assignmentDays.length === 0) {
                errors.push({
                  row: rowNumber,
                  clientCode: cs.clientCode,
                  serviceCode: cs.serviceCode,
                  serviceName: service.serviceName,
                  financialYear: cs.financialYear,
                  assignedAt: "",
                  dueDate: "",
                  servicePeriod: "",
                  assignmentDates: service.assignmentDates.join(","),
                  message:
                    "No valid assignment days provided for weekly service",
                });
                continue;
              }
              for (const assignDay of assignmentDays) {
                const daysInMonth = new Date(
                  taskFYYear,
                  monthIndex + 1,
                  0
                ).getDate();
                if (assignDay > daysInMonth) {
                  errors.push({
                    row: rowNumber,
                    clientCode: cs.clientCode,
                    serviceCode: cs.serviceCode,
                    serviceName: service.serviceName,
                    financialYear: cs.financialYear,
                    assignedAt: "",
                    dueDate: "",
                    servicePeriod: "",
                    assignmentDates: assignDay,
                    message: `Invalid assignment day ${assignDay} for month ${
                      monthIndex + 1
                    }`,
                  });
                  continue;
                }
                assignedAt = new Date(taskFYYear, monthIndex, assignDay);
                if (assignedAt > fyEnd) {
                  continue;
                }
                const dueDay =
                  parseInt(service.dueDate.replace(" days", "")) || 7;
                dueDate = new Date(
                  assignedAt.getTime() + dueDay * 24 * 60 * 60 * 1000
                );
                servicePeriod = format(assignedAt, "dd-MMM-yy");
                relatedFinancialYear = `FY ${taskFYYear}-${
                  (taskFYYear + 1) % 100
                }`;
                const existingTask = await Task.findOne({
                  clientCode: cs.clientCode,
                  serviceCode: cs.serviceCode,
                  assignedAt,
                  servicePeriod,
                });
                if (existingTask) {
                  results.push({
                    clientCode: cs.clientCode,
                    clientName: client.clientName,
                    serviceCode: cs.serviceCode,
                    serviceName: service.serviceName,
                    teamMemberName:
                      teams.find((t) => t.teamMemberId === cs.teamMemberId)
                        ?.name || "Unknown",
                    financialYear: relatedFinancialYear,
                    status: "already_exists",
                    message: `Task already exists for period ${servicePeriod}`,
                    servicePeriod,
                    assignmentDates: assignDay,
                  });
                  continue;
                }
                const taskStatus =
                  assignedAt <= currentDate ? "Pending" : "Upcoming";
                const task = new Task({
                  clientCode: cs.clientCode,
                  serviceCode: cs.serviceCode,
                  serviceName: service.serviceName,
                  teamMemberId: cs.teamMemberId,
                  assignedAt,
                  dueDate,
                  status: taskStatus,
                  financialYear: relatedFinancialYear,
                  relatedFinancialYear,
                  servicePeriod,
                  overdue: dueDate < currentDate && taskStatus !== "Completed",
                });
                await task.save();
                summary[service.serviceCode].taskCount += 1;
                summary[service.serviceCode].clientCount.add(cs.clientCode);
                results.push({
                  clientCode: cs.clientCode,
                  clientName: client.clientName,
                  serviceCode: cs.serviceCode,
                  serviceName: service.serviceName,
                  teamMemberName:
                    teams.find((t) => t.teamMemberId === cs.teamMemberId)
                      ?.name || "Unknown",
                  financialYear: relatedFinancialYear,
                  status: "assigned",
                  message: "Task created successfully",
                  servicePeriod,
                  assignmentDates: assignDay,
                });
              }
              continue;
            } else {
              throw new Error(`Unsupported frequency: ${service.frequency}`);
            }

            if (cs.startDate && assignedAt < parsedStartDate) {
              continue;
            }

            const existingTask = await Task.findOne({
              clientCode: cs.clientCode,
              serviceCode: cs.serviceCode,
              assignedAt,
              servicePeriod,
            });

            if (existingTask) {
              results.push({
                clientCode: cs.clientCode,
                clientName: client.clientName,
                serviceCode: cs.serviceCode,
                serviceName: service.serviceName,
                teamMemberName:
                  teams.find((t) => t.teamMemberId === cs.teamMemberId)?.name ||
                  "Unknown",
                financialYear: relatedFinancialYear,
                status: "already_exists",
                message: `Task already exists for period ${servicePeriod}`,
                servicePeriod,
                assignmentDates: service.assignmentDates.join(","),
              });
              continue;
            }

            const taskStatus =
              assignedAt <= currentDate ? "Pending" : "Upcoming";
            const task = new Task({
              clientCode: cs.clientCode,
              serviceCode: cs.serviceCode,
              serviceName: service.serviceName,
              teamMemberId: cs.teamMemberId,
              assignedAt,
              dueDate,
              status: taskStatus,
              financialYear: relatedFinancialYear,
              relatedFinancialYear,
              servicePeriod,
              overdue: dueDate < currentDate && taskStatus !== "Completed",
            });

            await task.save();
            summary[service.serviceCode].taskCount += 1;
            summary[service.serviceCode].clientCount.add(cs.clientCode);
            results.push({
              clientCode: cs.clientCode,
              clientName: client.clientName,
              serviceCode: cs.serviceCode,
              serviceName: service.serviceName,
              teamMemberName:
                teams.find((t) => t.teamMemberId === cs.teamMemberId)?.name ||
                "Unknown",
              financialYear: relatedFinancialYear,
              status: "assigned",
              message: "Task created successfully",
              servicePeriod,
              assignmentDates: service.assignmentDates.join(","),
            });
          } catch (err) {
            errors.push({
              row: rowNumber,
              clientCode: cs.clientCode,
              serviceCode: cs.serviceCode,
              serviceName: service.serviceName || "Unknown",
              financialYear: cs.financialYear,
              assignedAt:
                assignedAt && isValid(assignedAt)
                  ? assignedAt.toISOString()
                  : "",
              dueDate: dueDate && isValid(dueDate) ? dueDate.toISOString() : "",
              servicePeriod: servicePeriod || "",
              assignmentDates: service.assignmentDates.join(","),
              message: err.message || "Failed to generate task",
            });
          }
        }
      }
    }

    Object.values(summary).forEach((entry) => {
      entry.clientCount = entry.clientCount.size;
    });

    const assignedCount = results.filter((r) => r.status === "assigned").length;
    const alreadyExistsCount = results.filter(
      (r) => r.status === "already_exists"
    ).length;
    const summaryMessage = `Assigned ${assignedCount} tasks, ${alreadyExistsCount} already exist, ${errors.length} errors`;

    res.status(201).json({ message: summaryMessage, results, errors, summary });
  } catch (err) {
    console.error("Task generation error:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to generate tasks" });
  }
});

// Legacy task generation endpoint (for compatibility)
router.post("/generate", auth, async (req, res) => {
  // Redirect to new generation endpoint
  return router.handle(req, res, (req, res) => {
    req.url = "/generate-new";
    return router(req, res);
  });
});

// Get client services
router.get("/clientservices", auth, async (req, res) => {
  try {
    const { clientCode } = req.query;
    const filter = clientCode ? { clientCode } : {};

    const clientServices = await ClientService.find(filter)
      .populate("serviceCode", "serviceName")
      .lean();

    res.json(clientServices);
  } catch (err) {
    console.error("❌ Error fetching client services:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add client service
router.post("/clientservices", auth, async (req, res) => {
  const { clientCode, serviceCode, teamMemberId, startDate, financialYear } =
    req.body;

  try {
    const existing = await ClientService.findOne({
      clientCode,
      serviceCode,
      financialYear,
    });

    if (existing) {
      return res.status(400).json({
        message: "Service already in client portfolio for this financial year",
      });
    }

    const clientService = new ClientService({
      clientCode,
      serviceCode,
      teamMemberId,
      startDate: startDate ? new Date(startDate) : null,
      financialYear,
    });

    await clientService.save();

    res.status(201).json({
      message: "Client-service mapping added successfully",
      clientService,
    });
  } catch (err) {
    console.error("Error adding client-service:", err.message, err.stack);
    res
      .status(400)
      .json({ message: err.message || "Failed to add client-service mapping" });
  }
});

// Get all services
router.get("/services", auth, async (req, res) => {
  try {
    const services = await Service.find().lean();
    res.json(services);
  } catch (err) {
    console.error("Error fetching services:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
});

// Get service names only
router.get("/services/names", auth, async (req, res) => {
  try {
    const services = await Service.find({}, "serviceName").lean();
    const serviceNames = services.map((service) => service.serviceName);
    res.json(serviceNames);
  } catch (err) {
    console.error("Error fetching service names:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a service
router.post("/services", auth, adminAuth, async (req, res) => {
  const {
    serviceCode,
    serviceName,
    sacCode,
    serviceGroup,
    frequency,
    assignmentDates,
    dueDate,
    shiftNextPeriod,
    repetitive,
    priority,
    remarks,
  } = req.body;

  try {
    const existing = await Service.findOne({ serviceCode });
    if (existing) {
      return res.status(400).json({ message: "Service code already exists" });
    }

    const service = new Service({
      serviceCode,
      serviceName,
      sacCode,
      serviceGroup,
      frequency,
      assignmentDates,
      dueDate,
      shiftNextPeriod,
      repetitive,
      priority,
      remarks,
    });

    await service.save();
    res.status(201).json({ message: "Service created successfully", service });
  } catch (err) {
    console.error("Error creating service:", err.message, err.stack);
    res
      .status(400)
      .json({ message: err.message || "Failed to create service" });
  }
});

// Update a service
router.put("/services/:id", auth, adminAuth, async (req, res) => {
  const {
    serviceCode,
    serviceName,
    sacCode,
    serviceGroup,
    frequency,
    assignmentDates,
    dueDate,
    shiftNextPeriod,
    repetitive,
    priority,
    remarks,
  } = req.body;

  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    service.serviceCode = serviceCode || service.serviceCode;
    service.serviceName = serviceName || service.serviceName;
    service.sacCode = sacCode || service.sacCode;
    service.serviceGroup = serviceGroup || service.serviceGroup;
    service.frequency = frequency || service.frequency;
    service.assignmentDates = assignmentDates || service.assignmentDates;
    service.dueDate = dueDate || service.dueDate;
    service.shiftNextPeriod =
      shiftNextPeriod !== undefined ? shiftNextPeriod : service.shiftNextPeriod;
    service.repetitive =
      repetitive !== undefined ? repetitive : service.repetitive;
    service.priority = priority || service.priority;
    service.remarks = remarks || service.remarks;

    await service.save();
    res.json({ message: "Service updated successfully", service });
  } catch (err) {
    console.error("Error updating service:", err.message, err.stack);
    res
      .status(400)
      .json({ message: err.message || "Failed to update service" });
  }
});

// Delete a service
router.delete("/services/:id", auth, adminAuth, async (req, res) => {
  try {
    const result = await Service.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error("Error deleting service:", err.message, err.stack);
    res
      .status(400)
      .json({ message: err.message || "Failed to delete service" });
  }
});

// Bulk operations endpoint
router.patch("/bulk", auth, async (req, res) => {
  try {
    const { taskIds, updates } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: "Task IDs array is required" });
    }

    // Check if any selected tasks are already deleted
    const deletedTasks = await Task.find({
      _id: { $in: taskIds },
      status: "Deleted",
    });
    if (deletedTasks.length > 0) {
      return res.status(400).json({
        message: "Cannot perform bulk action on deleted tasks",
      });
    }

    // Validate updates object
    const allowedUpdates = ["status", "teamMemberId", "completedAt"];
    const updateKeys = Object.keys(updates);
    const isValidUpdate = updateKeys.every((key) =>
      allowedUpdates.includes(key)
    );

    if (!isValidUpdate) {
      return res.status(400).json({
        error: "Invalid update fields",
        allowed: allowedUpdates,
      });
    }

    const result = await Task.updateMany({ _id: { $in: taskIds } }, updates);

    // Log bulk action in history
    for (const taskId of taskIds) {
      const historyEntry = new TaskHistory({
        taskId,
        type: "bulk_action",
        value: updates.status || "Unknown",
        remark: `Bulk action: ${updates.status || "Unknown"} by ${
          req.user.username || "Unknown"
        }`,
        userId: req.user.id,
        timestamp: new Date(),
      });
      await historyEntry.save();
    }

    res.json({
      message: `${result.modifiedCount} tasks updated`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  } catch (err) {
    console.error("Error in bulk update:", err);
    res.status(500).json({
      error: "Bulk update failed",
      message: err.message,
    });
  }
});

// Analytics endpoint
router.get("/analytics", auth, async (req, res) => {
  try {
    const { clientCode, financialYear, teamMemberId, serviceName } = req.query;

    // Build filter for the query
    const filter = {};

    if (clientCode) {
      filter.clientCode = new RegExp(clientCode, "i");
    }
    if (financialYear) {
      filter.financialYear = financialYear;
    }
    if (teamMemberId) {
      filter.teamMemberId = teamMemberId;
    }
    if (serviceName) {
      const serviceArray = Array.isArray(serviceName)
        ? serviceName
        : serviceName.split(",");
      filter.serviceName = { $in: serviceArray.map((s) => new RegExp(s, "i")) };
    }

    // Get current date for overdue calculation
    const currentDate = new Date();

    // Aggregate statistics
    const stats = await Task.aggregate([
      { $match: filter },
      {
        $facet: {
          statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          overallStats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                pending: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "Pending"] },
                          { $gte: ["$dueDate", currentDate] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                upcoming: {
                  $sum: { $cond: [{ $eq: ["$status", "Upcoming"] }, 1, 0] },
                },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
                },
                overdue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $lt: ["$dueDate", currentDate] },
                          { $eq: ["$status", "Pending"] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                pendingOverdue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $lt: ["$dueDate", currentDate] },
                          { $eq: ["$status", "Pending"] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    const result = stats[0];
    const overallStats = result.overallStats[0] || {
      total: 0,
      pending: 0,
      upcoming: 0,
      completed: 0,
      overdue: 0,
      pendingOverdue: 0,
    };

    const formattedStats = {
      total: overallStats.total,
      pending: overallStats.pending,
      upcoming: overallStats.upcoming,
      completed: overallStats.completed,
      overdue: overallStats.overdue,
      pendingOverdue: overallStats.pendingOverdue,
      statusCounts: result.statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      completionRate:
        overallStats.total > 0
          ? Math.round((overallStats.completed / overallStats.total) * 100)
          : 0,
    };

    res.json(formattedStats);
  } catch (err) {
    console.error("❌ Error fetching analytics:", err);
    res.status(500).json({
      message: "Server error while fetching analytics",
      error: err.message,
    });
  }
});

// Enhanced Analytics endpoint
router.get("/analytics-detailed", auth, async (req, res) => {
  try {
    // Get task counts by status using aggregation
    const statusCounts = await Task.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Get completion rate
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: "Completed" });
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get tasks by priority (if priority field exists)
    const priorityCounts = await Task.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$priority", "Medium"] },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get overdue tasks
    const pendingOverdueTasks = await Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: "Pending",
    });

    // Get tasks by month for trend analysis
    const monthlyTasks = await Task.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$assignedAt" },
            month: { $month: "$assignedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 }, // Last 12 months
    ]);

    res.json({
      completionRate,
      totalTasks,
      completedTasks,
      pendingOverdueTasks,
      tasksByStatus: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      tasksByPriority: priorityCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      monthlyTrend: monthlyTasks.map((item) => ({
        month: `${item._id.year}-${item._id.month.toString().padStart(2, "0")}`,
        count: item.count,
      })),
    });
  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({
      error: "Failed to fetch analytics",
      message: err.message,
    });
  }
});

// Global error handling middleware
router.use((err, req, res, next) => {
  console.error("❌ Unhandled error in tasks route:", err);

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: "Validation Error",
      errors,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID format",
      error: err.message,
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      message: "Duplicate key error",
      error: "Resource already exists",
    });
  }

  if (err.name === "MongoError" || err.name === "MongoServerError") {
    return res.status(500).json({
      message: "Database error",
      error: "Internal server error",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: "Invalid token",
      error: "Authentication failed",
    });
  }

  res.status(500).json({
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
});

// In tasks.js, add a temporary endpoint for debugging
router.post("/update-overdue", auth, adminAuth, async (req, res) => {
  try {
    const updateResult = await Task.updateMany(
      {
        status: "Pending",
        dueDate: { $lt: new Date() },
        overdue: false,
      },
      { overdue: true }
    );
    const resetResult = await Task.updateMany(
      {
        status: "Pending",
        dueDate: { $gte: new Date() },
        overdue: true,
      },
      { overdue: false }
    );
    res.json({
      message: "Overdue status updated",
      updatedOverdue: updateResult.modifiedCount,
      resetOverdue: resetResult.modifiedCount,
    });
  } catch (err) {
    console.error("Error updating overdue status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Enhanced endpoint to get tasks pending approval with user remarks
router.get("/pending-approval", auth, adminAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ status: "Pending-Admin-Approval" }).lean();

    // Fetch the latest remark for each task
    const tasksWithRemarks = await Promise.all(
      tasks.map(async (task) => {
        const latestHistory = await TaskHistory.findOne({
          taskId: task._id,
          pendingApproval: true,
        })
          .sort({ timestamp: -1 })
          .lean();

        return {
          ...task,
          userRemark: latestHistory?.remark || "No remark provided",
          submittedAt: latestHistory?.timestamp || task.updatedAt,
        };
      })
    );

    res.json(tasksWithRemarks);
  } catch (err) {
    console.error("❌ Error fetching pending approval tasks:", err);
    res.status(500).json({
      message: "Server error while fetching pending approval tasks",
      error: err.message,
    });
  }
});

module.exports = router;
