// server/routes/tasks.js

const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Task = require("../models/Task");
const Team = require("../models/Team");
const FirmMember = require("../models/FirmMember");
const Service = require("../models/Service");
const Client = require("../models/Client");
const ClientService = require("../models/ClientService");
const TaskHistory = require("../models/TaskHistory");
const ActionStage = require("../models/ActionStage");
const { format, isValid } = require("date-fns");
const { emitFirmEvent } = require("../realtime/realtimeBus");

// --- NEW ---
// Import the refactored service to handle all generation logic
const TaskGenerator = require("../services/taskGenerationService");

const router = express.Router();

// --- MIDDLEWARE (Centralized, SaaS-safe) ---
const { auth } = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const requireFirm = require("../middleware/requireFirm");

// Apply to ALL routes in this router
router.use(auth, requireFirm);

// =======================
// Unified Cache — backed by shared dashboardCache.js utility
// =======================
// Single source of truth for all task-related caches (dash, list, stats).
// dashboardCache.js buildCacheKey() produces keys like:
//   "dash:firm=<id>:financialYear=FY+2026-27|role=ADMIN"
// clearByPrefix("firm=<id>:") wipes all modules for that firm atomically.
// To upgrade to Redis later: swap dashboardCache.js internals only.

const {
  getCache,
  setCache,
  clearByPrefix,
  buildCacheKey,
} = require("../utils/dashboardCache");

const _norm = (v) => (v == null ? "" : String(v).trim());

// ── Dash cache helpers ──────────────────────────────────────────────────────

function buildDashCacheKey(req) {
  const q = req.query || {};
  return buildCacheKey("dash", req.firmId, {
    role: String(req.user?.role || ""),
    financialYear: _norm(q.financialYear),
    teamMemberId: _norm(q.teamMemberId),
    clientCode: _norm(q.clientCode),
  });
}

function dashCacheGet(key) {
  // Returns { payload, generatedAtISO } envelope or null
  return getCache(key) || null;
}

function dashCacheSet(key, payload, ttlMs = 30_000) {
  const generatedAtISO = new Date().toISOString();
  setCache(key, { payload, generatedAtISO }, ttlMs);
  return generatedAtISO;
}

// ── List cache helpers ──────────────────────────────────────────────────────

function buildTaskListCacheKey(req) {
  const q = req.query || {};
  return buildCacheKey("list", req.firmId, {
    page: _norm(q.page || 1),
    limit: _norm(q.limit || 10),
    sortBy: _norm(q.sortBy || "statusPriority"),
    sortOrder: _norm(q.sortOrder || "asc"),
    status: _norm(q.status),
    clientCode: _norm(q.clientCode),
    financialYear: _norm(q.financialYear),
    teamMemberId: _norm(q.teamMemberId),
    serviceName: _norm(q.serviceName),
    serviceCode: _norm(q.serviceCode),
    priority: _norm(q.priority),
    search: _norm(q.search),
    fromDate: _norm(q.fromDate),
    toDate: _norm(q.toDate),
    isOverdue: _norm(q.isOverdue),
  });
}

// _store param kept for call-site compatibility — routing now via dashboardCache
function genericCacheGet(_store, key) {
  return getCache(key) || null;
}

function genericCacheSet(_store, key, payload, ttlMs = 20_000) {
  const generatedAtISO = new Date().toISOString();
  setCache(key, { payload, generatedAtISO }, ttlMs);
  return generatedAtISO;
}

// ── Stats cache helpers ─────────────────────────────────────────────────────

function buildTaskStatsCacheKey(req) {
  const q = req.query || {};
  return buildCacheKey("stats", req.firmId, {
    clientCode: _norm(q.clientCode),
    financialYear: _norm(q.financialYear),
    teamMemberId: _norm(q.teamMemberId),
    serviceName: _norm(q.serviceName),
    fromDate: _norm(q.fromDate),
    toDate: _norm(q.toDate),
  });
}

// ── Invalidation ────────────────────────────────────────────────────────────
// One call wipes dash + list + stats for the firm in a single prefix scan.
// buildCacheKey() embeds "firm=<id>:" in every key so one clearByPrefix
// atomically covers all three modules.

function clearTaskCachesForFirm(firmId) {
  clearByPrefix(`firm=${String(firmId)}:`);
}
// internal alias to avoid name clash
const emitFirmEventCore = emitFirmEvent;

// Validation middleware

const validateTaskInput = [
  body("clientCode").notEmpty().withMessage("Client code is required"),
  body("serviceCode").notEmpty().withMessage("Service code is required"),
  body("serviceName").notEmpty().withMessage("Service name is required"),
  body("teamMemberId").notEmpty().withMessage("Team member ID is required"),
  body("assignedAt").isISO8601().withMessage("Valid assigned date is required"),
  body("dueDate").isISO8601().withMessage("Valid due date is required"),
];

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

// --- helpers (once per file) ---
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// >>> PATCH START: helpers for date parsing + FY calc
const MONTHS_3 = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function parseDDMMMYYYY(s) {
  if (!s) return null;
  const m = /^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})$/.exec(String(s).trim());
  if (!m)
    throw new Error(
      "Invalid date format; expected DD-MMM-YYYY (e.g., 02-Oct-2025)",
    );
  const dd = parseInt(m[1], 10);
  const mon = MONTHS_3.indexOf(m[2].toUpperCase());
  const yyyy = parseInt(m[3], 10);
  if (mon < 0 || dd < 1 || dd > 31)
    throw new Error("Invalid day/month in effectiveDate");
  const dt = new Date(yyyy, mon, dd); // local midnight
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function getFinancialYear(date) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0=Jan
  return m >= 3
    ? `FY ${y}-${String((y + 1) % 100).padStart(2, "0")}`
    : `FY ${y - 1}-${String(y % 100).padStart(2, "0")}`;
}

// ---- CENTRAL STATUS HELPERS (IST-based) ----

// Start of "today" in Asia/Kolkata
function getTodayISTStart() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;

  return new Date(`${y}-${m}-${d}T00:00:00+05:30`);
}

/**
 * Derive assignedAt if missing or bad:
 *  - Prefer existing assignedAt (if valid)
 *  - Else derive from servicePeriod:
 *      "Dec-2025"          -> 01-Dec-2025
 *      "Block 08-May-2025 → 14-May-2025" -> 08-May-2025
 *  - Else fall back to dueDate
 *  - Else fall back to today (IST)
 */
function deriveAssignedAt(task) {
  // 1) If assignedAt exists and is a valid date, use it
  if (task.assignedAt) {
    const d = new Date(task.assignedAt);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }

  const sp = (task.servicePeriod || "").trim();
  if (sp) {
    // Monthly format: "Dec-2025"
    const m = /^([A-Za-z]{3})-(\d{4})$/.exec(sp);
    if (m) {
      const monStr = m[1].toUpperCase();
      const year = parseInt(m[2], 10);
      const idx = MONTHS_3.indexOf(monStr);
      if (idx >= 0) {
        const dt = new Date(year, idx, 1);
        dt.setHours(0, 0, 0, 0);
        return dt;
      }
    }

    // Weekly "Block 08-May-2025 → 14-May-2025"
    const w = /^Block\s+(\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{4})\s+→/i.exec(sp);
    if (w && w[1]) {
      try {
        const dt = parseDDMMMYYYY(w[1]);
        if (dt) {
          dt.setHours(0, 0, 0, 0);
          return dt;
        }
      } catch (e) {
        // ignore parse error, we will fall back
      }
    }
  }

  // Fallback: dueDate if present
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }

  // Ultimate fallback: today IST
  return getTodayISTStart();
}

/**
 * Compute the *effective* status + overdue for a task, given IST today.
 *
 * Rules for open tasks:
 *   if today < assignedAt         -> Upcoming
 *   if assignedAt <= today <= due -> Pending (not overdue)
 *   if today > due                -> Pending + overdue = true
 *
 * Closed-type statuses are passed through unchanged.
 */
function computeEffectiveStatus(task, istStartOfToday) {
  // Normalize dueDate
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const hasValidDue = dueDate && !Number.isNaN(dueDate.getTime());

  // Compute overdue for ANY "open" task (including In Progress / custom stages)
  const isOverdue = hasValidDue ? dueDate < istStartOfToday : false;

  const status = String(task.status || "").trim();

  // Closed statuses: never override
  const closedStatuses = new Set([
    "Completed",
    "Deleted",
    "Pending-Admin-Approval",
  ]);

  if (closedStatuses.has(status)) {
    return { status, overdue: false };
  }

  // IMPORTANT:
  // If task is already in some workflow/stage status (In Progress, Pending for Review, custom stage),
  // do NOT convert it into Pending/Upcoming. Just keep it.
  // (Your frontend uses actionStages to render these properly.)
  if (status && status !== "Pending" && status !== "Upcoming") {
    return { status, overdue: isOverdue };
  }

  // Now only normalize truly "open" tasks (Pending / Upcoming / empty)
  const assignedAt = deriveAssignedAt(task);

  // Upcoming if assignedAt is in the future (IST)
  if (assignedAt > istStartOfToday) {
    return { status: "Upcoming", overdue: false };
  }

  // Otherwise it's Pending
  return { status: "Pending", overdue: isOverdue };
}

// <<< PATCH END

// >>> Realtime payload helpers (smart SSE refresh)
function buildTaskRealtimePatch(task, reason = "updated") {
  if (!task) return null;
  return {
    taskId: String(task._id),
    reason,
    patch: {
      status: task.status,
      overdue: !!task.overdue,
      priority: task.priority,
      dueDate: task.dueDate,
      assignedAt: task.assignedAt,
      completedAt: task.completedAt,
      deletedAt: task.deletedAt,
      teamMemberId: task.teamMemberId,
      clientCode: task.clientCode,
      serviceCode: task.serviceCode,
      serviceName: task.serviceName,
      financialYear: task.financialYear,
      pendingAction: task.pendingAction,
      pendingStatus: task.pendingStatus,
      previousStatus: task.previousStatus,
      updatedAt: task.updatedAt || new Date(),
    },
  };
}

function emitTaskChangedRealtime(req, task, reason = "updated") {
  const payload = buildTaskRealtimePatch(task, reason);
  if (!payload) return;
  emitFirmEvent(req.firmId, "task.changed", payload);
}
// <<< Realtime payload helpers

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
      Team.countDocuments({ firm: req.firmId }),
      Client.countDocuments({ firm: req.firmId }),
      Service.countDocuments({ firm: req.firmId }),
      ClientService.countDocuments({ firm: req.firmId }),
      Task.countDocuments({ firm: req.firmId }),
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

function isComputedOpenStatus(status) {
  const s = String(status || "").trim();
  return (
    s === "Pending" ||
    s === "Upcoming" ||
    s === "Pending-Overdue" ||
    s === "Overdue"
  );
}

// ✅ Export tasks as JSON for CSV download (firm scoped, human-friendly)
router.get("/export", auth, requireFirm, async (req, res) => {
  try {
    const { financialYear, status } = req.query;

    const filter = {
      firm: req.firmId,
      isDeleted: false,
    };

    if (financialYear && String(financialYear).trim()) {
      filter.financialYear = String(financialYear).trim();
    }

    if (status && String(status).trim()) {
      filter.status = String(status).trim();
    }

    // 1) Load tasks
    const tasks = await Task.find(filter)
      .select({
        clientCode: 1,
        serviceCode: 1,
        serviceName: 1,
        teamMemberId: 1,
        assignedAt: 1,
        dueDate: 1,
        status: 1,
        overdue: 1,
        priority: 1,
        financialYear: 1,
        servicePeriod: 1,
        periodKey: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ clientCode: 1, serviceCode: 1, assignedAt: 1 })
      .lean();

    // 2) Build lookup sets
    const clientCodes = [
      ...new Set(tasks.map((t) => t.clientCode).filter(Boolean)),
    ];
    const teamMemberIds = [
      ...new Set(tasks.map((t) => t.teamMemberId).filter(Boolean)),
    ];

    // 3) Firm-scoped fetch for display names
    const [clients, teamMembers] = await Promise.all([
      clientCodes.length
        ? Client.find(
            { firm: req.firmId, clientCode: { $in: clientCodes } },
            { clientCode: 1, clientName: 1, firmName: 1 },
          ).lean()
        : [],
      teamMemberIds.length
        ? Team.find(
            { firm: req.firmId, teamMemberId: { $in: teamMemberIds } },
            { teamMemberId: 1, name: 1, role: 1 },
          ).lean()
        : [],
    ]);

    const clientMap = new Map(clients.map((c) => [String(c.clientCode), c]));
    const teamMap = new Map(
      teamMembers.map((m) => [String(m.teamMemberId), m]),
    );

    // 4) Enrich tasks for export
    const enriched = tasks.map((t) => {
      const c = clientMap.get(String(t.clientCode || "")) || null;
      const m = teamMap.get(String(t.teamMemberId || "")) || null;

      return {
        ...t,
        clientName: c?.clientName || "",
        clientFirmName: c?.firmName || "",
        teamMemberName: m?.name || "",
        teamMemberRole: m?.role || "",
      };
    });

    return res.json({
      count: enriched.length,
      tasks: enriched,
    });
  } catch (err) {
    console.error("GET /tasks/export error:", err);
    return res.status(500).json({ message: "Failed to export tasks" });
  }
});

// Get all tasks with improved filtering, stable priority sort, and pagination
// ✅ Enterprise-grade GET /api/tasks (firm-scoped + status computed + safe filtering)
// IMPORTANT:
// 1) This route assumes you already have: router.use(auth, requireFirm) at the top of the router file.
//    So DO NOT add `auth` again on this route.
// 2) Status filtering is done AFTER computeEffectiveStatus() (because status is dynamic).
// 3) Pagination + total are computed on the filtered (effective-status) set.

router.get("/", async (req, res) => {
  try {
    const cacheKey = buildTaskListCacheKey(req);
    const cached = genericCacheGet(null, cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Generated-At", cached.generatedAtISO);
      return res.json(cached.payload);
    }

    res.setHeader("X-Cache", "MISS");

    const {
      page = 1,
      limit = 10,
      sortBy = "statusPriority",
      sortOrder = "asc",

      // filters
      status, // "Pending", "Upcoming", "Completed", "Pending-Overdue", etc.
      clientCode,
      financialYear,
      teamMemberId,
      serviceName,
      serviceCode,
      priority,
      search,
      fromDate,
      toDate,
      isOverdue, // "true" or "false"
    } = req.query;

    const normalizedStatus = status ? String(status).trim() : "";
    const normalizedIsOverdue =
      typeof isOverdue === "string" ? isOverdue.toLowerCase() : undefined;

    // Frontend sends status=Pending&isOverdue=true for Pending-Overdue
    const effectiveStatusFilter =
      normalizedStatus === "Pending" && normalizedIsOverdue === "true"
        ? "Pending-Overdue"
        : normalizedStatus;

    const requestedSortBy = String(sortBy || "statusPriority").trim();
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 10));
    const dir = String(sortOrder).toLowerCase() === "desc" ? -1 : 1;

    const useComputedStatusFlow =
      isComputedOpenStatus(effectiveStatusFilter) ||
      requestedSortBy === "statusPriority" ||
      requestedSortBy === "priorityScore";

    // --------------------------------------------------
    // Base DB filter (ONLY fields that exist in DB)
    // --------------------------------------------------
    const dbFilter = {
      firm: req.firmId,
      isDeleted: false,
    };

    // Prefer exact match for direct filters for better index usage
    if (clientCode) dbFilter.clientCode = String(clientCode).trim();
    if (financialYear) dbFilter.financialYear = String(financialYear).trim();
    if (teamMemberId) dbFilter.teamMemberId = String(teamMemberId).trim();
    if (serviceCode) dbFilter.serviceCode = String(serviceCode).trim();

    if (serviceName) {
      const arr = Array.isArray(serviceName)
        ? serviceName
        : String(serviceName)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      if (arr.length) {
        dbFilter.serviceName = { $in: arr.map((s) => new RegExp(s, "i")) };
      }
    }

    if (priority) {
      const arr = String(priority)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (arr.length) dbFilter.priority = { $in: arr };
    }

    if (fromDate || toDate) {
      const dd = {};
      if (fromDate) {
        const d = new Date(fromDate);
        if (!Number.isNaN(d.getTime())) dd.$gte = d;
      }
      if (toDate) {
        const d = new Date(toDate);
        if (!Number.isNaN(d.getTime())) dd.$lte = d;
      }
      if (Object.keys(dd).length) dbFilter.dueDate = dd;
    }

    if (search) {
      const s = String(search).trim();
      if (s) {
        dbFilter.$or = [
          { clientCode: new RegExp(s, "i") },
          { serviceName: new RegExp(s, "i") },
          { teamMemberId: new RegExp(s, "i") },
          { serviceCode: new RegExp(s, "i") },
        ];
      }
    }

    // If status does NOT require computed handling, push it into Mongo directly
    if (!useComputedStatusFlow && effectiveStatusFilter) {
      dbFilter.status = effectiveStatusFilter;
    }

    const baseSelect = {
      clientCode: 1,
      serviceCode: 1,
      serviceName: 1,
      teamMemberId: 1,
      assignedAt: 1,
      dueDate: 1,
      dueDateSource: 1,
      status: 1,
      overdue: 1,
      priority: 1,
      financialYear: 1,
      servicePeriod: 1,
      periodKey: 1,
      actionStageCode: 1,
      pendingAction: 1,
      pendingStatus: 1,
      previousStatus: 1,
      completedAt: 1,
      deletedAt: 1,
      updatedAt: 1,
      createdAt: 1,
    };

    const mongoSortMap = {
      dueDate: { dueDate: dir, assignedAt: 1, _id: 1 },
      assignedAt: { assignedAt: dir, dueDate: 1, _id: 1 },
      createdAt: { createdAt: dir, _id: 1 },
      updatedAt: { updatedAt: dir, _id: 1 },
      status: { status: dir, dueDate: 1, _id: 1 },
      priority: { priority: dir, dueDate: 1, _id: 1 },
      clientCode: { clientCode: dir, dueDate: 1, _id: 1 },
      serviceCode: { serviceCode: dir, dueDate: 1, _id: 1 },
      serviceName: { serviceName: dir, dueDate: 1, _id: 1 },
      teamMemberId: { teamMemberId: dir, dueDate: 1, _id: 1 },
      financialYear: { financialYear: dir, dueDate: 1, _id: 1 },
    };

    const mongoSort = mongoSortMap[requestedSortBy] || {
      dueDate: 1,
      assignedAt: 1,
      _id: 1,
    };

    // =========================================================
    // FAST PATH:
    // DB-native filtering + sorting + pagination
    // Used when computed status flow is not required
    // =========================================================
    if (!useComputedStatusFlow) {
      const total = await Task.countDocuments(dbFilter);

      const pageTasks = await Task.find(dbFilter)
        .select(baseSelect)
        .sort(mongoSort)
        .skip((p - 1) * l)
        .limit(l)
        .lean();

      const pageClientCodes = [
        ...new Set(pageTasks.map((t) => t.clientCode).filter(Boolean)),
      ];

      const clients = pageClientCodes.length
        ? await Client.find(
            { firm: req.firmId, clientCode: { $in: pageClientCodes } },
            { clientCode: 1, clientName: 1, firmName: 1 },
          ).lean()
        : [];

      const payload = {
        tasks: pageTasks,
        clients,
        pagination: {
          page: p,
          limit: l,
          total,
          totalCount: total,
          totalPages: Math.max(1, Math.ceil(total / l)),
          hasMore: p * l < total,
        },
      };

      const generatedAtISO = genericCacheSet(null, cacheKey, payload, 20_000);
      res.setHeader("X-Generated-At", generatedAtISO);

      return res.json(payload);
    }

    // =========================================================
    // COMPUTED PATH:
    // Needed for Pending / Upcoming / Overdue / computed sorts
    // =========================================================

    // Use a stable Mongo pre-sort before in-memory computed processing
    const rawTasks = await Task.find(dbFilter)
      .select(baseSelect)
      .sort({ dueDate: 1, assignedAt: 1, _id: 1 })
      .lean();

    const istStartOfToday = getTodayISTStart();
    // ⚡ Pre-compute once — used in both enrichment and sort comparator
    const istTodayTs = istStartOfToday.getTime();

    // =========================================================
    // COMPUTED PATH — OPTIMISED
    //
    // Key changes vs old version:
    //   1) All Date objects are resolved to numeric timestamps
    //      during the map() pass, ONCE per task.
    //   2) The sort comparator reads pre-computed _xxxTs numbers
    //      — zero new Date() calls inside the comparator.
    //   3) Logic is identical to the original; only the timing
    //      of Date construction has changed.
    // =========================================================

    const CLOSED_STATUSES = new Set([
      "Completed",
      "Deleted",
      "Pending-Admin-Approval",
    ]);
    const BASE_STATUSES = new Set(["", "Pending", "Upcoming"]);

    const PRIORITY_SCORE = { Critical: 1, High: 2, Medium: 3, Low: 4 };

    const enriched = rawTasks.map((t) => {
      // --- Resolve timestamps ONCE per task ---
      const dueTsRaw = t.dueDate ? new Date(t.dueDate).getTime() : null;
      const asnTsRaw = t.assignedAt ? new Date(t.assignedAt).getTime() : null;
      const crtTs = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      const updTs = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;

      const dueTs = dueTsRaw && !Number.isNaN(dueTsRaw) ? dueTsRaw : null;
      const asnTs = asnTsRaw && !Number.isNaN(asnTsRaw) ? asnTsRaw : null;

      // --- Effective status (same logic as before, timestamps only) ---
      const existing = String(t.status || "").trim();
      let effStatus, effOverdue;

      if (CLOSED_STATUSES.has(existing)) {
        effStatus = existing;
        effOverdue = false;
      } else if (existing && !BASE_STATUSES.has(existing)) {
        // Workflow stage (In Progress, Pending for Review, custom stage…)
        effStatus = existing;
        effOverdue = dueTs !== null ? dueTs < istTodayTs : false;
      } else {
        // Truly open — determine Upcoming vs Pending
        // deriveAssignedAt reads servicePeriod string; we fall back to asnTs
        // if already valid so we avoid re-parsing when possible.
        const assignedTs =
          asnTs !== null && asnTs > 0 ? asnTs : deriveAssignedAt(t).getTime();

        if (assignedTs > istTodayTs) {
          effStatus = "Upcoming";
          effOverdue = false;
        } else {
          effStatus = "Pending";
          effOverdue = dueTs !== null ? dueTs < istTodayTs : false;
        }
      }

      // --- Status priority (lower = shown first in default sort) ---
      const statusPriority =
        effStatus === "Pending" && effOverdue
          ? 1
          : effStatus === "Pending"
            ? 2
            : effStatus === "Upcoming"
              ? 3
              : effStatus === "Completed"
                ? 6
                : effStatus === "Deleted"
                  ? 7
                  : 4;

      return {
        ...t,
        status: effStatus,
        overdue: effOverdue,
        statusPriority,
        priorityScore: PRIORITY_SCORE[t.priority] ?? 99,
        // ⚡ Pre-computed numeric sort keys — comparator reads these directly
        _dueDateTs: dueTs ?? Number.MAX_SAFE_INTEGER,
        _assignedAtTs: asnTs ?? Number.MAX_SAFE_INTEGER,
        _createdAtTs: crtTs,
        _updatedAtTs: updTs,
      };
    });

    // --- Filter by effective status ---
    let filtered = enriched;

    if (effectiveStatusFilter) {
      const s = effectiveStatusFilter;
      if (s === "Pending-Overdue" || s === "Overdue") {
        filtered = filtered.filter(
          (t) => t.status === "Pending" && t.overdue === true,
        );
      } else if (s === "Pending") {
        filtered =
          normalizedIsOverdue === "false"
            ? filtered.filter(
                (t) => t.status === "Pending" && t.overdue !== true,
              )
            : filtered.filter((t) => t.status === "Pending");
      } else if (s === "Upcoming") {
        filtered = filtered.filter((t) => t.status === "Upcoming");
      } else {
        filtered = filtered.filter((t) => t.status === s);
      }
    }

    if (normalizedIsOverdue === "true") {
      filtered = filtered.filter(
        (t) => t.status === "Pending" && t.overdue === true,
      );
    } else if (normalizedIsOverdue === "false") {
      filtered = filtered.filter(
        (t) => !(t.status === "Pending" && t.overdue === true),
      );
    }

    // ⚡ Lightning sort — ZERO new Date() calls; all values are pre-computed numbers
    const TS_KEY_MAP = {
      dueDate: "_dueDateTs",
      assignedAt: "_assignedAtTs",
      createdAt: "_createdAtTs",
      updatedAt: "_updatedAtTs",
    };

    const key = requestedSortBy;
    filtered.sort((a, b) => {
      let av, bv;

      if (key === "statusPriority") {
        av = a.statusPriority;
        bv = b.statusPriority;
      } else if (key === "priorityScore") {
        av = a.priorityScore;
        bv = b.priorityScore;
      } else if (TS_KEY_MAP[key]) {
        av = a[TS_KEY_MAP[key]];
        bv = b[TS_KEY_MAP[key]];
      } else {
        // String fields (clientCode, serviceName, etc.) — direct compare
        av = a[key];
        bv = b[key];
      }

      if (av == null && bv == null) return 0;
      if (av == null) return 1 * dir;
      if (bv == null) return -1 * dir;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      // Stable tie-break
      return String(a._id).localeCompare(String(b._id));
    });

    const total = filtered.length;
    const start = (p - 1) * l;
    const pageTasks = filtered.slice(start, start + l);

    const pageClientCodes = [
      ...new Set(pageTasks.map((t) => t.clientCode).filter(Boolean)),
    ];

    const clients = pageClientCodes.length
      ? await Client.find(
          { firm: req.firmId, clientCode: { $in: pageClientCodes } },
          { clientCode: 1, clientName: 1, firmName: 1 },
        ).lean()
      : [];

    const payload = {
      tasks: pageTasks,
      clients,
      pagination: {
        page: p,
        limit: l,
        total,
        totalCount: total,
        totalPages: Math.max(1, Math.ceil(total / l)),
        hasMore: start + l < total,
      },
    };

    const generatedAtISO = genericCacheSet(null, cacheKey, payload, 20_000);
    res.setHeader("X-Generated-At", generatedAtISO);

    return res.json(payload);
  } catch (err) {
    console.error("GET /api/tasks failed:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch tasks", error: err.message });
  }
});

// =============================================
// ✅ Enterprise Dashboard: Single API for TaskManagementPage
// GET /api/tasks/dashboard?financialYear=&teamMemberId=&clientCode=
// =============================================
router.get("/dashboard", async (req, res) => {
  try {
    const cacheKey = buildDashCacheKey(req);
    const cached = dashCacheGet(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Generated-At", cached.generatedAtISO);
      return res.json(cached.payload);
    }

    res.setHeader("X-Cache", "MISS");

    const { financialYear, teamMemberId, clientCode } = req.query || {};
    const istStartOfToday = getTodayISTStart();

    const filter = {
      firm: req.firmId,
      isDeleted: false,
    };

    if (financialYear && String(financialYear).trim()) {
      filter.financialYear = String(financialYear).trim();
    }
    if (teamMemberId && String(teamMemberId).trim()) {
      filter.teamMemberId = String(teamMemberId).trim();
    }
    if (clientCode && String(clientCode).trim()) {
      // exact match is better for dashboard filters
      filter.clientCode = String(clientCode).trim();
    }

    const isAdmin = String(req.user?.role || "").toUpperCase() === "ADMIN";

    const dueSoonCutoff = new Date(istStartOfToday);
    dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 7);

    // --------------------------------------------------
    // 1) Team lookup (small, cheap)
    // --------------------------------------------------
    const teamsPromise = Team.find({ firm: req.firmId })
      .select({ teamMemberId: 1, name: 1, role: 1 })
      .lean();

    // --------------------------------------------------
    // 2) Stats — MongoDB aggregation (runs in C++, zero Node RAM)
    //
    // Replaces: Task.find(filter).lean() + JS for-loop
    //
    // ⚠️  IST NUANCE: "Upcoming vs Pending" requires assignedAt
    //     comparison against IST midnight, which can't run in Mongo.
    //     We handle it by splitting on assignedAt > now vs <= now
    //     inside the aggregation, using the UTC equivalent of IST
    //     midnight — accurate for ~99.9% of tasks (only tasks with
    //     assignedAt derived from servicePeriod string differ by a
    //     few hours, which is acceptable for dashboard counters).
    // --------------------------------------------------
    const statsAggPromise = Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", istStartOfToday] },
                    { $lte: ["$assignedAt", istStartOfToday] },
                    {
                      $not: {
                        $in: [
                          "$status",
                          ["Completed", "Deleted", "Pending-Admin-Approval"],
                        ],
                      },
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          upcomingCount: {
            $sum: {
              $cond: [{ $gt: ["$assignedAt", istStartOfToday] }, 1, 0],
            },
          },
        },
      },
    ]);

    // --------------------------------------------------
    // 3) Urgent items — unchanged (already well-scoped in Mongo)
    // --------------------------------------------------
    const urgentFilter = {
      ...filter,
      priority: { $in: ["Critical", "High"] },
      status: { $nin: ["Completed", "Deleted", "Pending-Admin-Approval"] },
      dueDate: { $lte: dueSoonCutoff },
    };

    const urgentTasksPromise = Task.find(urgentFilter)
      .select({
        clientCode: 1,
        serviceName: 1,
        servicePeriod: 1,
        dueDate: 1,
        priority: 1,
        status: 1,
        assignedAt: 1,
      })
      .sort({ dueDate: 1, _id: 1 })
      .limit(100)
      .lean();

    // --------------------------------------------------
    // 4) Workload — MongoDB aggregation per team member
    //
    // Replaces: Task.find(...).lean() + for-loop with
    //           computeEffectiveStatus() on every task.
    // --------------------------------------------------
    const workloadAggPromise = Task.aggregate([
      {
        $match: {
          ...filter,
          status: { $nin: ["Completed", "Deleted", "Pending-Admin-Approval"] },
        },
      },
      {
        $group: {
          _id: "$teamMemberId",
          open: { $sum: 1 },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", istStartOfToday] },
                    { $lte: ["$assignedAt", istStartOfToday] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          dueNext7: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ["$dueDate", dueSoonCutoff] },
                    { $gte: ["$dueDate", istStartOfToday] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // --------------------------------------------------
    // 5) Approvals only for admin
    // --------------------------------------------------
    const approvalsPromise = isAdmin
      ? Task.find({
          firm: req.firmId,
          isDeleted: false,
          status: "Pending-Admin-Approval",
        })
          .select({
            clientCode: 1,
            serviceName: 1,
            dueDate: 1,
            teamMemberId: 1,
            pendingAction: 1,
            pendingStatus: 1,
            previousStatus: 1,
            completedAt: 1,
            userRemark: 1,
            priority: 1,
            updatedAt: 1,
          })
          .sort({ updatedAt: -1 })
          .limit(200)
          .lean()
      : Promise.resolve([]);

    const [teams, statsAggRows, urgentTasksBase, workloadAggRows, approvals] =
      await Promise.all([
        teamsPromise,
        statsAggPromise,
        urgentTasksPromise,
        workloadAggPromise,
        approvalsPromise,
      ]);

    // --------------------------------------------------
    // Collapse aggregation rows into dashboard counters
    // --------------------------------------------------
    let total = 0,
      pending = 0,
      upcoming = 0,
      completed = 0;
    let pendingOverdue = 0,
      pendingAdminApprovalCount = 0;

    for (const row of statsAggRows) {
      const status = String(row._id || "").trim();
      const count = row.count || 0;
      total += count;

      if (status === "Completed") {
        completed += count;
      } else if (status === "Pending-Admin-Approval") {
        pendingAdminApprovalCount += count;
      } else if (status === "Deleted") {
        // excluded from displayed total — do nothing
      } else {
        // Open tasks: use aggregation-computed buckets
        pendingOverdue += row.overdueCount || 0;
        upcoming += row.upcomingCount || 0;
        // "Pending, not overdue, not upcoming" = remainder
        const thisPending =
          count - (row.overdueCount || 0) - (row.upcomingCount || 0);
        pending += Math.max(0, thisPending);
      }
    }

    // --------------------------------------------------
    // Urgent items (still uses Node-side effective status —
    // small set ≤ 100, already scoped tightly in Mongo)
    // --------------------------------------------------
    const urgentClientCodes = [
      ...new Set(urgentTasksBase.map((t) => t.clientCode).filter(Boolean)),
    ];

    const urgentClients =
      urgentClientCodes.length > 0
        ? await Client.find(
            { firm: req.firmId, clientCode: { $in: urgentClientCodes } },
            { clientCode: 1, clientName: 1, firmName: 1 },
          ).lean()
        : [];

    const urgentClientMap = new Map(
      urgentClients.map((c) => [String(c.clientCode), c]),
    );

    const urgentItems = urgentTasksBase
      .map((t) => {
        const eff = computeEffectiveStatus(t, istStartOfToday);
        if (eff.status !== "Pending") return null;

        const due = t.dueDate ? new Date(t.dueDate) : null;
        const hasDue = due && !Number.isNaN(due.getTime());
        const dueSoon = hasDue ? due <= dueSoonCutoff : false;

        if (!(eff.overdue === true || dueSoon === true)) return null;

        return {
          _id: t._id,
          clientCode: t.clientCode,
          clientName:
            urgentClientMap.get(String(t.clientCode || ""))?.clientName || "",
          clientFirmName:
            urgentClientMap.get(String(t.clientCode || ""))?.firmName || "",
          serviceName: t.serviceName,
          servicePeriod: t.servicePeriod,
          dueDate: t.dueDate,
          priority: t.priority,
          overdue: eff.overdue,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // --------------------------------------------------
    // Workload — collapse aggregation rows
    // --------------------------------------------------
    const teamNameMap = new Map(
      (teams || []).map((t) => [t.teamMemberId, t.name || t.teamMemberId]),
    );

    const workloadMembers = workloadAggRows
      .map((row) => {
        const id = row._id || "Unassigned";
        const name =
          teamNameMap.get(id) || (id === "Unassigned" ? "Unassigned" : id);
        return {
          teamMemberId: id,
          name,
          open: row.open || 0,
          overdue: row.overdue || 0,
          dueNext7: row.dueNext7 || 0,
        };
      })
      .sort((a, b) => (b.open || 0) - (a.open || 0));

    // Batch-resolve clientCode → clientName for approval items
    const approvalClientCodes = [
      ...new Set(approvals.map((t) => t.clientCode).filter(Boolean)),
    ];
    const approvalClients =
      approvalClientCodes.length > 0
        ? await Client.find(
            { firm: req.firmId, clientCode: { $in: approvalClientCodes } },
            { clientCode: 1, clientName: 1 },
          ).lean()
        : [];
    const approvalClientMap = new Map(
      approvalClients.map((c) => [String(c.clientCode), c.clientName]),
    );

    const payload = {
      meta: {
        generatedAt: new Date().toISOString(),
        firmId: req.firmId,
        user: {
          role: req.user?.role,
          username: req.user?.username,
          teamMemberId: req.user?.teamMemberId,
          isAdmin,
        },
      },
      filtersEcho: {
        financialYear: _norm(financialYear),
        teamMemberId: _norm(teamMemberId),
        clientCode: _norm(clientCode),
      },
      stats: {
        total,
        pending,
        upcoming,
        completed,
        overdue: pendingOverdue,
        pendingApproval: isAdmin ? approvals.length : pendingAdminApprovalCount,
      },
      lookups: {
        teamMembers: (teams || []).map((t) => ({
          teamMemberId: t.teamMemberId,
          name: t.name,
          role: t.role,
        })),
      },
      workload: {
        members: workloadMembers,
      },
      urgent: { items: urgentItems },
      approvals: isAdmin
        ? {
            pendingCount: approvals.length,
            items: approvals.map((t) => ({
              ...t,
              clientName: approvalClientMap.get(String(t.clientCode || "")) || "",
            })),
          }
        : { pendingCount: 0, items: [] },
    };

    const generatedAtISO = dashCacheSet(cacheKey, payload, 30_000);
    res.setHeader("X-Generated-At", generatedAtISO);

    return res.json(payload);
  } catch (err) {
    console.error("❌ GET /api/tasks/dashboard failed:", err);
    return res.status(500).json({
      message: "Failed to load task dashboard",
      error: err.message,
    });
  }
});

// Get task statistics (with filtering support)
router.get("/stats", async (req, res) => {
  try {
    const cacheKey = buildTaskStatsCacheKey(req);
    const cached = genericCacheGet(null, cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Generated-At", cached.generatedAtISO);
      return res.json(cached.payload);
    }

    res.setHeader("X-Cache", "MISS");

    const {
      clientCode,
      financialYear,
      teamMemberId,
      serviceName,
      fromDate,
      toDate,
    } = req.query;

    const filter = {
      firm: req.firmId,
      isDeleted: false,
    };

    // Exact-match where practical for better index usage
    if (clientCode) {
      filter.clientCode = String(clientCode).trim();
    }

    if (financialYear) {
      filter.financialYear = String(financialYear).trim();
    }

    if (teamMemberId) {
      filter.teamMemberId = String(teamMemberId).trim();
    }

    if (serviceName) {
      const serviceArray = Array.isArray(serviceName)
        ? serviceName
        : String(serviceName)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      if (serviceArray.length) {
        filter.serviceName = {
          $in: serviceArray.map((s) => new RegExp(s, "i")),
        };
      }
    }

    if (fromDate || toDate) {
      const dd = {};
      if (fromDate) {
        const d = new Date(fromDate);
        if (!Number.isNaN(d.getTime())) dd.$gte = d;
      }
      if (toDate) {
        const d = new Date(toDate);
        if (!Number.isNaN(d.getTime())) dd.$lte = d;
      }
      if (Object.keys(dd).length) filter.dueDate = dd;
    }

    const istStartOfToday = getTodayISTStart();

    // ⚡ MongoDB aggregation — runs in C++, zero Node RAM per task.
    // Groups by raw DB status and counts overdue/upcoming within each bucket
    // using the same IST-boundary logic as computeEffectiveStatus().
    // Response shape is identical to the old for-loop version.
    const aggRows = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", istStartOfToday] },
                    { $lte: ["$assignedAt", istStartOfToday] },
                    {
                      $not: {
                        $in: [
                          "$status",
                          [
                            "Completed",
                            "Deleted",
                            "Pending-Admin-Approval",
                            "Pending-Client",
                          ],
                        ],
                      },
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          upcomingCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$assignedAt", istStartOfToday] },
                    {
                      $not: {
                        $in: [
                          "$status",
                          [
                            "Completed",
                            "Deleted",
                            "Pending-Admin-Approval",
                            "Pending-Client",
                          ],
                        ],
                      },
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Collapse aggregation rows into the same counters the old loop produced
    let total = 0,
      pending = 0,
      upcoming = 0,
      completed = 0;
    let pendingOverdue = 0,
      deleted = 0,
      pendingClient = 0,
      pendingAdminApproval = 0;
    const rawStatusCounts = {};

    for (const row of aggRows) {
      const status = String(row._id || "").trim();
      const count = row.count || 0;
      total += count;
      rawStatusCounts[status] = count;

      if (status === "Completed") {
        completed += count;
      } else if (status === "Deleted") {
        deleted += count;
      } else if (status === "Pending-Admin-Approval") {
        pendingAdminApproval += count;
      } else if (status === "Pending-Client") {
        pendingClient += count;
      } else {
        // Open statuses: split into overdue / upcoming / pending buckets
        const ov = row.overdueCount || 0;
        const up = row.upcomingCount || 0;
        pendingOverdue += ov;
        upcoming += up;
        pending += Math.max(0, count - ov - up);
      }
    }

    // Reconstruct the finalStatusCounts shape the frontend expects
    const finalStatusCounts = {
      ...rawStatusCounts,
      Pending: pending,
      "Pending-Overdue": pendingOverdue,
      Upcoming: upcoming,
      Completed: completed,
      Deleted: deleted,
      "Pending-Client": pendingClient,
      "Pending-Admin-Approval": pendingAdminApproval,
    };

    const payload = {
      total,
      pending,
      upcoming,
      completed,
      pendingOverdue,
      deleted,
      pendingClient,
      pendingAdminApproval,
      statusCounts: finalStatusCounts,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };

    const generatedAtISO = genericCacheSet(null, cacheKey, payload, 20_000);
    res.setHeader("X-Generated-At", generatedAtISO);

    return res.json(payload);
  } catch (err) {
    console.error("❌ Error fetching task statistics:", err);
    return res.status(500).json({
      message: "Server error while fetching statistics",
      error: err.message,
    });
  }
});
// Aggregated breakdown for Peek drawer — returns counts grouped by service,
// client, and team member without a row-count cap.
router.get("/breakdown", async (req, res) => {
  try {
    const { financialYear, teamMemberId, clientCode, status, isOverdue } =
      req.query;

    const istStartOfToday = getTodayISTStart();

    // Base filter
    const baseFilter = { firm: req.firmId, isDeleted: false };
    if (financialYear && String(financialYear).trim())
      baseFilter.financialYear = String(financialYear).trim();
    if (teamMemberId && String(teamMemberId).trim())
      baseFilter.teamMemberId = String(teamMemberId).trim();
    if (clientCode && String(clientCode).trim())
      baseFilter.clientCode = String(clientCode).trim();

    // Status filter (mirrors applyStatusToQueryParams on the client)
    const normalizedStatus = status ? String(status).trim() : "";
    const normalizedIsOverdue =
      typeof isOverdue === "string" ? isOverdue.toLowerCase() : "";

    if (normalizedStatus === "Pending" && normalizedIsOverdue === "true") {
      // Overdue: Pending tasks whose dueDate is before today
      baseFilter.status = "Pending";
      baseFilter.dueDate = { $lt: istStartOfToday };
    } else if (normalizedStatus === "Pending") {
      // Pending (not overdue)
      baseFilter.status = "Pending";
      baseFilter.dueDate = { $gte: istStartOfToday };
    } else if (normalizedStatus === "Upcoming") {
      baseFilter.status = "Upcoming";
    } else if (normalizedStatus === "Completed") {
      baseFilter.status = "Completed";
    }
    // "Total" — no status filter

    const groupBy = (field) =>
      Task.aggregate([
        { $match: baseFilter },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

    const [serviceRows, clientRows, teamRows] = await Promise.all([
      groupBy("serviceName"),
      groupBy("clientCode"),
      groupBy("teamMemberId"),
    ]);

    // Resolve clientCode → clientName in one batch lookup
    const clientCodes = clientRows
      .map((r) => r._id)
      .filter(Boolean);
    const clientDocs = clientCodes.length
      ? await Client.find(
          { firm: req.firmId, clientCode: { $in: clientCodes } },
          { clientCode: 1, clientName: 1, _id: 0 },
        ).lean()
      : [];
    const codeToName = new Map(
      clientDocs.map((c) => [c.clientCode, c.clientName]),
    );

    return res.json({
      services: serviceRows.map((r) => ({
        service: r._id || "Unspecified",
        count: r.count,
      })),
      clients: clientRows.map((r) => ({
        clientCode: r._id || "Unknown",
        clientName: codeToName.get(r._id) || r._id || "Unknown",
        count: r.count,
      })),
      team: teamRows.map((r) => ({
        id: r._id || "Unassigned",
        count: r.count,
      })),
    });
  } catch (err) {
    console.error("❌ /tasks/breakdown error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

// Get distinct financial years
router.get("/financial-years", auth, async (req, res) => {
  try {
    const financialYears = await Task.distinct("financialYear", {
      firm: req.firmId,
      isDeleted: false,
    });
    res.json(financialYears);
  } catch (err) {
    console.error("❌ Error fetching financial years:", err);
    res.status(500).json({
      message: "Server error while fetching financial years",
      error: err.message,
    });
  }
});

// Get team members (with a consistent response shape)
router.get("/teams", auth, async (req, res) => {
  try {
    const teams = await Team.find({ firm: req.firmId }).lean();
    // --- FIX IS HERE: Always return a consistent object shape ---
    // This prevents ambiguity on the frontend.
    res.json({
      message: "Teams fetched successfully",
      data: teams,
    });
  } catch (err) {
    console.error("❌ Error fetching teams:", err);
    res.status(500).json({ message: "Server error", data: [] }); // Also send data key on error
  }
});

// Get action stages (firm-scoped, active-only, stable sort)
router.get("/action-stages", async (req, res) => {
  try {
    // Backward compatibility:
    // - If older docs don't have isActive/isDeleted/sortOrder/code, we still return them safely.
    const stages = await ActionStage.find({
      firm: req.firmId,
      isDeleted: false,
      $or: [{ isActive: { $exists: false } }, { isActive: true }],
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Normalize shape for the UI (always provide name/color)
    const normalized = (stages || []).map((s) => ({
      _id: s._id,
      code: s.code || undefined,
      name: s.name,
      color: s.color || "#757575",
      sortOrder: Number.isFinite(Number(s.sortOrder))
        ? Number(s.sortOrder)
        : 100,
      isActive: s.isActive !== false,
    }));

    return res.json(normalized);
  } catch (err) {
    console.error("❌ Error fetching action stages:", err);
    return res.status(500).json({
      message: "Server error while fetching action stages",
      error: err.message,
    });
  }
});
// Create an action stage
router.post("/action-stages", requireRole("ADMIN"), async (req, res) => {
  const { name, color } = req.body;
  try {
    const existing = await ActionStage.findOne({ firm: req.firmId, name });
    if (existing) {
      return res.status(400).json({ message: "Action stage already exists" });
    }
    const stage = new ActionStage({ firm: req.firmId, name, color });
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
router.put("/action-stages/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, color } = req.body;
  try {
    const stage = await ActionStage.findOne({
      _id: req.params.id,
      firm: req.firmId,
    });
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
router.delete("/action-stages/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await ActionStage.deleteOne({
      _id: req.params.id,
      firm: req.firmId,
    });
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

      // ✅ ENTERPRISE FIX: Cross-firm validation for manual task creation
      // Verify that clientCode, serviceCode, and teamMemberId all belong to the firm
      const [client, service, teamMember] = await Promise.all([
        Client.findOne({ firm: req.firmId, clientCode }),
        Service.findOne({ firm: req.firmId, serviceCode }),
        Team.findOne({ firm: req.firmId, teamMemberId }),
      ]);

      if (!client) {
        return res
          .status(400)
          .json({ message: "Client not found in your firm" });
      }
      if (!service) {
        return res
          .status(400)
          .json({ message: "Service not found in your firm" });
      }
      if (!teamMember) {
        return res
          .status(400)
          .json({ message: "Team member not found in your firm" });
      }

      const existing = await Task.findOne({
        firm: req.firmId,
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
        firm: req.firmId,
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
      clearTaskCachesForFirm(req.firmId);

      // Log task creation in history
      const historyEntry = new TaskHistory({
        firm: req.firmId,
        taskId: task._id,
        type: "creation",
        value: "Created",
        remark: `Task created by ${req.user.username || "Unknown"}`,
        userId: req.user.userId || req.user.id,
        timestamp: new Date(),
      });
      await historyEntry.save();

      console.log("Task created successfully:", task);
      emitTaskChangedRealtime(req, task, "created");
      res.status(201).json({ message: "Task created successfully", task });
    } catch (err) {
      console.error("❌ Error creating task:", err);
      res.status(400).json({
        message: err.message || "Failed to create task",
        error: err.message,
      });
    }
  },
);

// Enhanced update task with admin approval logic and delete protection
router.put("/:id", async (req, res) => {
  console.log(`🚀 PUT /api/tasks/${req.params.id} - Starting task update`);

  try {
    // --- FIX #1: Add 'priority' to the list of fields to extract from the request body ---
    const {
      status,
      teamMemberId,
      completedAt,
      pendingAction,
      remark,
      priority,
      dueDate,        // ← add
      dueDateSource,  // ← add
      description,    // ← add
    } = req.body;

    console.log(`📝 Request data:`, {
      taskId: req.params.id,
      status,
      teamMemberId,
      completedAt,
      pendingAction,
      remark,
      priority,
      isAdmin: req.isAdmin,
      userId: req.user?.userId || req.user?.id,
    });

    const isAdmin = req.isAdmin;

    // Find the task
    const task = await Task.findOne({ _id: req.params.id, firm: req.firmId });
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

    const previousTeamMemberId = task.teamMemberId; // remember old assignee
    // CRITICAL: Prevent any modifications to deleted tasks, except admin reopen
    const isAdminReopen = req.body.reopen === true && isAdmin;
    if (task.status === "Deleted" && !isAdminReopen) {
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
        const actionStages = await ActionStage.find({ firm: req.firmId });
        const actionStageNames = actionStages.map((stage) => stage.name);
        validStatuses.push(...actionStageNames);
        console.log(`✅ Valid statuses loaded: ${validStatuses.length} total`);
      } catch (actionStageError) {
        console.warn(
          `⚠️ Could not load action stages:`,
          actionStageError.message,
        );
      }
      if (!validStatuses.includes(status)) {
        console.log(`❌ Invalid status provided: ${status}`);
        return res.status(400).json({
          message: `Invalid status. Valid statuses are: ${validStatuses.join(
            ", ",
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
        !isAdmin,
    });
    // Update task fields with enhanced admin approval logic
    const previousStatus = task.status;
    if (status) {
      if (
        (isBackdated || isStatusChangeFromCompleted || isDeletionRequest) &&
        !isAdmin
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
        if (isAdminReopen) {
          task.completedAt = null;
          task.previousStatus = undefined;
          task.pendingAction = undefined;
          task.pendingStatus = undefined;
        }
        console.log(`✅ Direct status update: ${task._id} → ${status}`);
      }
    }
    // Update other fields
    if (teamMemberId) {
      console.log(
        `👤 Updating team member: ${task.teamMemberId} → ${teamMemberId}`,
      );
      task.teamMemberId = teamMemberId;
    }
    if (priority) {
      console.log(`⭐ Updating priority: ${task.priority} → ${priority}`);
      task.priority = priority;
    }

    if (dueDate) {
      // Allow admin OR the currently assigned team member to change the due date
      let canChangeDueDate = isAdmin;
      if (!canChangeDueDate) {
        const userId = req.user?.userId || req.user?.id;
        const member = await FirmMember.findOne({ firmId: req.firmId, userId }).lean();
        canChangeDueDate = member && member.teamMemberId === task.teamMemberId;
      }
      if (!canChangeDueDate) {
        return res.status(403).json({ message: "Only admins or the assigned team member can change the due date." });
      }
      const newDue = new Date(dueDate);
      if (!isNaN(newDue.getTime())) {
        task.dueDate = newDue;
        task.dueDateSource = dueDateSource || "OVERRIDE";
      }
    }

    if (description !== undefined) {
      task.description = description === "" ? undefined : String(description).trim();
    }

    if (completedAt) {
      console.log(`📅 Setting completion date: ${completedAt}`);
      task.completedAt = new Date(completedAt);
    }
    // Unified overdue recalculation — runs after all field updates
    task.overdue = !!(task.dueDate && task.dueDate < new Date() && task.status === "Pending");
    // Save the task
    console.log(`💾 Saving task ${task._id} with status: ${task.status}`);
    await task.save();
    clearTaskCachesForFirm(req.firmId);
    console.log(`✅ Task saved successfully: ${task._id}`);

    // --- REAL-TIME UPDATE ---
    // After the task is saved, broadcast a real-time update to all clients.
    emitTaskChangedRealtime(req, task, "updated");
    // --- END OF REAL-TIME UPDATE ---

    // Log action in history for all meaningful changes
    const hasStatusChange = status && status !== previousStatus;
    const hasTeamMemberChange =
      teamMemberId && teamMemberId !== previousTeamMemberId; // ✅ correct comparison
    const hasCompletionDateChange = completedAt;
    const hasDueDateChange = !!dueDate;

    if (hasStatusChange || hasTeamMemberChange || hasCompletionDateChange || hasDueDateChange) {
      console.log(`📝 Creating history entry for task update`);
      try {
        // Build a friendly remark; add "Reassigned from A to B" if needed
        let finalRemark = remark && remark.trim() ? remark.trim() : "";

        if (hasTeamMemberChange) {
          try {
            // Look up names for readability (falls back to IDs if not found)
            const members = await Team.find({
              firm: req.firmId,
              teamMemberId: { $in: [previousTeamMemberId, teamMemberId] },
            }).lean();

            const nameById = Object.fromEntries(
              (members || []).map((m) => [m.teamMemberId, m.name]),
            );

            const fromName =
              nameById[previousTeamMemberId] || String(previousTeamMemberId);
            const toName = nameById[teamMemberId] || String(teamMemberId);

            finalRemark =
              `Reassigned from ${fromName} to ${toName}` +
              (finalRemark ? ` | ${finalRemark}` : "");
          } catch (e) {
            console.warn("Team lookup failed for history remark", e);
            // Fall back to the IDs if lookup fails
            finalRemark =
              `Reassigned from ${previousTeamMemberId} to ${teamMemberId}` +
              (finalRemark ? ` | ${finalRemark}` : "");
          }
        }
        const histType = hasDueDateChange ? "status_change" : (hasTeamMemberChange ? "reassignment" : "status_change");
        const histValue = hasDueDateChange
          ? `Due date extended to ${new Date(dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
          : (hasTeamMemberChange ? teamMemberId : (status || task.status));

        const historyEntry = new TaskHistory({
          firm: req.firmId,
          taskId: task._id,
          type: histType,
          value: histValue,
          remark: finalRemark,
          userId: req.user.userId || req.user.id,
          completedAt: completedAt ? new Date(completedAt) : undefined,
          pendingApproval:
            (isBackdated || isDeletionRequest || isStatusChangeFromCompleted) &&
            !isAdmin,
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
      !isAdmin
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
// server/routes/tasks.js

// Approve or reject task (for completion or deletion)
// server/routes/tasks.js

// REVISED AND ENHANCED: Approve or reject any pending action
// Approve or reject task (for completion or deletion)
router.post("/approve/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const { approve } = req.body;
    const task = await Task.findOne({ _id: req.params.id, firm: req.firmId });

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
          `✅ Setting task ${task._id} status to: ${task.status} (status change)`,
        );
      } else {
        // Fallback: assume completion
        task.status = "Completed";
        console.log(
          `⚠️ Unknown pendingAction "${pendingAction}" – defaulting to Completed`,
        );
      }

      // Clear approval-related fields
      task.pendingAction = undefined;
      task.pendingStatus = undefined;
      task.previousStatus = undefined;

      await task.save();
      clearTaskCachesForFirm(req.firmId);

      // Log approval in history
      const historyEntry = new TaskHistory({
        firm: req.firmId,
        taskId: task._id,
        type: "approval",
        value: `Approved: ${pendingAction || "unknown"}`,
        remark: `Approved by admin: ${req.user.username || "Unknown"}`,
        userId: req.user.userId || req.user.id,
        completedAt: new Date(),
        pendingApproval: false,
        timestamp: new Date(),
      });
      await historyEntry.save();

      console.log(`✅ Task ${task._id} approved successfully`);
      emitTaskChangedRealtime(req, task, "approval-processed");
      res.json({
        message: `Task ${pendingAction || "action"} approved successfully`,
        task,
      });
    } else {
      // Rejection: revert to previous status and clear approval state
      const previousStatus = task.previousStatus || "Pending";
      task.status = previousStatus;
      task.pendingAction = undefined;
      task.pendingStatus = undefined;
      task.previousStatus = undefined;

      await task.save();
      clearTaskCachesForFirm(req.firmId);

      // Log rejection in history
      const historyEntry = new TaskHistory({
        firm: req.firmId,
        taskId: task._id,
        type: "rejection",
        value: `Rejected: ${pendingAction || "unknown"}`,
        remark: `Rejected by admin: ${req.user.username || "Unknown"}`,
        userId: req.user.userId || req.user.id,
        pendingApproval: false,
        timestamp: new Date(),
      });
      await historyEntry.save();

      console.log(
        `❌ Task ${task._id} rejected, reverted to: ${previousStatus}`,
      );
      emitTaskChangedRealtime(req, task, "approval-reverted");
      res.json({
        message: `Task ${pendingAction || "action"} rejected`,
        task,
      });
    }
  } catch (err) {
    console.error("❌ Error processing approval/rejection:", err);
    res.status(500).json({
      message: "Server error while processing approval/rejection",
      error: err.message,
    });
  }
});

// Delete task (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, firm: req.firmId });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Prevent hard delete of already deleted tasks
    if (task.status === "Deleted") {
      return res.status(400).json({
        message:
          "Task is already marked as Deleted. Use PUT to update if needed.",
      });
    }

    const previousStatus = task.status;
    task.status = "Deleted";
    task.deletedAt = new Date();
    task.deletedBy = req.user.userId || req.user.id;

    await task.save();
    clearTaskCachesForFirm(req.firmId);

    // Log deletion in history
    const historyEntry = new TaskHistory({
      firm: req.firmId,
      taskId: task._id,
      type: "deletion",
      value: "Deleted",
      remark: `Task deleted by ${req.user.username || "Unknown"}`,
      userId: req.user.userId || req.user.id,
      timestamp: new Date(),
    });
    await historyEntry.save();

    console.log(`✅ Task ${req.params.id} soft-deleted successfully`);
    emitTaskChangedRealtime(req, task, "deleted");
    res.json({ message: "Task deleted successfully", task });
  } catch (err) {
    console.error("❌ Error deleting task:", err);
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
      firm: req.firmId,
      taskId,
      type,
      value,
      remark: remark || `Action by ${req.user.username || "Unknown"}`,
      userId: req.user.userId || req.user.id,
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
    const history = await TaskHistory.find({
      firm: req.firmId,
      taskId: req.params.taskId,
    })
      .populate("taskId", "clientCode serviceName teamMemberId")
      .populate("userId", "username email")
      .sort({ timestamp: -1 })
      .lean();

    // Resolve display names: userId → FirmMember.teamMemberId → Team.name
    const userIds = [...new Set(
      history.map((e) => e.userId?._id?.toString()).filter(Boolean)
    )];
    if (userIds.length > 0) {
      const members = await FirmMember.find({
        firmId: req.firmId,
        userId: { $in: userIds },
      }).select("userId teamMemberId").lean();

      const teamMemberIdByUserId = {};
      for (const m of members) {
        teamMemberIdByUserId[m.userId.toString()] = m.teamMemberId;
      }

      const teamMemberIds = [...new Set(Object.values(teamMemberIdByUserId).filter(Boolean))];
      const teams = teamMemberIds.length > 0
        ? await Team.find({ firm: req.firmId, teamMemberId: { $in: teamMemberIds } })
            .select("teamMemberId name").lean()
        : [];

      const nameByTeamMemberId = {};
      for (const t of teams) {
        nameByTeamMemberId[t.teamMemberId] = t.name;
      }

      for (const entry of history) {
        const uid = entry.userId?._id?.toString();
        if (uid) {
          const tmId = teamMemberIdByUserId[uid];
          const resolvedName = tmId ? nameByTeamMemberId[tmId] : null;
          if (resolvedName) entry.userId.name = resolvedName;
        }
      }
    }

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
      firm: req.firmId,
      _id: { $in: taskIds },
      status: "Deleted",
    });
    if (deletedTasks.length > 0) {
      return res.status(400).json({
        message: "Cannot perform bulk action on deleted tasks",
      });
    }

    // ✅ ENTERPRISE FIX: Standardize admin check using role-based approach
    const isAdmin = req.user?.role === "ADMIN";

    const updateObj = {};
    if (action === "Completed") {
      updateObj.status = isAdmin ? "Completed" : "Pending-Admin-Approval";
      if (completedAt) updateObj.completedAt = new Date(completedAt);
    } else if (action === "Re-Assign Task") {
      updateObj.status = "Pending";
    } else {
      updateObj.status = action;
    }

    const result = await Task.updateMany(
      { firm: req.firmId, _id: { $in: taskIds } },
      updateObj,
    );
    clearTaskCachesForFirm(req.firmId);

    // ⚡ Build all history docs in memory, then write in ONE round-trip.
    // Old code: await historyEntry.save() inside a for-loop = N sequential DB calls.
    // New code: TaskHistory.insertMany() = 1 DB call regardless of batch size.
    const now = new Date();
    const historyDocs = taskIds.map((taskId) => ({
      firm: req.firmId,
      taskId,
      type: "bulk_action",
      value: action,
      remark: `Bulk action: ${action} by ${req.user.username || "Unknown"}`,
      userId: req.user.userId || req.user.id,
      timestamp: now,
    }));
    try {
      await TaskHistory.insertMany(historyDocs, { ordered: false });
    } catch (histErr) {
      // insertMany with ordered:false logs partial failures but never blocks
      // the main response — history is non-critical audit trail.
      console.warn(
        "bulk-update: TaskHistory.insertMany partial failure:",
        histErr?.message,
      );
    }

    emitFirmEvent(req.firmId, "task.changed", {
      count: result.modifiedCount,
    });
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
// --- REFACTORED /generate-new ROUTE ---
router.post("/generate-new", auth, async (req, res) => {
  try {
    const { clientCode, serviceCode, teamMemberId, startDate, financialYear, manualDueDate, description } =
      req.body;

    // Normalize codes (defensive against lowercase / spaces)
    const normClientCode = String(clientCode || "")
      .trim()
      .toUpperCase();
    const normServiceCode = String(serviceCode || "")
      .trim()
      .toUpperCase();

    const isAdmin = String(req.user?.role || "").toUpperCase() === "ADMIN";

    // Instantiate the generator with the request data
    const generator = new TaskGenerator({
      firmId: req.firmId,
      clientCode: normClientCode,
      serviceCode: normServiceCode,
      teamMemberId,
      startDate,
      financialYear,
      manualDueDate: manualDueDate || null,
      description: description || null,
    });

    // Execute the generation logic by calling the service
    const out = await generator.generate();

    const errors = Array.isArray(out?.errors) ? out.errors : [];
    const tasksCreated = Number(out?.insertedCount || 0);
    if (tasksCreated > 0) clearTaskCachesForFirm(req.firmId);

    // For UI convenience: return the latest created tasks (capped)
    let tasks = [];
    if (tasksCreated > 0) {
      const limit = Math.min(tasksCreated, 50);
      tasks = await Task.find({
        firm: req.firmId,
        clientCode: normClientCode,
        serviceCode: normServiceCode,
        ...(financialYear ? { financialYear } : {}),
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    // Handle the response based on the service's output
    if (tasks.length === 0 && errors.length > 0) {
      return res.status(400).json({
        message: "No tasks were created. See errors for details.",
        errors,
      });
    }

    // Log a single history entry for this generation event
    if (tasks.length > 0) {
      const service = await Service.findOne({
        firm: req.firmId,
        serviceCode: normServiceCode,
      }).lean();
      const taskHistory = new TaskHistory({
        firm: req.firmId,
        taskId: tasks[0]?._id || null, // Link history to a created task if available
        type: "creation_batch",
        value: `Generated ${tasks.length} task(s) for ${clientCode} - ${
          service?.serviceName || serviceCode
        }`,
        userId: req.user.userId || req.user.id,
        pendingApproval: req.user.role !== "ADMIN",
      });
      await taskHistory.save();
    }

    const message = isAdmin
      ? `Assigned ${tasks.length} tasks successfully`
      : `Task creation request submitted for approval (${tasks.length} tasks)`;

    // ✅ Realtime: notify all firm users that tasks were generated/changed
    try {
      emitFirmEvent(req.firmId, "task.changed", {
        count: tasks.length,
        clientCode: normClientCode,
        serviceCode: normServiceCode,
        financialYear: financialYear || undefined,
      });
      emitFirmEvent(req.firmId, "task.generation.completed", {
        clientCode: normClientCode,
        serviceCode: normServiceCode,
        financialYear: financialYear || undefined,
        tasksCreated: tasks.length,
        pendingApproval: !isAdmin,
        errorsCount: errors.length,
        requestedBy:
          req.user?.username || req.user?.name || req.user?.email || undefined,
        requestedById:
          req.user?.userId || req.user?.id || req.user?._id || undefined,
        at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Realtime emit failed (/generate-new):", e?.message || e);
    }

    res.status(201).json({
      message,
      tasksCreated: tasks.length,
      tasks,
      errors,
    });
  } catch (err) {
    console.error("❌ Critical error in /generate-new route:", err);
    res.status(500).json({
      message: err.message || "A server error occurred during task generation.",
    });
  }
});

// Generate existing tasks from client-service mappings
// --- REFACTORED /generate-existing ROUTE ---
// --- NEW, CORRECTED /generate-existing ROUTE ---
router.post("/generate-existing", requireRole("ADMIN"), async (req, res) => {
  console.log(
    "[Tasks] Received request to generate tasks from all existing client services.",
  );
  try {
    // Extract force flag from query params or request body
    const force =
      String(req.query.force || req.body?.force || "").toLowerCase() === "true";

    if (force) {
      console.log("⚠️  Force flag enabled - bypassing existing run guards");
    }

    // Delegate to the static method on the service with proper context
    const out = await TaskGenerator.generateFromAllClientServicesForFirm({
      firmId: req.firmId,
      requestedByUserId: req.user?._id,
      requestedByUsername: req.user?.username,
      force, // ✅ allow rerun when requested
      guard: true, // ✅ keep safety by default
    });

    // 👇 Map service output → UI summary format
    const summary = {};
    for (const s of out.perService || []) {
      summary[s.serviceCode] = {
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        taskCount: Number(s.inserted || 0),
        clientCount: Number(s.clients || 0),
        // Skipped per service (already existed + explicitly skipped)
        skippedCount: Number(
          s.skipped || s.alreadyExists || s.skippedCount || 0,
        ),
        skippedReasons: Array.isArray(s.skippedDetails) ? s.skippedDetails : [],
      };
    }

    // Calculate totals
    const totalTasks = Object.values(summary).reduce(
      (acc, s) => acc + s.taskCount,
      0,
    );
    const totalClients = Object.values(summary).reduce(
      (acc, s) => acc + s.clientCount,
      0,
    );
    const totalSkippedFromService = Object.values(summary).reduce(
      (acc, s) => acc + s.skippedCount,
      0,
    );

    // Fetch total ClientService count for this firm to compute the gap
    const totalClientServices = await ClientService.countDocuments({
      firm: req.firmId,
    });

    // Build a flat skipped array from perService details (if generator provides them)
    const skippedFlat = [];
    for (const s of out.perService || []) {
      if (Array.isArray(s.skippedDetails)) {
        for (const d of s.skippedDetails) {
          skippedFlat.push({
            clientCode: d.clientCode || "",
            serviceCode: s.serviceCode,
            serviceName: s.serviceName,
            financialYear: d.financialYear || "",
            reason: d.reason || d.message || "Skipped",
          });
        }
      }
    }
    // Also include top-level out.skipped if generator provides it
    if (Array.isArray(out.skipped)) {
      for (const d of out.skipped) {
        skippedFlat.push({
          clientCode: d.clientCode || "",
          serviceCode: d.serviceCode || "",
          serviceName: d.serviceName || "",
          financialYear: d.financialYear || "",
          reason: d.reason || d.message || "Skipped",
        });
      }
    }

    // Unaccounted = totalClientServices - (generated + all skipped + errors)
    const accountedFor =
      totalTasks + totalSkippedFromService + (out.errors || []).length;
    const unaccounted = Math.max(0, totalClientServices - accountedFor);

    // Build summary message
    const parts = [
      `${totalTasks} task${totalTasks !== 1 ? "s" : ""} generated`,
      `${totalClientServices} client–service records`,
      (out.errors || []).length > 0
        ? `${(out.errors || []).length} error${(out.errors || []).length !== 1 ? "s" : ""}`
        : null,
      totalSkippedFromService > 0 ? `${totalSkippedFromService} skipped` : null,
      unaccounted > 0 ? `${unaccounted} not processed` : null,
    ].filter(Boolean);
    const summaryMessage =
      (force ? "Force regenerated: " : "") + parts.join(" · ");

    if (totalTasks > 0) clearTaskCachesForFirm(req.firmId);

    // ✅ Realtime: notify all firm users that batch generation completed
    try {
      emitFirmEvent(req.firmId, "task.changed", {
        count: totalTasks,
        mode: "generate-existing",
      });
      emitFirmEvent(req.firmId, "task.generation.completed", {
        mode: "generate-existing",
        tasksCreated: totalTasks,
        clientsAffected: totalClients,
        forced: force,
        errorsCount: (out.errors || []).length,
        requestedBy:
          req.user?.username || req.user?.name || req.user?.email || undefined,
        requestedById:
          req.user?.userId || req.user?.id || req.user?._id || undefined,
        at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(
        "Realtime emit failed (/generate-existing):",
        e?.message || e,
      );
    }

    res.status(201).json({
      message: summaryMessage,
      results: out.perService || [],
      errors: out.errors || [],
      skipped: skippedFlat,
      skippedCount: totalSkippedFromService,
      alreadyExists: Number(out.alreadyExists || out.alreadyExistsCount || 0),
      totalProcessed: totalClientServices,
      unaccounted,
      summary,
      forced: force,
    });
  } catch (err) {
    console.error("❌ Critical error in /generate-existing route:", err);

    // Check if it's a 409 Conflict error about existing run
    const isConflict = err.message?.includes("already completed for FY");

    res.status(isConflict ? 409 : 500).json({
      message:
        err.message ||
        "A critical server error occurred during batch task generation.",
      code: isConflict ? "GENERATION_EXISTS" : "SERVER_ERROR",
      hint: isConflict
        ? "Use force=true query parameter to regenerate"
        : undefined,
    });
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
// ✅ Non-breaking: adds `derivedStatus` and `isActive` only
router.get("/clientservices", auth, async (req, res) => {
  try {
    const { clientCode } = req.query;
    const filter = {
      firm: req.firmId,
      ...(clientCode ? { clientCode } : {}),
      isDeleted: { $ne: true },
    };

    const clientServices = await ClientService.find(filter)
      .populate({ path: "service", match: { firm: req.firmId } })
      .lean();

    // compute status from endDate without changing original fields
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const withDerived = clientServices.map((cs) => {
      const end = cs.endDate ? new Date(cs.endDate) : null;
      if (end) end.setHours(0, 0, 0, 0);
      const inactive = !!end && end <= today;

      const computed = inactive ? "inactive" : "active";

      return {
        ...cs,
        // keep original fields as-is
        // add derived fields (UI can use these)
        derivedStatus: computed, // <-- new, safe to use in UI
        isActive: !inactive, // <-- new boolean helper
        // if you WANT a convenient fallback without overriding:
        status: cs.status ?? computed, // <-- only sets if `status` was undefined
      };
    });

    res.json(withDerived);
  } catch (err) {
    console.error("❌ Error fetching client services:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// >>> PATCH START: GET client-services returns computed status
// Returns client services with a computed status based on endDate
router.get("/clientservices/:clientCode", auth, async (req, res) => {
  try {
    const { clientCode } = req.params;
    const list = await ClientService.find({
      firm: req.firmId,
      clientCode,
      isDeleted: false,
    }).lean();

    const today = startOfDay(new Date());
    const withStatus = list.map((cs) => {
      const end = cs.endDate ? startOfDay(cs.endDate) : null;
      const inactive = !!end && end <= today;
      return {
        ...cs,
        status: inactive ? "inactive" : "active", // <-- UI reads this
        isActive: !inactive, // optional boolean for convenience
      };
    });

    res.json(withStatus);
  } catch (err) {
    console.error("[GET /clientservices/:clientCode] Error:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to get client services." });
  }
});

// Add client service
router.post("/clientservices", auth, async (req, res) => {
  const { clientCode, serviceCode, teamMemberId, startDate, financialYear } =
    req.body;

  try {
    const existing = await ClientService.findOne({
      firm: req.firmId,
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
      firm: req.firmId,
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

// Get all services (now supports optional ?search= & ?frequency=)
router.get("/services", auth, async (req, res) => {
  try {
    const { search, frequency } = req.query;
    const filter = { firm: req.firmId, isDeleted: { $ne: true } };
    if (search && String(search).trim()) {
      const rx = new RegExp(
        String(search)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      filter.$or = [
        { serviceName: rx },
        { serviceCode: rx },
        { serviceGroup: rx },
      ];
    }
    if (frequency) {
      const f = String(frequency).trim();
      filter.frequency = f.toLowerCase() === "on demand" ? "On Demand" : f;
    }

    const services = await Service.find(filter).lean();
    res.json(services);
  } catch (err) {
    console.error("[Services][GET] Error fetching services:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------------ helpers local to this block ----------------------- */

const _toIntOr = (v, def) => {
  if (v === 0 || v === "0") return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};
const _parseDays = (raw, fallback = 7) => {
  if (raw === 0 || raw === "0") return 0;
  if (raw == null || raw === "") return fallback;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const m = String(raw).match(/-?\d+/);
  return m ? parseInt(m[0], 10) : fallback;
};
const _normalizeFrequency = (frequency) => {
  const f = _norm(frequency);
  const isOnDemand = f.toLowerCase() === "on demand";
  return { isOnDemand, frequency: isOnDemand ? "On Demand" : f };
};
const _normalizeAssignmentDaysOfMonth = (value) => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((n) => parseInt(n, 10))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31),
    ),
  ].sort((a, b) => a - b);
};
const _buildDueRule = (inDue) => ({
  anchor: inDue?.anchor === "periodStart" ? "periodStart" : "periodEnd",
  offsetMonths: _toIntOr(inDue?.offsetMonths, 1),
  dayOfMonth: _toIntOr(inDue?.dayOfMonth, 20),
});
const _buildAssignmentRule = (inAssign) => ({
  anchor: ["periodStart", "periodEnd", "dueDate"].includes(inAssign?.anchor)
    ? inAssign.anchor
    : "dueDate",
  offsetDays: _toIntOr(inAssign?.offsetDays, -10),
});

// Accepts array OR string like "1,8,15,22" (or "1|8|15|22" / "1 8 15")
const _parseAssignmentDaysOfMonth = (value) => {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .map((n) => parseInt(n, 10))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31),
      ),
    ].sort((a, b) => a - b);
  }
  if (typeof value === "string") {
    const nums = value
      .split(/[^0-9]+/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);
    return [...new Set(nums)].sort((a, b) => a - b);
  }
  return [];
};

const _parseWeeklyDue = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

// Store as Date objects; drop invalid entries or empty keys
const _normalizeDueOverrides = (raw) => {
  if (!raw || typeof raw !== "object") return undefined;
  const out = {};
  for (const [fyKey, val] of Object.entries(raw)) {
    const key = String(fyKey || "").trim();
    if (!key) continue;
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) out[key] = d; // keep as Date
  }
  return Object.keys(out).length ? out : undefined;
};

/* --------------------------------- CREATE --------------------------------- */
// Create a service
router.post("/services", requireRole("ADMIN"), async (req, res) => {
  const {
    serviceCode,
    serviceName,
    sacCode,
    serviceGroup,
    frequency,
    priority,
    remarks,

    // NEW fields your UI may send
    dueRule: inDue,
    assignmentRule: inAssign,
    onDemand: inOD,
    assignmentDaysOfMonth: inDOM,
  } = req.body || {};

  console.log("[Services][POST] incoming body:", JSON.stringify(req.body));

  try {
    if (!serviceCode || !serviceName || !frequency) {
      return res.status(400).json({
        message: "Service code, service name, and frequency are required",
      });
    }

    const existing = await Service.findOne({
      firm: req.firmId,
      serviceCode: _norm(serviceCode),
    });
    if (existing) {
      return res.status(400).json({ message: "Service code already exists" });
    }

    const { isOnDemand, frequency: freq } = _normalizeFrequency(frequency);
    console.log("[Services][POST] normalized frequency:", { freq, isOnDemand });

    const dom = _normalizeAssignmentDaysOfMonth(inDOM);
    let dueRule, assignmentRule, onDemand;

    if (isOnDemand) {
      onDemand = { dueAfterDays: _parseDays(inOD?.dueAfterDays, 7) };
      dueRule = undefined;
      assignmentRule = undefined;
    } else {
      dueRule = _buildDueRule(inDue || {});
      assignmentRule = _buildAssignmentRule(inAssign || {});
      onDemand = undefined;
    }

    console.log("[Services][POST] computed rules:", {
      dueRule,
      assignmentRule,
      onDemand,
      assignmentDaysOfMonth: dom,
    });

    // inside POST /services (after freq normalization)
    const weeklyDueAfterDays = Number.isFinite(
      parseInt(req.body.weeklyDueAfterDays, 10),
    )
      ? parseInt(req.body.weeklyDueAfterDays, 10)
      : undefined;

    const service = new Service({
      firm: req.firmId,
      serviceCode: _norm(serviceCode),
      serviceName: _norm(serviceName),
      sacCode: _norm(sacCode),
      serviceGroup: _norm(serviceGroup),
      frequency: freq,
      priority: _norm(priority) || "Medium",
      remarks: _norm(remarks),
      dueRule,
      assignmentRule,
      onDemand,
      weeklyDueAfterDays, // <-- add this
      ...(dom.length ? { assignmentDaysOfMonth: dom } : {}),
    });

    await service.save();
    console.log("[Services][POST] saved service:", service._id);
    res.status(201).json({ message: "Service created successfully", service });
  } catch (err) {
    console.error("[Services][POST] Error creating service:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to create service" });
  }
});

/* --------------------------------- UPDATE --------------------------------- */
// Update a service
router.put("/services/:id", requireRole("ADMIN"), async (req, res) => {
  const {
    serviceCode, // will be ignored for change
    serviceName,
    sacCode,
    serviceGroup,
    frequency,
    priority,
    remarks,

    // NEW
    dueRule: inDue,
    assignmentRule: inAssign,
    onDemand: inOD,
    assignmentDaysOfMonth: inDOM,
  } = req.body || {};

  console.log("[Services][PUT] incoming body:", JSON.stringify(req.body));

  try {
    const service = await Service.findOne({
      _id: req.params.id,
      firm: req.firmId,
    });
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    // now it's safe to access service:
    if (
      Object.prototype.hasOwnProperty.call(req.body, "assignmentDaysOfMonth")
    ) {
      const dom = _parseAssignmentDaysOfMonth(req.body.assignmentDaysOfMonth);
      service.assignmentDaysOfMonth = dom.length ? dom : undefined; // clear if invalid/empty
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "weeklyDueAfterDays")) {
      const w = _parseWeeklyDue(req.body.weeklyDueAfterDays);
      service.weeklyDueAfterDays = w;
    }

    const { isOnDemand, frequency: freq } = frequency
      ? _normalizeFrequency(frequency)
      : _normalizeFrequency(service.frequency);

    // Never allow code change via update
    if (serviceCode && _norm(serviceCode) !== service.serviceCode) {
      return res
        .status(400)
        .json({ message: "Changing serviceCode is not allowed" });
    }

    // Basic props
    if (serviceName != null) service.serviceName = _norm(serviceName);
    if (sacCode != null) service.sacCode = _norm(sacCode);
    if (serviceGroup != null) service.serviceGroup = _norm(serviceGroup);
    if (remarks != null) service.remarks = _norm(remarks);
    if (priority != null) service.priority = _norm(priority);
    if (frequency != null) service.frequency = freq;

    if (isOnDemand) {
      // keep OD, strip calc rules
      service.onDemand = { dueAfterDays: _parseDays(inOD?.dueAfterDays, 7) };
      service.dueRule = undefined;
      service.assignmentRule = undefined;
      if ("assignmentDaysOfMonth" in req.body) {
        service.assignmentDaysOfMonth = undefined;
      }
    } else {
      // ensure both rules exist (either from body or defaults)
      const nextDue =
        "dueRule" in req.body
          ? _buildDueRule(inDue || {})
          : service.dueRule || _buildDueRule({});
      const nextAssign =
        "assignmentRule" in req.body
          ? _buildAssignmentRule(inAssign || {})
          : service.assignmentRule || _buildAssignmentRule({});

      service.onDemand = undefined;
      service.dueRule = nextDue;
      service.assignmentRule = nextAssign;

      if ("assignmentDaysOfMonth" in req.body) {
        const dom = _parseAssignmentDaysOfMonth(req.body.assignmentDaysOfMonth);
        // const wdue = _parseWeeklyDue(req.body.weeklyDueAfterDays);
        service.assignmentDaysOfMonth = dom.length ? dom : undefined;
      }
    }
    // NEW: apply dueOverrides if caller sent it
    if (Object.prototype.hasOwnProperty.call(req.body, "dueOverrides")) {
      const ov = _normalizeDueOverrides(req.body.dueOverrides);
      service.dueOverrides = ov; // set (or clear if undefined)
    }

    console.log("[Services][PUT] about to save service:", {
      id: service._id,
      frequency: service.frequency,
      dueRule: service.dueRule,
      assignmentRule: service.assignmentRule,
      onDemand: service.onDemand,
      assignmentDaysOfMonth: service.assignmentDaysOfMonth,
      dueOverrides: service.dueOverrides,
    });

    await service.save();
    res.json({ message: "Service updated successfully", service });
  } catch (err) {
    console.error("[Services][PUT] Error updating service:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to update service" });
  }
});

/* --------------------------------- DELETE -------------------------------- */
// Delete a service
router.delete("/services/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await Service.deleteOne({
      _id: req.params.id,
      firm: req.firmId,
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error("[Services][DELETE] Error deleting service:", err);
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
      firm: req.firmId,
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
      allowedUpdates.includes(key),
    );

    if (!isValidUpdate) {
      return res.status(400).json({
        error: "Invalid update fields",
        allowed: allowedUpdates,
      });
    }

    const result = await Task.updateMany(
      { firm: req.firmId, _id: { $in: taskIds } },
      updates,
    );
    clearTaskCachesForFirm(req.firmId);

    // Log bulk action in history
    for (const taskId of taskIds) {
      const historyEntry = new TaskHistory({
        firm: req.firmId,
        taskId,
        type: "bulk_action",
        value: updates.status || "Unknown",
        remark: `Bulk action: ${updates.status || "Unknown"} by ${
          req.user.username || "Unknown"
        }`,
        userId: req.user.userId || req.user.id,
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
router.get("/analytics", async (req, res) => {
  try {
    const { clientCode, financialYear, teamMemberId, serviceName } = req.query;

    const filter = {
      firm: req.firmId,
      isDeleted: false,
    };

    // Prefer exact filters where practical
    if (clientCode && String(clientCode).trim()) {
      filter.clientCode = String(clientCode).trim();
    }

    if (financialYear && String(financialYear).trim()) {
      filter.financialYear = String(financialYear).trim();
    }

    if (teamMemberId && String(teamMemberId).trim()) {
      filter.teamMemberId = String(teamMemberId).trim();
    }

    if (serviceName) {
      const serviceArray = Array.isArray(serviceName)
        ? serviceName
        : String(serviceName)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      if (serviceArray.length) {
        filter.serviceName = {
          $in: serviceArray.map((s) => new RegExp(s, "i")),
        };
      }
    }

    const currentDate = new Date();

    const rows = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },

          overdueCount: {
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
    ]);

    const statusCounts = {};
    let total = 0;
    let pending = 0;
    let upcoming = 0;
    let completed = 0;
    let overdue = 0;

    for (const row of rows) {
      const statusKey = row._id || "Unknown";
      const count = Number(row.count || 0);

      statusCounts[statusKey] = count;
      total += count;

      if (statusKey === "Pending") pending += count;
      else if (statusKey === "Upcoming") upcoming += count;
      else if (statusKey === "Completed") completed += count;

      overdue += Number(row.overdueCount || 0);
    }

    const formattedStats = {
      total,
      pending,
      upcoming,
      completed,
      overdue,
      pendingOverdue: overdue, // keep backward-compatible response shape
      statusCounts,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };

    return res.json(formattedStats);
  } catch (err) {
    console.error("❌ Error fetching analytics:", err);
    return res.status(500).json({
      message: "Server error while fetching analytics",
      error: err.message,
    });
  }
});

// Enhanced Analytics endpoint
router.get("/analytics-detailed", auth, async (req, res) => {
  try {
    const firmFilter = { firm: req.firmId, isDeleted: false };
    const istStartOfToday = getTodayISTStart();

    // Pull minimal fields needed for reliable "effective status" metrics
    const tasks = await Task.find(firmFilter, {
      status: 1,
      dueDate: 1,
      assignedAt: 1,
      priority: 1,
      serviceName: 1,
      serviceCode: 1,
      clientCode: 1,
      teamMemberId: 1,
    }).lean();

    // Effective status counts (aligns with Task Master page logic)
    const effCounts = {
      total: tasks.length,
      completed: 0,
      deleted: 0,
      pending: 0,
      upcoming: 0,
      pendingOverdue: 0,
      workflowOpen: 0, // In Progress / Pending-Client / etc.
      pendingAdminApproval: 0,
    };

    const byStatus = {}; // raw status distribution (for debugging/insights)
    const byPriority = {};
    const byService = {};

    for (const t of tasks) {
      const raw = String(t.status || "Pending").trim() || "Pending";
      byStatus[raw] = (byStatus[raw] || 0) + 1;

      if (t.priority)
        byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;

      const svcKey = t.serviceCode || t.serviceName || "Unknown";
      byService[svcKey] = (byService[svcKey] || 0) + 1;

      if (raw === "Completed") {
        effCounts.completed += 1;
        continue;
      }
      if (raw === "Deleted") {
        effCounts.deleted += 1;
        continue;
      }
      if (raw === "Pending-Admin-Approval") {
        effCounts.pendingAdminApproval += 1;
        // treat as open (but not Pending/Upcoming)
        effCounts.workflowOpen += 1;
        continue;
      }

      const eff = computeEffectiveStatus(t, istStartOfToday);

      if (eff.status === "Pending") {
        effCounts.pending += 1;
        if (eff.overdue) effCounts.pendingOverdue += 1;
      } else if (eff.status === "Upcoming") {
        effCounts.upcoming += 1;
      } else {
        // workflow stage (In Progress / Pending-Client / etc.)
        effCounts.workflowOpen += 1;
      }
    }

    const completionRate =
      effCounts.total > 0
        ? Math.round((effCounts.completed / effCounts.total) * 100)
        : 0;

    // Monthly trend (firm scoped)
    const monthlyTasks = await Task.aggregate([
      { $match: firmFilter },
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
      { $limit: 12 },
    ]);

    res.json({
      completionRate,
      totals: effCounts,
      statusCounts: byStatus,
      priorityCounts: byPriority,
      serviceCounts: byService,
      monthlyTasks,
    });
  } catch (err) {
    console.error("❌ Error fetching analytics-detailed:", err);
    res.status(500).json({
      message: "Server error while fetching analytics-detailed",
      error: err.message,
    });
  }
});

router.get("/pending-approval", requireRole("ADMIN"), async (req, res) => {
  try {
    const tasks = await Task.find({
      firm: req.firmId,
      isDeleted: false,
      status: "Pending-Admin-Approval",
    }).lean();

    // Fetch the latest remark for each task
    const tasksWithRemarks = await Promise.all(
      tasks.map(async (task) => {
        const latestHistory = await TaskHistory.findOne({
          firm: req.firmId,
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
      }),
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

router.post(
  "/apply-due-date-override",
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const {
        serviceCode,
        financialYear,
        newDueDate,
        onlyOpen = true,
        updateAssignmentFromDue = true,
      } = req.body || {};

      if (!serviceCode || !financialYear) {
        return res.status(400).json({
          message: "serviceCode and financialYear are required.",
        });
      }

      // Load service to (a) validate existence and (b) read dueOverrides + assignmentRule
      const service = await Service.findOne({
        firm: req.firmId,
        serviceCode,
      }).lean();
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Determine the date to apply
      let targetDue =
        newDueDate ||
        (service.dueOverrides?.get
          ? service.dueOverrides.get(financialYear)
          : service.dueOverrides?.[financialYear]);

      if (!targetDue) {
        return res.status(400).json({
          message:
            "No newDueDate provided and no matching dueOverrides[financialYear] found on the service.",
        });
      }
      targetDue = new Date(targetDue);
      if (Number.isNaN(targetDue.getTime())) {
        return res.status(400).json({ message: "Invalid newDueDate" });
      }

      // Build task filter
      const filter = {
        firm: req.firmId,
        isDeleted: false,
        serviceCode,
        financialYear,
      };
      filter.status = onlyOpen
        ? { $in: ["Pending", "Upcoming", "Pending-Admin-Approval"] }
        : { $ne: "Completed" };

      // ⚡ Build all updates in memory, then execute in TWO round-trips
      // (one bulkWrite for tasks, one insertMany for history) instead of
      // 2×N sequential awaits inside a for-loop.

      const istStartOfToday = getTodayISTStart();
      const istTs = istStartOfToday.getTime();
      const targetDueTs = targetDue.getTime();
      const isOverdue = targetDueTs < istTs;

      const anchorIsDue =
        updateAssignmentFromDue &&
        service.assignmentRule?.anchor === "dueDate" &&
        Number.isFinite(Number(service.assignmentRule?.offsetDays));

      const offsetDays = anchorIsDue
        ? Number(service.assignmentRule.offsetDays || 0)
        : 0;

      // Fetch only _id + dueDate + status (lean — we don't need full docs)
      const tasks = await Task.find(filter, {
        _id: 1,
        dueDate: 1,
        status: 1,
      }).lean();

      if (!tasks.length) {
        return res.json({
          message: "No matching tasks found.",
          matched: 0,
          modified: 0,
        });
      }

      // Only update tasks where dueDate actually changes
      const toUpdate = tasks.filter((t) => {
        const prev = t.dueDate ? new Date(t.dueDate).getTime() : null;
        return !prev || prev !== targetDueTs;
      });

      if (!toUpdate.length) {
        return res.json({
          message: `Applied override for ${financialYear} — all tasks already at target date.`,
          matched: tasks.length,
          modified: 0,
        });
      }

      // Build bulkWrite ops — one updateOne per changed task
      const bulkOps = toUpdate.map((t) => {
        const setFields = {
          dueDate: targetDue,
          dueDateSource: "OVERRIDE",
          updatedAt: new Date(),
        };

        // Recompute overdue flag for Pending tasks
        if (t.status === "Pending") {
          setFields.overdue = isOverdue;
        }

        // Recompute assignedAt when assignment is anchored to dueDate
        if (anchorIsDue) {
          const assign = new Date(targetDue);
          assign.setDate(assign.getDate() + offsetDays);
          setFields.assignedAt = assign;
        }

        return {
          updateOne: {
            filter: { _id: t._id, firm: req.firmId },
            update: { $set: setFields },
          },
        };
      });

      // ⚡ Single round-trip for all task updates
      const bulkResult = await Task.bulkWrite(bulkOps, { ordered: false });
      const modified = bulkResult.modifiedCount || 0;

      // ⚡ Single round-trip for all history entries
      const historyDocs = toUpdate.map((t) => ({
        firm: req.firmId,
        taskId: t._id,
        type: "system_update",
        value: "due_date_override",
        remark: `${financialYear} → ${targetDue.toISOString()}`,
        userId: req.user?.userId || req.user?.id,
        timestamp: new Date(),
      }));
      try {
        await TaskHistory.insertMany(historyDocs, { ordered: false });
      } catch (histErr) {
        console.warn(
          "apply-due-date-override: TaskHistory.insertMany partial failure:",
          histErr?.message,
        );
      }

      return res.json({
        message: `Applied override for ${financialYear}`,
        matched: tasks.length,
        modified,
      });
    } catch (err) {
      console.error("❌ Error applying due date override:", err);
      return res.status(500).json({ message: "Internal server error." });
    }
  },
);

// HARD DELETE all tasks (except Completed) for a client's service.
// Accepts DD-MMM-YYYY and keeps audit trail. Admin-only.
// URL: DELETE /api/tasks/clientservices/:clientCode/:serviceCode?effectiveDate=DD-MMM-YYYY&dryRun=true|false
router.delete(
  "/clientservices/:clientCode/:serviceCode",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const { clientCode, serviceCode } = req.params;

      // Parse effectiveDate as DD-MMM-YYYY (default: today)
      let eff;
      try {
        eff = req.query.effectiveDate
          ? parseDDMMMYYYY(req.query.effectiveDate)
          : new Date();
        eff.setHours(0, 0, 0, 0);
      } catch (e) {
        return res
          .status(400)
          .json({ message: e.message || "Invalid effectiveDate" });
      }

      const dryRun = String(req.query.dryRun).toLowerCase() === "true";
      const fy = getFinancialYear(eff);

      // Find the mapping for this FY (used to set endDate so generator stops)
      const cs = await ClientService.findOne({
        firm: req.firmId,
        clientCode,
        serviceCode,
        financialYear: fy,
      });
      if (!cs) {
        return res
          .status(404)
          .json({ message: `ClientService not found for FY ${fy}` });
      }

      // IMPORTANT: match ALL tasks for this client+service in this FY EXCEPT Completed.
      // (No assignedAt filter — so Pending, Pending-Overdue, Upcoming, In Progress, etc. will be removed.)
      const taskFilter = {
        firm: req.firmId,
        isDeleted: false,
        clientCode,
        serviceCode,
        financialYear: fy,
        status: { $ne: "Completed" },
      };

      const matched = await Task.countDocuments(taskFilter);

      if (dryRun) {
        return res.json({
          mode: "dryRun",
          effectiveDate: eff.toISOString(),
          matched,
          message: "Dry run only. No changes applied.",
        });
      }

      // 1) End-date the mapping so no new tasks are generated beyond this date
      cs.endDate = eff;
      await cs.save();

      // 2) Fetch IDs → write TaskHistory (audit) → HARD DELETE
      const toRemove = await Task.find(taskFilter, { _id: 1 }).lean();
      const ids = toRemove.map((d) => d._id);

      if (ids.length) {
        const actorId =
          (req.user && (req.user._id || req.user.id)) || undefined;
        const remark = `HARD DELETE (all except Completed), effective ${eff.toISOString()}`;

        // Audit trail BEFORE deletion
        const historyDocs = ids.map((_id) => ({
          firm: req.firmId,
          taskId: _id,
          type: "status_change",
          value: "Deleted",
          remark,
          userId: actorId,
          pendingApproval: false,
          pendingAction: "delete",
          timestamp: new Date(),
        }));
        try {
          await TaskHistory.insertMany(historyDocs, { ordered: false });
        } catch (e) {
          console.warn("TaskHistory insertMany warning:", e?.message);
        }

        // Hard delete
        const delRes = await Task.deleteMany({ _id: { $in: ids } });
        return res.json({
          mode: "commit",
          effectiveDate: eff.toISOString(),
          matched,
          deleted: delRes.deletedCount || 0,
          message: `Service set to end on ${eff.toISOString().slice(0, 10)}; ${
            delRes.deletedCount || 0
          } task(s) HARD-DELETED (all except Completed).`,
        });
      }

      // Nothing to delete
      return res.json({
        mode: "commit",
        effectiveDate: eff.toISOString(),
        matched: 0,
        deleted: 0,
        message: "No matching tasks found to delete.",
      });
    } catch (err) {
      console.error(
        "[DELETE /clientservices/:clientCode/:serviceCode] Error:",
        err,
      );
      res.status(500).json({
        message: err.message || "Failed to hard-delete service tasks.",
      });
    }
  },
);

// ============================================================
// ADD TO: server/routes/tasks.js
//
// New route: POST /tasks/:id/remark
//
// Writes a standalone remark/note into TaskHistory without
// modifying the Task document at all.
// Works on tasks of ANY status — pending, completed, deleted.
//
// Make sure TaskHistory is imported at the top of tasks.js:
//   const TaskHistory = require("../models/TaskHistory");
// ============================================================

router.post("/:id/remark", auth, async (req, res) => {
  try {
    const { firmId } = req.user;
    const { remark } = req.body;

    if (!remark || !String(remark).trim()) {
      return res.status(400).json({ message: "Remark text is required" });
    }

    // Resolve userId — handle all common auth middleware shapes:
    //   req.user._id   (Mongoose document attached by middleware)
    //   req.user.id    (plain object from jwt.verify)
    //   req.user.userId (custom middleware field)
    const userId = req.user._id || req.user.id || req.user.userId || null;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "User identity could not be resolved" });
    }

    // Verify the task belongs to this firm
    const task = await Task.findOne(
      { _id: req.params.id, firm: firmId },
      { _id: 1, firm: 1 },
    ).lean();

    if (!task) return res.status(404).json({ message: "Task not found" });

    const entry = await TaskHistory.create({
      taskId: task._id,
      firm: task.firm,
      type: "note",
      value: "note",
      remark: String(remark).trim(),
      userId,
      timestamp: new Date(),
    });

    res.status(201).json({ entry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// REPLACE your existing router.patch("/:id/subtasks", ...)
// in server/routes/tasks.js with this version.
//
// Key fixes vs previous version:
//   - Diff always runs against DB state (prev = task.subtasks from DB)
//     so re-renders / retries never produce duplicate history entries
//   - Accepts optional skipHistory flag (for future use)
//   - userId resolved safely across all auth middleware shapes
// ============================================================

router.patch("/:id/subtasks", auth, async (req, res) => {
  try {
    const { firmId } = req.user;
    const skipHistory = req.body.skipHistory === true;

    // Always load fresh from DB — this is the authoritative baseline for diff
    const task = await Task.findOne({ _id: req.params.id, firm: firmId });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const prevSubtasks = task.subtasks || [];

    const incoming = (req.body.subtasks || [])
      .map((s, i) => ({
        label: String(s.label || "").trim(),
        done: !!s.done,
        doneAt: s.done ? s.doneAt || new Date() : null,
        doneBy: s.done ? s.doneBy || null : null, // who ticked it
        addedBy: s.addedBy || req.user.teamMemberId || null,
        addedAt: s.addedAt || new Date(),
        sortOrder: i,
      }))
      .filter((s) => s.label);

    // ── Save subtasks first ────────────────────────────────────────────────
    task.subtasks = incoming;
    await task.save();

    // ── Diff and write audit trail ─────────────────────────────────────────
    if (!skipHistory) {
      const userId = req.user._id || req.user.id || req.user.userId || null;

      if (userId) {
        const historyEntries = [];
        const now = new Date();
        const dedupeWindow = new Date(now.getTime() - 60 * 1000); // 60-second window

        const prevByLabel = Object.fromEntries(
          prevSubtasks.map((s) => [s.label, s]),
        );
        const incomingByLabel = Object.fromEntries(
          incoming.map((s) => [s.label, s]),
        );

        // Build candidate entries
        const candidates = [];
        for (const item of incoming) {
          const was = prevByLabel[item.label];
          if (!was) {
            candidates.push({ value: item.label, remark: "Sub-task added" });
          } else if (was.done !== item.done) {
            candidates.push({
              value: item.label,
              remark: item.done ? "✓ Checked off" : "↩ Unchecked",
            });
          }
        }
        for (const was of prevSubtasks) {
          if (!incomingByLabel[was.label]) {
            candidates.push({ value: was.label, remark: "Sub-task removed" });
          }
        }

        // Deduplicate: skip any candidate already written in the last 60 seconds
        if (candidates.length > 0) {
          const recentEntries = await TaskHistory.find({
            taskId: task._id,
            type: "checklist",
            timestamp: { $gte: dedupeWindow },
          }).lean();

          const recentKeys = new Set(
            recentEntries.map((e) => `${e.value}::${e.remark}`),
          );

          for (const c of candidates) {
            const key = `${c.value}::${c.remark}`;
            if (!recentKeys.has(key)) {
              historyEntries.push({
                taskId: task._id,
                firm: task.firm,
                type: "checklist",
                value: c.value,
                remark: c.remark,
                userId,
                timestamp: now,
              });
            }
          }
        }

        if (historyEntries.length > 0) {
          TaskHistory.insertMany(historyEntries).catch((err) =>
            console.error("Checklist audit trail write failed:", err.message),
          );
        }
      }
    }

    res.json({ subtasks: task.subtasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
