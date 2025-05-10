console.log("Tasks router loaded");

const express = require("express");
const Task = require("../models/Task");
const ClientService = require("../models/ClientService");
const Service = require("../models/Service");
const Team = require("../models/Team");
const Client = require("../models/Client");

const router = express.Router();

router.get("/debug", (req, res) => {
  res.json({ message: "Task router is loaded" });
});

// Get all tasks (moved to top)
router.get("/", async (req, res) => {
  console.log("GET /api/tasks called");
  const { clientCode, status, financialYear } = req.query;
  try {
    const query = {};
    if (clientCode) query.clientCode = clientCode;
    if (status) query.status = status;
    if (financialYear) query.financialYear = financialYear;
    const tasks = await Task.find(query);
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a task
router.post("/", async (req, res) => {
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
  try {
    const existing = await Task.findOne({
      clientCode,
      serviceCode,
      assignedAt,
    });
    if (existing) {
      return res.status(400).json({
        message: "Task already exists for this client, service, and period",
      });
    }
    const task = new Task({
      clientCode,
      serviceCode,
      serviceName,
      teamMemberId,
      assignedAt: new Date(assignedAt),
      dueDate: new Date(dueDate),
      status,
      financialYear,
      relatedFinancialYear,
      servicePeriod,
      overdue: new Date(dueDate) < new Date() && status !== "Completed",
    });
    await task.save();
    res.status(201).json({ message: "Task created successfully", task });
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(400).json({ message: err.message || "Failed to create task" });
  }
});

// Update a task
router.put("/:id", async (req, res) => {
  const { status, teamMemberId, completedAt, remarks } = req.body;
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    task.status = status || task.status;
    task.teamMemberId = teamMemberId || task.teamMemberId;
    task.completedAt = completedAt || task.completedAt;
    task.remarks = remarks || task.remarks;
    task.overdue = task.dueDate < new Date() && task.status !== "Completed";
    await task.save();
    res.json({ message: "Task updated successfully", task });
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(400).json({ message: err.message || "Failed to update task" });
  }
});

// Get client-service mappings
router.get("/clientservices", async (req, res) => {
  const { clientCode } = req.query;
  try {
    const query = clientCode ? { clientCode } : {};
    const mappings = await ClientService.find(query);
    res.json(mappings);
  } catch (err) {
    console.error("Error fetching client-services:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add client-service mapping
router.post("/clientservices", async (req, res) => {
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
    console.error("Error adding client-service:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to add client-service mapping" });
  }
});

// Get all services
router.get("/services", async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a service
router.post("/services", async (req, res) => {
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
    console.error("Error creating service:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to create service" });
  }
});

// Update a service
router.put("/services/:id", async (req, res) => {
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
    service.serviceCode = serviceCode;
    service.serviceName = serviceName;
    service.sacCode = sacCode;
    service.serviceGroup = serviceGroup;
    service.frequency = frequency;
    service.assignmentDates = assignmentDates;
    service.dueDate = dueDate;
    service.shiftNextPeriod = shiftNextPeriod;
    service.repetitive = repetitive;
    service.priority = priority;
    service.remarks = remarks;
    await service.save();
    res.json({ message: "Service updated successfully", service });
  } catch (err) {
    console.error("Error updating service:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to update service" });
  }
});

// Delete a service
router.delete("/services/:id", async (req, res) => {
  try {
    const result = await Service.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error("Error deleting service:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to delete service" });
  }
});

// Get all team members
router.get("/teams", async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Generate existing tasks from client-service mappings
router.post("/tasks/generate-existing", async (req, res) => {
  try {
    const clientServices = await ClientService.find();
    const services = await Service.find();
    const clients = await Client.find();
    const results = [];
    const errors = [];

    console.log("ClientServices:", clientServices);
    console.log("Services:", services);
    console.log("Clients:", clients);

    for (let i = 0; i < clientServices.length; i++) {
      const cs = clientServices[i];
      const rowNumber = i + 2;

      const service = services.find((s) => s.serviceCode === cs.serviceCode);
      if (!service) {
        errors.push({
          row: rowNumber,
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          message: "Service not found",
        });
        continue;
      }
      if (service.frequency === "On Demand") {
        results.push({
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          status: "skipped",
          message: "On-Demand service",
        });
        continue;
      }

      const client = clients.find((c) => c.clientCode === cs.clientCode);
      if (!client) {
        errors.push({
          row: rowNumber,
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          message: "Client not found",
        });
        continue;
      }

      const financialYearParts = cs.financialYear.split("-");
      const startYear =
        parseInt(financialYearParts[0].replace("FY ", "")) ||
        new Date().getFullYear();
      const endYear = startYear + 1;
      const periods =
        service.frequency === "Monthly"
          ? 12
          : service.frequency === "Quarterly"
          ? 4
          : service.frequency === "Yearly"
          ? 1
          : service.frequency === "Weekly"
          ? service.assignmentDates.length * 12
          : 0;
      const baseDate = cs.startDate
        ? new Date(cs.startDate)
        : new Date(startYear, 3, 1); // April 1

      for (let j = 0; j < periods; j++) {
        const assignedAt = new Date(baseDate);
        const dueDate = new Date(baseDate);
        let assignDay, dueDay, servicePeriod, relatedFinancialYear;

        try {
          if (service.frequency === "Weekly") {
            const weekIndex = Math.floor(j / 12);
            const monthIndex = j % 12;
            assignDay = parseInt(service.assignmentDates[weekIndex]) || 1;
            dueDay = parseInt(service.dueDate.replace(" days", "")) || 7;
            assignedAt.setMonth(
              baseDate.getMonth() +
                monthIndex +
                (service.shiftNextPeriod ? 1 : 0)
            );
            assignedAt.setDate(assignDay);
            dueDate.setTime(
              assignedAt.getTime() + dueDay * 24 * 60 * 60 * 1000
            );
            servicePeriod = `${assignedAt.toLocaleString("default", {
              day: "2-digit",
              month: "short",
              year: "2-digit",
            })}`;
            relatedFinancialYear = `FY ${
              assignedAt.getFullYear() - (assignedAt.getMonth() < 3 ? 1 : 0)
            }-${
              assignedAt.getFullYear() + (assignedAt.getMonth() >= 9 ? 1 : 0)
            }`;
          } else {
            assignDay = service.assignmentDates[0].includes("-")
              ? new Date(`${service.assignmentDates[0]}-${startYear}`).getDate()
              : parseInt(service.assignmentDates[0]) || 1;
            dueDay = service.dueDate.includes("-")
              ? new Date(`${service.dueDate}-${startYear}`).getDate()
              : parseInt(service.dueDate) || 10;
            if (service.frequency === "Monthly") {
              assignedAt.setMonth(
                baseDate.getMonth() + j + (service.shiftNextPeriod ? 1 : 0)
              );
              dueDate.setMonth(
                baseDate.getMonth() + j + (service.shiftNextPeriod ? 1 : 0)
              );
              assignedAt.setDate(assignDay);
              dueDate.setDate(dueDay);
              servicePeriod = new Date(
                baseDate.getFullYear(),
                baseDate.getMonth() + j,
                1
              ).toLocaleString("default", { month: "short", year: "2-digit" });
              relatedFinancialYear = `FY ${
                startYear - (baseDate.getMonth() + j < 3 ? 1 : 0)
              }-${startYear + (baseDate.getMonth() + j >= 9 ? 1 : 0)}`;
            } else if (service.frequency === "Quarterly") {
              assignedAt.setMonth(
                baseDate.getMonth() + j * 3 + (service.shiftNextPeriod ? 3 : 0)
              );
              dueDate.setMonth(
                baseDate.getMonth() + j * 3 + (service.shiftNextPeriod ? 3 : 0)
              );
              assignedAt.setDate(assignDay);
              dueDate.setDate(dueDay);
              const quarterStartMonth =
                Math.floor((baseDate.getMonth() + j * 3) / 3) * 3;
              servicePeriod = `Q${Math.floor(quarterStartMonth / 3) + 1}-${
                baseDate.getFullYear() % 100
              }`;
              relatedFinancialYear = `FY ${
                startYear - (quarterStartMonth < 3 ? 1 : 0)
              }-${startYear + (quarterStartMonth >= 9 ? 1 : 0)}`;
            } else {
              assignedAt.setMonth(3 + j + (service.shiftNextPeriod ? 12 : 0));
              dueDate.setMonth(3 + j + (service.shiftNextPeriod ? 12 : 0));
              assignedAt.setDate(assignDay);
              dueDate.setDate(dueDay);
              servicePeriod = `FY ${startYear}`;
              relatedFinancialYear = `FY ${startYear}-${endYear}`;
            }
          }
        } catch (err) {
          errors.push({
            row: rowNumber,
            clientCode: cs.clientCode,
            serviceCode: cs.serviceCode,
            message: `Invalid date format: ${err.message}`,
          });
          continue;
        }

        const existingTask = await Task.findOne({
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          assignedAt,
        });
        if (existingTask) {
          results.push({
            clientCode: cs.clientCode,
            serviceCode: cs.serviceCode,
            status: "already_exists",
            message: "Task already exists",
          });
          continue;
        }

        const task = new Task({
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          serviceName: service.serviceName,
          teamMemberId: cs.teamMemberId,
          assignedAt,
          dueDate,
          status: "Pending",
          financialYear: `FY ${startYear}-${endYear}`,
          relatedFinancialYear,
          servicePeriod,
          overdue: dueDate < new Date() && status !== "Completed",
        });
        await task.save();
        results.push({
          clientCode: cs.clientCode,
          serviceCode: cs.serviceCode,
          status: "imported",
        });
      }
    }

    const importedCount = results.filter((r) => r.status === "imported").length;
    const alreadyExistsCount = results.filter(
      (r) => r.status === "already_exists"
    ).length;
    const summary = `Imported ${importedCount} tasks, ${alreadyExistsCount} already exist, ${errors.length} errors`;

    res.status(201).json({ message: summary, results: errors, errors });
  } catch (err) {
    console.error("Task generation error:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to generate tasks", errors });
  }
});

module.exports = router;
