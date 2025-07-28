const express = require("express");
const multer = require("multer");
const csv = require("csv-parse");
const fs = require("fs");
const path = require("path");
const Client = require("../models/Client");
const Team = require("../models/Team");
const Service = require("../models/Service");
const ClientService = require("../models/ClientService");
const Task = require("../models/Task");
const Config = require("../models/Config");
const { parse, format } = require("date-fns");

const router = express.Router();

// Ensure Uploads directory exists
const uploadDir = path.join(__dirname, "../Uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Helper function to parse CSV
const parseCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv.parse({ columns: true, trim: true }))
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
};

// Normalize date format (e.g., "1-Jun" to "01-Jun")
const normalizeDate = (dateStr) => {
  try {
    const parsed = parse(dateStr, "d-MMM", new Date(2025, 0, 1));
    if (!isNaN(parsed.getTime())) {
      return format(parsed, "dd-MMM");
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

// Collection count endpoints
router.get("/teams/count", async (req, res) => {
  try {
    const count = await Team.countDocuments();
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

router.get("/clients/count", async (req, res) => {
  try {
    const count = await Client.countDocuments();
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

router.get("/services/count", async (req, res) => {
  try {
    const count = await Service.countDocuments();
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

router.get("/clientservices/count", async (req, res) => {
  try {
    const count = await ClientService.countDocuments();
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Reset all collections functionality moved to end of file to avoid duplicates

// Import teams
router.post("/teams/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const results = [];
  const errors = [];
  const alreadyExists = [];

  try {
    const rows = await parseCsv(req.file.path);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      if (!row.teamMemberId || !row.name || !row.role || !row.contact) {
        errors.push({
          row: rowNumber,
          teamMemberId: row.teamMemberId || "Unknown",
          message: "Missing teamMemberId, name, role, or contact",
        });
        continue;
      }

      if (!/^\d{10}$/.test(row.contact)) {
        errors.push({
          row: rowNumber,
          teamMemberId: row.teamMemberId,
          message: "Invalid contact (must be 10 digits)",
        });
        continue;
      }

      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push({
          row: rowNumber,
          teamMemberId: row.teamMemberId,
          message: "Invalid email format",
        });
        continue;
      }

      const existing = await Team.findOne({ teamMemberId: row.teamMemberId });
      if (existing) {
        alreadyExists.push({
          row: rowNumber,
          teamMemberId: row.teamMemberId,
          message: `Team member ${row.teamMemberId} already exists`,
        });
        continue;
      }

      try {
        const team = new Team({
          teamMemberId: row.teamMemberId,
          name: row.name,
          role: row.role,
          contact: row.contact,
          email: row.email || "",
        });
        await team.save();
        results.push({ teamMemberId: row.teamMemberId, status: "imported" });
      } catch (err) {
        errors.push({
          row: rowNumber,
          teamMemberId: row.teamMemberId || "Unknown",
          message: err.message || "Failed to import team member",
        });
      }
    }

    fs.unlinkSync(req.file.path);
    const summary = `Imported ${results.length} team members, already exist ${alreadyExists.length}, errors ${errors.length}`;
    res.status(201).json({ message: summary, results, alreadyExists, errors });
  } catch (err) {
    fs.unlinkSync(req.file.path);
    res
      .status(400)
      .json({ message: "Error parsing CSV file", error: err.message });
  }
});

// Import clients
router.post("/clients/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const results = [];
  const errors = [];
  const alreadyExists = [];

  try {
    const rows = await parseCsv(req.file.path);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      if (!row.clientCode || !row.clientName || !row.firmName || !row.contact) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode || "Unknown",
          message: "Missing clientCode, clientName, firmName, or contact",
        });
        continue;
      }

      if (!/^\d{10}$/.test(row.contact)) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          message: "Invalid contact (must be 10 digits)",
        });
        continue;
      }

      if (row.gstin && !/^[A-Z0-9]{15}$/.test(row.gstin)) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          message: "Invalid GSTIN (must be 15 alphanumeric characters)",
        });
        continue;
      }

      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          message: "Invalid email format",
        });
        continue;
      }

      if (row.withUsSince && isNaN(new Date(row.withUsSince).getTime())) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          message: "Invalid withUsSince date (use YYYY-MM-DD)",
        });
        continue;
      }

      const existing = await Client.findOne({ clientCode: row.clientCode });
      if (existing) {
        alreadyExists.push({
          row: rowNumber,
          clientCode: row.clientCode,
          message: `Client ${row.clientCode} already exists`,
        });
        continue;
      }

      try {
        const client = new Client({
          clientCode: row.clientCode,
          groupCode: row.groupCode || "",
          clientName: row.clientName,
          firmName: row.firmName,
          address: row.address || "",
          gstin: row.gstin || "",
          contact: row.contact,
          email: row.email || "",
          withUsSince: row.withUsSince ? new Date(row.withUsSince) : null,
        });
        await client.save();
        results.push({ clientCode: row.clientCode, status: "imported" });
      } catch (err) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode || "Unknown",
          message: err.message || "Failed to import client",
        });
      }
    }

    fs.unlinkSync(req.file.path);
    const summary = `Imported ${results.length} clients, already exist ${alreadyExists.length}, errors ${errors.length}`;
    res.status(201).json({ message: summary, results, alreadyExists, errors });
  } catch (err) {
    fs.unlinkSync(req.file.path);
    res
      .status(400)
      .json({ message: "Error parsing CSV file", error: err.message });
  }
});

// Import services
router.post("/services/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const results = [];
  const errors = [];
  const alreadyExists = [];
  const validFrequencies = [
    "Yearly",
    "Quarterly",
    "Monthly",
    "Weekly",
    "On Demand",
  ];

  try {
    const rows = await parseCsv(req.file.path);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      if (
        !row.serviceCode ||
        !row.serviceName ||
        !row.serviceGroup ||
        !row.frequency ||
        !row.assignmentDates ||
        !row.dueDate ||
        !row.shiftNextPeriod
      ) {
        errors.push({
          row: rowNumber,
          serviceCode: row.serviceCode || "Unknown",
          message:
            "Missing serviceCode, serviceName, serviceGroup, frequency, assignmentDates, dueDate, or shiftNextPeriod",
        });
        continue;
      }

      if (!validFrequencies.includes(row.frequency)) {
        errors.push({
          row: rowNumber,
          serviceCode: row.serviceCode,
          message: `Invalid frequency (must be one of ${validFrequencies.join(
            ", "
          )})`,
        });
        continue;
      }

      let assignmentDates = [];
      if (row.frequency === "Weekly") {
        assignmentDates = row.assignmentDates.split(",").map((d) => d.trim());
        if (
          !assignmentDates.every(
            (day) =>
              !isNaN(parseInt(day)) && parseInt(day) >= 1 && parseInt(day) <= 31
          )
        ) {
          errors.push({
            row: rowNumber,
            serviceCode: row.serviceCode,
            message:
              "Invalid assignmentDates (must be comma-separated days 1-31)",
          });
          continue;
        }
      } else if (row.frequency === "On Demand") {
        if (row.assignmentDates !== "On Task Generation") {
          errors.push({
            row: rowNumber,
            serviceCode: row.serviceCode,
            message:
              "assignmentDates for On Demand must be 'On Task Generation'",
          });
          continue;
        }
        assignmentDates = [row.assignmentDates];
      } else if (row.frequency === "Yearly") {
        const normalizedDate = normalizeDate(row.assignmentDates);
        if (!/^[0-3][0-9]-[A-Za-z]{3}$/.test(normalizedDate)) {
          errors.push({
            row: rowNumber,
            serviceCode: row.serviceCode,
            message:
              "Invalid assignmentDates (use dd-MMM or d-MMM, e.g., 01-Jun or 1-Jun)",
          });
          continue;
        }
        assignmentDates = [normalizedDate];
      } else if (row.frequency === "Quarterly" || row.frequency === "Monthly") {
        const day = parseInt(row.assignmentDates);
        if (isNaN(day) || day < 1 || day > 31) {
          errors.push({
            row: rowNumber,
            serviceCode: row.serviceCode,
            message: "Invalid assignmentDates (must be a day 1-31)",
          });
          continue;
        }
        assignmentDates = [row.assignmentDates];
      }

      if (row.frequency === "Weekly" || row.frequency === "On Demand") {
        if (!/^\d+\s*days$/.test(row.dueDate)) {
          errors.push({
            row: rowNumber,
            serviceCode: row.serviceCode,
            message: "dueDate must be in 'N days' format for Weekly/On Demand",
          });
          continue;
        }
      } else if (row.frequency === "Yearly") {
        const normalizedDate = normalizeDate(row.dueDate);
        if (!/^[0-3][0-9]-[A-Za-z]{3}$/.test(normalizedDate)) {
          errors.push({
            row: rowNumber,
            serviceCode: row.serviceCode,
            message:
              "Invalid dueDate (use dd-MMM or d-MMM, e.g., 31-Jul or 1-Jul)",
          });
          continue;
        }
        row.dueDate = normalizedDate;
      } else if (row.frequency === "Quarterly") {
        if (isNaN(parseInt(row.dueDate)) || parseInt(row.dueDate) < 1) {
          errors.push({
            row: rowNumber,
            serviceCode: row.serviceCode,
            message: "dueDate must be a positive number of days",
          });
          continue;
        }
      } else if (row.frequency === "Monthly") {
        const day = parseInt(row.dueDate);
        if (isNaN(day) || day < 1 || day > 31) {
          errors.push({
            row: rowNumber,
            serviceCode: row.serviceCode,
            message: "dueDate must be a day between 1 and 31",
          });
          continue;
        }
      }

      if (!["Yes", "No"].includes(row.shiftNextPeriod)) {
        errors.push({
          row: rowNumber,
          serviceCode: row.serviceCode,
          message: "Invalid shiftNextPeriod (use Yes/No)",
        });
        continue;
      }

      const repetitive =
        row.frequency === "On Demand" ? "No" : row.repetitive || "Yes";
      if (!["Yes", "No"].includes(repetitive)) {
        errors.push({
          row: rowNumber,
          serviceCode: row.serviceCode,
          message: "Invalid repetitive (use Yes/No)",
        });
        continue;
      }

      if (row.sacCode && !/^\d{6}$/.test(row.sacCode)) {
        errors.push({
          row: rowNumber,
          serviceCode: row.serviceCode,
          message: "Invalid sacCode (must be 6 digits)",
        });
        continue;
      }

      if (row.priority && !["Low", "Medium", "High"].includes(row.priority)) {
        errors.push({
          row: rowNumber,
          serviceCode: row.serviceCode,
          message: "Invalid priority (must be Low, Medium, or High)",
        });
        continue;
      }

      const existing = await Service.findOne({ serviceCode: row.serviceCode });
      if (existing) {
        alreadyExists.push({
          row: rowNumber,
          serviceCode: row.serviceCode,
          message: `Service ${row.serviceCode} already exists`,
        });
        continue;
      }

      try {
        const service = new Service({
          serviceCode: row.serviceCode,
          serviceName: row.serviceName,
          sacCode: row.sacCode || "",
          serviceGroup: row.serviceGroup,
          frequency: row.frequency,
          assignmentDates,
          dueDate: row.dueDate,
          shiftNextPeriod: row.shiftNextPeriod === "Yes",
          repetitive: repetitive === "Yes",
          priority: row.priority || "Medium",
          remarks: row.remarks || "",
        });
        await service.save();
        results.push({ serviceCode: row.serviceCode, status: "imported" });
      } catch (err) {
        errors.push({
          row: rowNumber,
          serviceCode: row.serviceCode || "Unknown",
          message: err.message || "Failed to import service",
        });
      }
    }

    fs.unlinkSync(req.file.path);
    const summary = `Imported ${results.length} services, already exist ${alreadyExists.length}, errors ${errors.length}`;
    res.status(201).json({ message: summary, results, alreadyExists, errors });
  } catch (err) {
    fs.unlinkSync(req.file.path);
    res
      .status(400)
      .json({ message: "Error parsing CSV file", error: err.message });
  }
});

// Import client-service mappings
router.post(
  "/clientservices/import",
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const results = [];
    const errors = [];
    const alreadyExists = [];
    try {
      const rows = await parseCsv(req.file.path);
      console.log("ClientService CSV rows:", rows);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        if (
          !row.clientCode ||
          !row.clientName ||
          !row.servicesGiven ||
          !row.teamMemberName ||
          !row.financialYear
        ) {
          errors.push({
            row: rowNumber,
            clientCode: row.clientCode || "Unknown",
            message:
              "Missing clientCode, clientName, servicesGiven, teamMemberName, or financialYear",
          });
          continue;
        }
        if (!/^FY \d{4}-\d{2}$/.test(row.financialYear)) {
          errors.push({
            row: rowNumber,
            clientCode: row.clientCode,
            message: "Invalid financialYear (use FY YYYY-YY)",
          });
          continue;
        }
        if (row.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.startDate)) {
          errors.push({
            row: rowNumber,
            clientCode: row.clientCode,
            message: "Invalid startDate (use YYYY-MM-DD)",
          });
          continue;
        }
        const client = await Client.findOne({ clientCode: row.clientCode });
        if (!client) {
          errors.push({
            row: rowNumber,
            clientCode: row.clientCode,
            message: `Client not found: ${row.clientCode}`,
          });
          continue;
        }
        const service = await Service.findOne({
          serviceName: {
            $regex: `^${row.servicesGiven.trim()}$`,
            $options: "i",
          },
        });
        if (!service) {
          errors.push({
            row: rowNumber,
            clientCode: row.clientCode,
            serviceName: row.servicesGiven,
            message: `Service not found: ${row.servicesGiven}`,
          });
          continue;
        }
        const teamMember = await Team.findOne({
          name: { $regex: `^${row.teamMemberName.trim()}$`, $options: "i" },
        });
        if (!teamMember) {
          errors.push({
            row: rowNumber,
            clientCode: row.clientCode,
            message: `Team member not found: ${row.teamMemberName}`,
          });
          continue;
        }
        const existing = await ClientService.findOne({
          clientCode: row.clientCode,
          serviceCode: service.serviceCode,
          financialYear: row.financialYear,
        });
        if (existing) {
          alreadyExists.push({
            row: rowNumber,
            clientCode: row.clientCode,
            serviceCode: service.serviceCode,
            message: `Client-service mapping for ${row.clientCode}, ${row.servicesGiven}, ${row.financialYear} already exists`,
          });
          continue;
        }
        try {
          const clientService = new ClientService({
            clientCode: row.clientCode,
            serviceCode: service.serviceCode,
            teamMemberId: teamMember.teamMemberId,
            startDate: row.startDate ? new Date(row.startDate) : null,
            financialYear: row.financialYear,
          });
          await clientService.save();
          results.push({
            clientCode: row.clientCode,
            serviceCode: service.serviceCode,
            status: "imported",
          });
        } catch (err) {
          errors.push({
            row: rowNumber,
            clientCode: row.clientCode,
            message: err.message || "Failed to import client-service mapping",
          });
        }
      }
      fs.unlinkSync(req.file.path);
      const summary = `Imported ${results.length} client-service mappings, already exist ${alreadyExists.length}, errors ${errors.length}`;
      res
        .status(201)
        .json({ message: summary, results, alreadyExists, errors });
    } catch (err) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res
        .status(400)
        .json({ message: "Error parsing CSV file", error: err.message });
    }
  }
);

// 🔧 ADDED: Import lock status endpoint
router.get("/import-lock", async (req, res) => {
  try {
    // Check if import is currently locked
    const config = await Config.findOne({ key: "import_lock" });
    const isLocked = config ? config.value === "true" : false;

    res.json({
      isLocked,
      message: isLocked ? "Import is currently locked" : "Import is available",
      lastUpdate: config ? config.updatedAt : null,
    });
  } catch (err) {
    console.error("Error checking import lock:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔧 ADDED: Set import lock status endpoint
router.post("/import-lock", async (req, res) => {
  try {
    const { locked } = req.body;

    await Config.findOneAndUpdate(
      { key: "import_lock" },
      {
        key: "import_lock",
        value: locked ? "true" : "false",
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Import ${locked ? "locked" : "unlocked"} successfully`,
      isLocked: locked,
    });
  } catch (err) {
    console.error("Error setting import lock:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔧 ADDED: Reset all collections endpoint (DELETE method for frontend compatibility)
router.delete("/reset-collections", async (req, res) => {
  try {
    const Team = require("../models/Team");
    const Client = require("../models/Client");
    const Service = require("../models/Service");
    const ClientService = require("../models/ClientService");
    const Task = require("../models/Task");
    const TaskHistory = require("../models/TaskHistory");
    const ActionStage = require("../models/ActionStage");

    await Team.deleteMany({});
    await Client.deleteMany({});
    await Service.deleteMany({});
    await ClientService.deleteMany({});
    await Task.deleteMany({});
    await TaskHistory.deleteMany({});
    await ActionStage.deleteMany({});

    res.status(200).json({ message: "Collections reset successfully" });
  } catch (err) {
    console.error("Error resetting collections:", err);
    res
      .status(500)
      .json({ message: `Failed to reset collections: ${err.message}` });
  }
});

// Import tasks
router.post("/tasks/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const results = [];
  const errors = [];
  const alreadyExists = [];

  try {
    const rows = await parseCsv(req.file.path);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      // Validate required fields
      if (
        !row.clientCode ||
        !row.serviceCode ||
        !row.serviceName ||
        !row.teamMemberId ||
        !row.assignedAt ||
        !row.dueDate ||
        !row.financialYear ||
        !row.relatedFinancialYear ||
        !row.servicePeriod
      ) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode || "Unknown",
          serviceCode: row.serviceCode || "Unknown",
          message:
            "Missing required fields: clientCode, serviceCode, serviceName, teamMemberId, assignedAt, dueDate, financialYear, relatedFinancialYear, or servicePeriod",
        });
        continue;
      }

      // Validate date formats
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(row.assignedAt) ||
        isNaN(new Date(row.assignedAt).getTime())
      ) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          message: "Invalid assignedAt date (use YYYY-MM-DD)",
        });
        continue;
      }
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(row.dueDate) ||
        isNaN(new Date(row.dueDate).getTime())
      ) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          message: "Invalid dueDate date (use YYYY-MM-DD)",
        });
        continue;
      }

      // Validate financial year formats
      if (!/^FY \d{4}-\d{2}$/.test(row.financialYear)) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          message: "Invalid financialYear format (use FY YYYY-YY)",
        });
        continue;
      }
      if (!/^FY \d{4}-\d{2}$/.test(row.relatedFinancialYear)) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          message: "Invalid relatedFinancialYear format (use FY YYYY-YY)",
        });
        continue;
      }

      // Validate references
      const client = await Client.findOne({ clientCode: row.clientCode });
      if (!client) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          message: `Client not found: ${row.clientCode}`,
        });
        continue;
      }

      const service = await Service.findOne({ serviceCode: row.serviceCode });
      if (!service) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          message: `Service not found: ${row.serviceCode}`,
        });
        continue;
      }

      const teamMember = await Team.findOne({ teamMemberId: row.teamMemberId });
      if (!teamMember) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          message: `Team member not found: ${row.teamMemberId}`,
        });
        continue;
      }

      // Check for duplicates
      const existing = await Task.findOne({
        clientCode: row.clientCode,
        serviceCode: row.serviceCode,
        assignedAt: new Date(row.assignedAt),
        servicePeriod: row.servicePeriod,
        status: { $ne: "Deleted" },
      });
      if (existing) {
        alreadyExists.push({
          row: rowNumber,
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          message: `Task already exists for client ${row.clientCode}, service ${row.serviceCode}, period ${row.servicePeriod}`,
        });
        continue;
      }

      try {
        const task = new Task({
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          serviceName: row.serviceName,
          teamMemberId: row.teamMemberId,
          assignedAt: new Date(row.assignedAt),
          dueDate: new Date(row.dueDate),
          financialYear: row.financialYear,
          relatedFinancialYear: row.relatedFinancialYear,
          servicePeriod: row.servicePeriod,
          status:
            new Date(row.assignedAt) > new Date() ? "Upcoming" : "Pending",
          overdue: new Date(row.dueDate) < new Date(),
        });
        await task.save();
        const historyEntry = new TaskHistory({
          taskId: task._id,
          type: "creation",
          value: "Created",
          remark: `Task imported by ${req.user?.username || "Unknown"}`,
          userId: req.user?.id || null,
          timestamp: new Date(),
        });
        await historyEntry.save();
        results.push({
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          status: "imported",
        });
      } catch (err) {
        errors.push({
          row: rowNumber,
          clientCode: row.clientCode,
          serviceCode: row.serviceCode,
          message: err.message || "Failed to import task",
        });
      }
    }

    fs.unlinkSync(req.file.path);
    const summary = `Imported ${results.length} tasks, already exist ${alreadyExists.length}, errors ${errors.length}`;
    res.status(201).json({ message: summary, results, alreadyExists, errors });
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res
      .status(400)
      .json({ message: "Error parsing CSV file", error: err.message });
  }
});

module.exports = router;
