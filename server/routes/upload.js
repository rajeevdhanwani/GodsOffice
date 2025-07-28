const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const Team = require("../models/Team");
const Client = require("../models/Client");
const Service = require("../models/Service");
const ClientService = require("../models/ClientService");
const Task = require("../models/Task");
const TaskHistory = require("../models/TaskHistory");
const ActionStage = require("../models/ActionStage");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Validate date format (e.g., "2025-05-01" or empty)
const isValidDate = (dateStr) => {
  if (!dateStr) return true; // Allow empty startDate
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

// Validate service date format (e.g., "11-May" for monthly, number for weekly)
const isValidServiceDate = (dateStr, frequency) => {
  if (!dateStr) return false;
  if (frequency === "Weekly") {
    // Expect comma-separated numbers (e.g., "1,8,15,22")
    const days = dateStr.split(",").map((d) => parseInt(d.trim()));
    return days.every((day) => !isNaN(day) && day >= 1 && day <= 31);
  }
  return /^[0-3]?[0-9]-[A-Za-z]{3}$/.test(dateStr); // e.g., "11-May"
};

// Generic CSV upload handler
const handleCsvUpload = (Model, endpoint) => async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const results = [];
    const errors = [];
    const seen = new Set();
    let rowNumber = 2; // Account for header row

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => {
        if (endpoint === "clientservices") {
          // Validate required fields
          if (!data.clientCode) {
            errors.push({
              row: rowNumber,
              message: `Missing clientCode`,
            });
            rowNumber++;
            return;
          }
          if (!data.servicesGiven) {
            errors.push({
              row: rowNumber,
              message: `Missing servicesGiven`,
            });
            rowNumber++;
            return;
          }
          if (!data.teamMemberName) {
            errors.push({
              row: rowNumber,
              message: `Missing teamMemberName`,
            });
            rowNumber++;
            return;
          }
          if (
            !data.financialYear ||
            !data.financialYear.match(/^FY \d{4}-\d{2}$/)
          ) {
            errors.push({
              row: rowNumber,
              message: `Invalid or missing financialYear`,
            });
            rowNumber++;
            return;
          }
          // Check for duplicates
          const key = `${data.clientCode}-${data.servicesGiven}-${data.financialYear}`;
          if (seen.has(key)) {
            errors.push({
              row: rowNumber,
              message: `Duplicate clientCode ${data.clientCode}, servicesGiven ${data.servicesGiven}, financialYear ${data.financialYear}`,
            });
            rowNumber++;
            return;
          }
          seen.add(key);
          // Validate startDate
          if (data.startDate && !isValidDate(data.startDate)) {
            errors.push({
              row: rowNumber,
              message: `Invalid startDate: ${data.startDate}`,
            });
            rowNumber++;
            return;
          }
        } else if (endpoint === "teams") {
          // Validate required fields
          if (!data.teamMemberId) {
            errors.push({
              row: rowNumber,
              message: `Missing teamMemberId`,
            });
            rowNumber++;
            return;
          }
          if (!data.name) {
            errors.push({
              row: rowNumber,
              message: `Missing name`,
            });
            rowNumber++;
            return;
          }
          if (!data.contact || !/^\d{10}$/.test(data.contact)) {
            errors.push({
              row: rowNumber,
              message: `Invalid or missing contact (must be 10 digits)`,
            });
            rowNumber++;
            return;
          }
        } else if (endpoint === "services") {
          // Validate assignmentDates
          if (!isValidServiceDate(data.assignmentDates, data.frequency)) {
            errors.push({
              row: rowNumber,
              message: `Invalid assignmentDates for ${data.serviceCode}: ${data.assignmentDates}`,
            });
            rowNumber++;
            return;
          }
          // Validate dueDate
          if (
            data.frequency !== "Weekly" &&
            !isValidServiceDate(data.dueDate, data.frequency)
          ) {
            errors.push({
              row: rowNumber,
              message: `Invalid dueDate for ${data.serviceCode}: ${data.dueDate}`,
            });
            rowNumber++;
            return;
          }
          if (data.frequency === "Weekly" && !data.dueDate.includes("days")) {
            errors.push({
              row: rowNumber,
              message: `Weekly dueDate must include 'days' for ${data.serviceCode}: ${data.dueDate}`,
            });
            rowNumber++;
            return;
          }
          // Validate shiftNextPeriod
          if (!["Yes", "No"].includes(data.shiftNextPeriod)) {
            errors.push({
              row: rowNumber,
              message: `Invalid shiftNextPeriod for ${data.serviceCode}: ${data.shiftNextPeriod}`,
            });
            rowNumber++;
            return;
          }
          // Ensure shiftNextPeriod is "No" for Weekly services
          if (data.frequency === "Weekly" && data.shiftNextPeriod !== "No") {
            errors.push({
              row: rowNumber,
              message: `Weekly services must have shiftNextPeriod set to 'No' for ${data.serviceCode}`,
            });
            rowNumber++;
            return;
          }
          // Convert assignmentDates to array for Weekly services
          if (data.frequency === "Weekly") {
            const days = data.assignmentDates
              .split(",")
              .map((d) => parseInt(d.trim()));
            if (!days.every((day) => !isNaN(day) && day >= 1 && day <= 31)) {
              errors.push({
                row: rowNumber,
                message: `Invalid assignmentDates for ${data.serviceCode}: ${data.assignmentDates} (all days must be 1-31)`,
              });
              rowNumber++;
              return;
            }
            data.assignmentDates = data.assignmentDates
              .split(",")
              .map((d) => d.trim());
          } else {
            data.assignmentDates = [data.assignmentDates];
          }
        }
        results.push(data);
        rowNumber++;
      })
      .on("end", async () => {
        try {
          if (errors.length > 0) {
            fs.unlinkSync(req.file.path);
            return res
              .status(400)
              .json({ message: `CSV validation errors`, errors });
          }
          await Model.insertMany(results);
          fs.unlinkSync(req.file.path);
          res
            .status(201)
            .json({ message: `${endpoint} uploaded successfully` });
        } catch (err) {
          fs.unlinkSync(req.file.path);
          res
            .status(400)
            .json({ message: `Failed to save ${endpoint}: ${err.message}` });
        }
      })
      .on("error", (err) => {
        fs.unlinkSync(req.file.path);
        res
          .status(400)
          .json({ message: `Failed to parse CSV: ${err.message}` });
      });
  } catch (err) {
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
};

// Reset all collections
router.post("/reset-collections", async (req, res) => {
  try {
    await Team.deleteMany({});
    await Client.deleteMany({});
    await Service.deleteMany({});
    await ClientService.deleteMany({});
    await Task.deleteMany({});
    await TaskHistory.deleteMany({});
    await ActionStage.deleteMany({});
    res.status(200).json({ message: "Collections reset successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: `Failed to reset collections: ${err.message}` });
  }
});

router.post(
  "/teams/import",
  upload.single("file"),
  handleCsvUpload(Team, "teams")
);
router.post(
  "/clients/import",
  upload.single("file"),
  handleCsvUpload(Client, "clients")
);
router.post(
  "/services/import",
  upload.single("file"),
  handleCsvUpload(Service, "services")
);
router.post(
  "/clientservices/import",
  upload.single("file"),
  handleCsvUpload(ClientService, "clientservices")
);

module.exports = router;
