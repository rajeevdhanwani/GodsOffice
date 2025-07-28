const cron = require("node-cron");
const ClientService = require("./models/ClientService");
const Service = require("./models/Service");
const Task = require("./models/Task");
const TaskHistory = require("./models/TaskHistory");
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

const regenerateTasksForNewFY = async () => {
  console.log("Starting FY task regeneration:", new Date());
  try {
    const currentDate = new Date();
    const nextFYYear =
      currentDate.getMonth() < 3
        ? currentDate.getFullYear()
        : currentDate.getFullYear() + 1;
    const financialYear = `FY ${nextFYYear}-${((nextFYYear + 1) % 100)
      .toString()
      .padStart(2, "0")}`;
    const fyEndDate = new Date(nextFYYear + 1, 2, 31); // March 31 of next year

    const clientServices = await ClientService.find({}).lean();
    const errors = [];

    for (const clientService of clientServices) {
      const service = await Service.findOne({
        serviceCode: clientService.serviceCode,
      });
      if (!service || !service.repetitive) continue;

      const referenceDate = new Date(clientService.startDate || currentDate);
      if (!isValid(referenceDate)) continue;

      const tasks = [];
      const baseYear = nextFYYear;

      const parseServiceDate = (
        dateStr,
        referenceDate,
        isAssignmentDate = false,
        frequency
      ) => {
        if (!dateStr || typeof dateStr !== "string") return referenceDate;
        if (
          (frequency === "Monthly" || frequency === "Quarterly") &&
          !isNaN(parseInt(dateStr))
        ) {
          const day = parseInt(dateStr);
          if (day < 1 || day > 31)
            throw new Error(`Invalid day number: ${dateStr}`);
          const resultDate = new Date(referenceDate);
          resultDate.setDate(day);
          if (!isValid(resultDate))
            throw new Error(`Invalid date generated for day ${dateStr}`);
          return resultDate;
        }
        if (dateStr.includes("days")) {
          const days = parseInt(dateStr);
          if (isNaN(days))
            throw new Error(`Invalid due date format: ${dateStr}`);
          const resultDate = addDays(referenceDate, days);
          if (!isValid(resultDate))
            throw new Error(`Invalid date generated for ${dateStr}`);
          return resultDate;
        }
        try {
          const currentYear = referenceDate.getFullYear();
          const parsedDate = parse(
            dateStr,
            "dd-MMM",
            new Date(currentYear, 0, 1)
          );
          if (!isValid(parsedDate))
            throw new Error(`Invalid date format: ${dateStr}`);
          return parsedDate;
        } catch (err) {
          throw new Error(`Invalid date format: ${dateStr}`);
        }
      };

      const getQuarter = (date) => {
        const month = date.getMonth();
        return Math.floor(month / 3) + 1;
      };

      const generateTask = (assignedAt, dueDate, servicePeriod) => {
        if (!isValid(assignedAt) || !isValid(dueDate)) {
          throw new Error(
            `Invalid task dates: assignedAt=${assignedAt}, dueDate=${dueDate}`
          );
        }
        return new Task({
          clientCode: clientService.clientCode,
          serviceCode: service.serviceCode,
          serviceName: service.serviceName,
          teamMemberId: clientService.teamMemberId,
          assignedAt,
          dueDate,
          status: assignedAt > new Date() ? "Upcoming" : "Pending",
          financialYear,
          relatedFinancialYear: financialYear,
          servicePeriod,
          overdue: dueDate < new Date(),
        });
      };

      if (service.frequency === "Yearly") {
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
        if (isValid(assignedAt) && isValid(dueDate)) {
          tasks.push(generateTask(assignedAt, dueDate, financialYear));
        }
      } else if (service.frequency === "Monthly" && service.repetitive) {
        for (let j = 0; j < 12; j++) {
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
          if (isValid(assignedAt) && isValid(dueDate)) {
            const servicePeriod = format(
              new Date(baseYear, 3 + serviceMonth, 1),
              "MMM-yyyy"
            );
            tasks.push(generateTask(assignedAt, dueDate, servicePeriod));
          }
        }
      } else if (service.frequency === "Quarterly" && service.repetitive) {
        for (let j = 0; j < 4; j++) {
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
          if (isValid(assignedAt) && isValid(dueDate)) {
            const servicePeriod = `Q${j + 1}-${baseYear}`;
            tasks.push(generateTask(assignedAt, dueDate, servicePeriod));
          }
        }
      } else if (service.frequency === "Weekly" && service.repetitive) {
        for (let j = 0; j < 12; j++) {
          const monthIndex = 3 + j;
          const year = baseYear + Math.floor(monthIndex / 12);
          const month = monthIndex % 12;
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          service.assignmentDates.forEach((dayStr) => {
            const day = parseInt(dayStr);
            if (isNaN(day) || day < 1 || day > daysInMonth) return;
            const assignedAt = new Date(year, month, day);
            if (!isValid(assignedAt) || assignedAt > fyEndDate) return;
            const dueDate = parseServiceDate(
              service.dueDate,
              assignedAt,
              false,
              service.frequency
            );
            if (isValid(dueDate)) {
              const servicePeriod = format(assignedAt, "MMM-yyyy");
              tasks.push(generateTask(assignedAt, dueDate, servicePeriod));
            }
          });
        }
      }

      for (const task of tasks) {
        const existingTask = await Task.findOne({
          clientCode: task.clientCode,
          serviceCode: task.serviceCode,
          assignedAt: task.assignedAt,
          servicePeriod: task.servicePeriod,
          status: { $ne: "Deleted" },
        });
        if (!existingTask) {
          await task.save();
        }
      }
    }

    await new TaskHistory({
      type: "fy_regeneration",
      value: `Tasks regenerated for ${financialYear}`,
      remark: `Automated FY regeneration for ${clientServices.length} client-services`,
      userId: null,
      timestamp: new Date(),
    }).save();

    console.log(
      `Task regeneration for ${financialYear} completed successfully`
    );
  } catch (err) {
    console.error("Error in FY task regeneration:", err);
  }
};

// Schedule cron job to run on April 1st at 00:00
cron.schedule("0 0 1 4 *", regenerateTasksForNewFY, {
  timezone: "Asia/Kolkata",
});

module.exports = { regenerateTasksForNewFY };
