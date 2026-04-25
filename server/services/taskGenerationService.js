// server/services/taskGenerationService.js
// Enterprise SaaS-safe generator with:
// - per-firm scoping
// - dryRun mode
// - regeneration guard (avoid re-gen if already SUCCESS for FY)
// - audit logs (TaskGenerationRun)
// - idempotent FY roll helper
// - regenerate missing-only mode (fast repair)

const {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  getWeek,
  getYear,
  lastDayOfMonth,
  setDate,
} = require("date-fns");
const { emitFirmEvent } = require("../realtime/realtimeBus");

const Task = require("../models/Task");
const Service = require("../models/Service");
const Client = require("../models/Client");
const Team = require("../models/Team");
const ClientService = require("../models/ClientService");
const TaskGenerationRun = require("../models/TaskGenerationRun");

const pad2 = (n) => String(n).padStart(2, "0");

/* =============================== IST helpers =============================== */
function istMidnightFrom(dateLike) {
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${day}T00:00:00+05:30`);
}
function istDate(y, m0, d) {
  const mm = String(m0 + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return new Date(`${y}-${mm}-${dd}T00:00:00+05:30`);
}
function addDaysIST(baseIstMidnight, n) {
  return new Date(baseIstMidnight.getTime() + n * 86400000);
}
function addMonthsIST(baseIstMidnight, n) {
  const y = baseIstMidnight.getFullYear();
  const m = baseIstMidnight.getMonth();
  const d = baseIstMidnight.getDate();
  const ym = m + n;
  const ny = y + Math.floor(ym / 12);
  const nm = ((ym % 12) + 12) % 12;
  const last = new Date(ny, nm + 1, 0).getDate();
  const nd = Math.min(d, last);
  return istDate(ny, nm, nd);
}
function endOfMonthIST(baseIstMidnight) {
  const y = baseIstMidnight.getFullYear();
  const m = baseIstMidnight.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return istDate(y, m, last);
}
function clampToMonthDay(dateLike, desiredDay) {
  const last = lastDayOfMonth(dateLike).getDate();
  return setDate(dateLike, Math.min(desiredDay, last));
}

function parseDomDays(value) {
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
}

function parseWeeklyDueAfterDays(service) {
  const n = parseInt(service?.weeklyDueAfterDays, 10);
  return Number.isFinite(n) && n >= 0 ? n : 7;
}

function normalizeServiceFrequency(frequency) {
  const f = String(frequency || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, " ")
    .replace(/-/g, " ");

  if (f === "on demand") return "On Demand";
  if (f === "annual" || f === "yearly") return "Yearly";
  if (
    f === "half yearly" ||
    f === "six monthly" ||
    f === "semi annual" ||
    f === "semi annually"
  ) {
    return "Half-Yearly";
  }
  if (f === "quarterly") return "Quarterly";
  if (f === "monthly") return "Monthly";
  if (f === "weekly") return "Weekly";

  return String(frequency || "").trim();
}

function normalizeDueOverrides(raw) {
  if (!raw) return null;
  if (raw instanceof Map) return raw;

  const map = new Map();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const key =
        item.key || item.fy || item.financialYear || item.year || item[0];
      const val = item.value || item.date || item.dueDate || item[1];
      if (!key || !val) continue;
      const dt = new Date(val);
      if (!Number.isNaN(dt.getTime())) map.set(String(key), dt);
    }
  } else if (typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      const dt = new Date(v);
      if (!Number.isNaN(dt.getTime())) map.set(String(k), dt);
    }
  }
  return map.size ? map : null;
}

function currentFYIST(now = new Date()) {
  const d = istMidnightFrom(now);
  const y = d.getFullYear();
  const m = d.getMonth();
  const startYear = m >= 3 ? y : y - 1;
  const endYY = pad2((startYear + 1) % 100);
  return `FY ${startYear}-${endYY}`;
}

function fyStartYearFromString(fy) {
  const m = String(fy || "").match(/FY\s*(\d{4})/i);
  return m ? parseInt(m[1], 10) : null;
}

/* ============================ Audit run helpers ============================ */
async function createRun({
  firmId,
  financialYear,
  runType,
  dryRun,
  mode,
  guard,
  force,
  requestedByUserId,
  requestedByUsername,
}) {
  const doc = await TaskGenerationRun.create({
    firm: firmId,
    financialYear,
    runType,
    status: "RUNNING",
    dryRun: !!dryRun,
    mode: mode || "FULL",
    guard: !!guard,
    force: !!force,
    requestedByUserId: requestedByUserId || null,
    requestedByUsername: requestedByUsername || null,
    startedAt: new Date(),
  });
  return doc;
}
async function finishRunSuccess(runId, payload) {
  await TaskGenerationRun.findByIdAndUpdate(runId, {
    $set: { status: "SUCCESS", finishedAt: new Date(), ...payload },
  }).lean();
}
async function finishRunFailed(runId, err) {
  await TaskGenerationRun.findByIdAndUpdate(runId, {
    $set: {
      status: "FAILED",
      finishedAt: new Date(),
      error: {
        message: err?.message || "Unknown error",
        stack: err?.stack || null,
      },
    },
  }).lean();
}

class TaskGenerator {
  constructor({
    firmId,
    clientCode,
    serviceCode,
    teamMemberId,
    financialYear,
    startDate,
    endDate,
    manualDueDate = null,
    description = null,
  }) {
    this.firmId = firmId;
    this.clientCode = clientCode;
    this.serviceCode = serviceCode;
    this.teamMemberId = teamMemberId;
    this.financialYear = financialYear;
    this.startDate = istMidnightFrom(startDate || new Date());
    this.endDate = endDate ? istMidnightFrom(endDate) : null;
    if (manualDueDate) {
      const _d = istMidnightFrom(manualDueDate);
      this.manualDueDate = isNaN(_d.getTime()) ? null : _d;
    } else {
      this.manualDueDate = null;
    }
    this.description = description ? String(description).trim() : null;

    this.service = null;
    this.tasksToPlan = [];
    this.errors = [];
  }

  static async getLastSuccessRun({ firmId, financialYear, runType }) {
    return TaskGenerationRun.findOne({
      firm: firmId,
      financialYear,
      status: "SUCCESS",
      ...(runType ? { runType } : {}),
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  // opts: { firmId, financialYear?, dryRun?, guard?, force?, mode?, requestedByUserId?, requestedByUsername?, runType? }
  static async generateFromAllClientServicesForFirm(opts) {
    const {
      firmId,
      financialYear: fyIn,
      dryRun = false,
      guard = true,
      force = false,
      mode = "FULL",
      requestedByUserId,
      requestedByUsername,
      runType = "MANUAL",
    } = opts || {};

    if (!firmId) {
      const e = new Error("firmId is required");
      e.statusCode = 400;
      throw e;
    }

    const financialYear = (fyIn || currentFYIST()).toString().trim();

    if (guard && !force) {
      const last = await TaskGenerator.getLastSuccessRun({
        firmId,
        financialYear,
        runType: null,
      });
      if (last) {
        const e = new Error(
          `Generation already completed for ${financialYear}. Use force=true to re-run.`,
        );
        e.statusCode = 409;
        e.meta = {
          lastSuccessRunId: last._id,
          lastSuccessAt: last.finishedAt || last.createdAt,
        };
        throw e;
      }
    }

    const run = await createRun({
      firmId,
      financialYear,
      runType,
      dryRun,
      mode: dryRun ? "DRY_RUN" : "COMMIT",
      guard,
      force,
      requestedByUserId,
      requestedByUsername,
    });

    try {
      const [clientServices, services, clients, teamMembers] =
        await Promise.all([
          ClientService.find({
            firm: firmId,
            status: { $in: ["active", null] },
          }).lean(),
          Service.find({ firm: firmId }).lean(),
          Client.find({ firm: firmId, isDeleted: { $ne: true } })
            .select({ clientCode: 1, clientName: 1, _id: 0 })
            .lean(),
          Team.find({ firm: firmId })
            .select({ teamMemberId: 1, name: 1, _id: 0 })
            .lean(),
        ]);

      const serviceMap = new Map(services.map((s) => [s.serviceCode, s]));
      const clientNameMap = new Map(
        clients.map((c) => [c.clientCode, c.clientName]),
      );
      const teamNameMap = new Map(
        teamMembers.map((t) => [t.teamMemberId, t.name]),
      );

      const totals = {
        clientServices: clientServices.length,
        planned: 0,
        inserted: 0,
        missingInserted: 0,
        skippedByMissingOnly: 0,
        errors: 0,
      };

      const errors = [];
      const perService = {};
      const perClient = [];

      const isRollRun = runType === "FY_ROLL";
      const targetFYStartYear = fyStartYearFromString(financialYear);
      const seenInRoll = new Set();

      for (const cs of clientServices) {
        const service = serviceMap.get(cs.serviceCode);
        if (!service) {
          errors.push({
            clientCode: cs.clientCode,
            serviceCode: cs.serviceCode,
            message: "Service master not found for this firm.",
          });
          continue;
        }

        const normalizedFreq = normalizeServiceFrequency(service.frequency);

        if (normalizedFreq === "On Demand" && isRollRun) continue;

        if (isRollRun) {
          const key = `${cs.clientCode}::${cs.serviceCode}`;
          if (seenInRoll.has(key)) continue;
          seenInRoll.add(key);
        }

        const isYearly = normalizedFreq === "Yearly";

        let genFY, fyStartY;
        if (!isRollRun) {
          // Derive FY from startDate if financialYear is blank on the ClientService record
          // This allows users to specify startDate=01-Jan-2026 without needing to write FY
          let resolvedFY = cs.financialYear;
          if (!resolvedFY && cs.startDate) {
            const sd = istMidnightFrom(cs.startDate);
            const sdYear = sd.getFullYear();
            const sdMonth = sd.getMonth(); // 0-indexed
            // Indian FY: Apr–Mar. Month >= 3 (Apr) means FY starts this year.
            const fyStart = sdMonth >= 3 ? sdYear : sdYear - 1;
            resolvedFY = `FY ${fyStart}-${pad2((fyStart + 1) % 100)}`;
          }
          genFY = resolvedFY || financialYear; // final fallback to run-level FY
          fyStartY =
            fyStartYearFromString(genFY) ||
            fyStartYearFromString(financialYear) ||
            new Date().getFullYear();
        } else if (isYearly) {
          const prevFYStartYear = targetFYStartYear - 1;
          genFY = `FY ${prevFYStartYear}-${pad2((prevFYStartYear + 1) % 100)}`;
          fyStartY = prevFYStartYear;
        } else {
          genFY = financialYear;
          fyStartY = targetFYStartYear;
        }

        // ── Multi-FY generation ─────────────────────────────────────────────────
        // Generate tasks for ALL FYs from the client's startDate FY through the
        // current active FY. This ensures newly onboarded clients get tasks for
        // every year they are active, not just the FY written in the CSV.
        //
        // Example: startDate=01-Jan-2026, current FY=2026-27
        //   → generates FY 2025-26 (Jan-Mar only) + FY 2026-27 (full year)

        const csStartDate = cs.startDate
          ? istMidnightFrom(cs.startDate)
          : istDate(fyStartY, 3, 1);

        // Current FY start year (the FY we are actively running generation for)
        const currentFYStartYear =
          targetFYStartYear || fyStartYearFromString(currentFYIST());

        // Build list of FYs to generate: from csStartDate FY up to current FY
        const fysToGenerate = [];
        for (let yr = fyStartY; yr <= currentFYStartYear; yr++) {
          fysToGenerate.push({
            fyStartY: yr,
            genFY: `FY ${yr}-${pad2((yr + 1) % 100)}`,
            // Only the first FY uses csStartDate — subsequent FYs start from Apr 1
            startDate: yr === fyStartY ? csStartDate : istDate(yr, 3, 1),
          });
        }

        for (const fyEntry of fysToGenerate) {
          const gen = new TaskGenerator({
            firmId,
            clientCode: cs.clientCode,
            serviceCode: cs.serviceCode,
            teamMemberId: cs.teamMemberId,
            financialYear: fyEntry.genFY,
            startDate: fyEntry.startDate,
            endDate: cs.endDate || null,
          });

          const r = await gen.generate({ dryRun: !!dryRun, mode });

          totals.planned += r.plannedCount;
          totals.inserted += r.insertedCount;
          totals.missingInserted += r.missingInsertedCount;
          totals.skippedByMissingOnly += r.skippedByMissingOnlyCount;
          totals.errors += (r.errors || []).length;

          if (dryRun && r.plannedCount > 0) {
            perClient.push({
              clientCode: cs.clientCode,
              clientName: clientNameMap.get(cs.clientCode) || cs.clientCode,
              serviceName: service.serviceName,
              frequency: service.frequency || "",
              generatedForFY: fyEntry.genFY,
              teamMemberName:
                teamNameMap.get(cs.teamMemberId) || cs.teamMemberId || "",
              plannedTasks: r.plannedCount,
              missingTasks: r.missingInsertedCount,
              firstDueDate: gen.tasksToPlan[0]?.dueDate
                ? new Date(gen.tasksToPlan[0].dueDate).toLocaleDateString(
                    "en-IN",
                  )
                : "",
              lastDueDate: gen.tasksToPlan[gen.tasksToPlan.length - 1]?.dueDate
                ? new Date(
                    gen.tasksToPlan[gen.tasksToPlan.length - 1].dueDate,
                  ).toLocaleDateString("en-IN")
                : "",
            });
          }

          if (!perService[cs.serviceCode]) {
            perService[cs.serviceCode] = {
              serviceCode: cs.serviceCode,
              serviceName: service.serviceName,
              planned: 0,
              inserted: 0,
              clients: new Set(),
            };
          }
          perService[cs.serviceCode].planned += r.plannedCount;
          perService[cs.serviceCode].inserted += r.insertedCount;
          perService[cs.serviceCode].clients.add(cs.clientCode);

          if (r.errors?.length)
            errors.push(
              ...r.errors.map((e) => ({
                ...e,
                clientCode: cs.clientCode,
                serviceCode: cs.serviceCode,
                financialYear: fyEntry.genFY,
              })),
            );
        } // end multi-FY loop
      }

      Object.values(perService).forEach((x) => (x.clients = x.clients.size));

      await finishRunSuccess(run._id, {
        totals,
        perService: Object.values(perService),
        errors: errors.slice(0, 500),
      });

      emitFirmEvent(firmId, "task.generation.completed", {
        financialYear,
      });

      emitFirmEvent(firmId, "task.changed", {
        financialYear,
      });

      return {
        runId: run._id,
        financialYear,
        dryRun: !!dryRun,
        mode,
        totals,
        perService: Object.values(perService),
        perClient: dryRun
          ? perClient.sort(
              (a, b) =>
                a.clientName.localeCompare(b.clientName) ||
                a.serviceName.localeCompare(b.serviceName),
            )
          : [],
        errors,
      };
    } catch (err) {
      await finishRunFailed(run._id, err);
      throw err;
    }
  }

  static async idempotentFyRollForFirm({
    firmId,
    financialYear,
    dryRun = false,
    force = false,
    requestedByUserId,
    requestedByUsername,
  }) {
    const fy = financialYear || currentFYIST(new Date());

    return TaskGenerator.generateFromAllClientServicesForFirm({
      firmId,
      financialYear: fy,
      dryRun,
      guard: true,
      force: !!force,
      mode: "MISSING_ONLY",
      runType: "FY_ROLL",
      requestedByUserId,
      requestedByUsername,
    });
  }

  async generate({ dryRun = false, mode = "FULL" } = {}) {
    this.service = await Service.findOne({
      firm: this.firmId,
      serviceCode: this.serviceCode,
    }).lean();
    if (!this.service) {
      this.errors.push({
        message: `Service ${this.serviceCode} not found in master for this firm.`,
      });
      return {
        plannedCount: 0,
        insertedCount: 0,
        missingInsertedCount: 0,
        skippedByMissingOnlyCount: 0,
        errors: this.errors,
      };
    }

    this.service.dueOverrides = normalizeDueOverrides(
      this.service.dueOverrides,
    );

    const dom = parseDomDays(this.service.assignmentDaysOfMonth);
    const wDue = parseWeeklyDueAfterDays(this.service);
    const fyStartYear = fyStartYearFromString(this.financialYear);

    if (normalizeServiceFrequency(this.service.frequency) === "On Demand")
      this._planOnDemand();
    else this._planRepetitive(fyStartYear, dom, wDue);

    if (!this.tasksToPlan.length) {
      return {
        plannedCount: 0,
        insertedCount: 0,
        missingInsertedCount: 0,
        skippedByMissingOnlyCount: 0,
        errors: this.errors,
      };
    }

    let toInsert = this.tasksToPlan;
    let skipped = 0;

    if (mode === "MISSING_ONLY") {
      const periodKeys = [...new Set(toInsert.map((t) => t.periodKey))];
      const existing = new Set();
      const chunkSize = 500;

      for (let i = 0; i < periodKeys.length; i += chunkSize) {
        const chunk = periodKeys.slice(i, i + chunkSize);
        const docs = await Task.find(
          {
            firm: this.firmId,
            clientCode: this.clientCode,
            serviceCode: this.serviceCode,
            periodKey: { $in: chunk },
          },
          { periodKey: 1, _id: 0 },
        ).lean();
        for (const d of docs) existing.add(d.periodKey);
      }

      toInsert = toInsert.filter((t) => !existing.has(t.periodKey));
      skipped = this.tasksToPlan.length - toInsert.length;
    }

    if (dryRun) {
      return {
        plannedCount: this.tasksToPlan.length,
        insertedCount: 0,
        missingInsertedCount: toInsert.length,
        skippedByMissingOnlyCount: skipped,
        errors: this.errors,
      };
    }

    const inserted = await this._bulkUpsertInsertOnly(toInsert);

    return {
      plannedCount: this.tasksToPlan.length,
      insertedCount: inserted,
      missingInsertedCount: toInsert.length,
      skippedByMissingOnlyCount: skipped,
      errors: this.errors,
    };
  }

  _planOnDemand() {
    const assignedAt = this.startDate;
    const dueAfter = Number.isFinite(
      Number(this.service?.onDemand?.dueAfterDays),
    )
      ? Math.max(0, Number(this.service.onDemand.dueAfterDays))
      : 7;
    const dueDate = this.manualDueDate || addDaysIST(assignedAt, dueAfter);
    const dueDateSource = this.manualDueDate ? "MANUAL" : "RULE";
    const periodKey = `OD-${assignedAt.getFullYear()}-${pad2(
      assignedAt.getMonth() + 1,
    )}-${pad2(assignedAt.getDate())}`;

    this.tasksToPlan.push(
      this._payload({
        assignedAt,
        dueDate,
        servicePeriod: "On-Demand",
        periodKey,
        periodStart: assignedAt,
        periodEnd: assignedAt,
        dueDateSource,
      }),
    );
  }

  _planRepetitive(fyStartYear, domDays, weeklyDueAfterDays) {
    const normalizedFrequency = normalizeServiceFrequency(
      this.service.frequency,
    );
    const periods = this._periodsForFY(fyStartYear, normalizedFrequency);
    const mappingStart = istMidnightFrom(this.startDate);
    const mappingEnd = this.endDate ? istMidnightFrom(this.endDate) : null;

    for (const p of periods) {
      if (istMidnightFrom(p.periodEnd) < mappingStart) continue;
      if (mappingEnd && istMidnightFrom(p.periodStart) > mappingEnd) continue;

      const isWeekly = normalizedFrequency === "Weekly";
      const useDomWeekly = isWeekly && domDays.length > 0;

      if (useDomWeekly) {
        const assignedAt = istMidnightFrom(p.periodStart);
        const dueDate = addDaysIST(assignedAt, weeklyDueAfterDays);
        this.tasksToPlan.push(
          this._payload({
            assignedAt,
            dueDate,
            servicePeriod: p.servicePeriod,
            periodKey: p.periodKey,
            periodStart: p.periodStart,
            periodEnd: p.periodEnd,
            dueDateSource: "RULE",
          }),
        );
        continue;
      }

      const { assignedAt, dueDate, dueDateSource } = this._datesFromRules(p);
      if (!assignedAt || !dueDate) continue;

      this.tasksToPlan.push(
        this._payload({
          assignedAt,
          dueDate,
          servicePeriod: p.servicePeriod,
          periodKey: p.periodKey,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          dueDateSource,
        }),
      );
    }
  }

  _datesFromRules(period) {
    const dueRule = this.service?.dueRule;
    const assignmentRule = this.service?.assignmentRule;
    if (!dueRule || !assignmentRule) {
      this.errors.push({
        message: `Missing dueRule/assignmentRule for ${this.serviceCode}`,
      });
      return {};
    }

    const dueAnchor =
      dueRule.anchor === "periodStart" ? period.periodStart : period.periodEnd;
    const dueBase = addMonthsIST(
      istMidnightFrom(dueAnchor),
      dueRule.offsetMonths || 0,
    );
    let dueDate = clampToMonthDay(dueBase, dueRule.dayOfMonth);

    let dueDateSource = "RULE";
    if (
      this.service?.dueOverrides instanceof Map &&
      this.service.dueOverrides.has(this.financialYear)
    ) {
      const ov = this.service.dueOverrides.get(this.financialYear);
      if (ov instanceof Date && !Number.isNaN(ov.getTime())) {
        dueDate = istMidnightFrom(ov);
        dueDateSource = "OVERRIDE";
      }
    }

    let assignmentAnchor;
    if (assignmentRule.anchor === "dueDate") assignmentAnchor = dueDate;
    else if (assignmentRule.anchor === "periodStart")
      assignmentAnchor = period.periodStart;
    else assignmentAnchor = period.periodEnd;

    const assignedAt = addDaysIST(
      istMidnightFrom(assignmentAnchor),
      assignmentRule.offsetDays || 0,
    );
    return { assignedAt, dueDate, dueDateSource };
  }

  _payload({
    assignedAt,
    dueDate,
    servicePeriod,
    periodKey,
    periodStart,
    periodEnd,
    dueDateSource,
  }) {
    const now = new Date();
    return {
      firm: this.firmId,
      clientCode: this.clientCode,
      serviceCode: this.service.serviceCode,
      serviceName: this.service.serviceName,
      teamMemberId: this.teamMemberId,
      assignedAt,
      dueDate,
      status: assignedAt > now ? "Upcoming" : "Pending",
      financialYear: this.financialYear,
      relatedFinancialYear: currentFYIST(dueDate),
      servicePeriod,
      periodKey,
      periodStart,
      periodEnd,
      overdue: dueDate < now && assignedAt <= now,
      priority: this.service.priority || "Medium",
      dueDateSource: dueDateSource || "RULE",
      ...(this.description ? { description: this.description } : {}),
    };
  }

  async _bulkUpsertInsertOnly(tasks) {
    if (!tasks.length) return 0;

    const ops = tasks.map((t) => ({
      updateOne: {
        filter: {
          firm: t.firm,
          clientCode: t.clientCode,
          serviceCode: t.serviceCode,
          periodKey: t.periodKey,
        },
        update: { $setOnInsert: t },
        upsert: true,
      },
    }));

    const result = await Task.bulkWrite(ops, { ordered: false });
    return result.upsertedCount || 0;
  }

  _periodsForFY(fyStartYear, frequency) {
    const startY = Number.isFinite(fyStartYear)
      ? fyStartYear
      : new Date().getFullYear();

    const normalizedFrequency = normalizeServiceFrequency(frequency);
    const fyLabel = `FY ${startY}-${pad2((startY + 1) % 100)}`;
    const fyKeyBase = `FY${startY}-${pad2((startY + 1) % 100)}`;

    const fyStart = istDate(startY, 3, 1);
    const fyEnd = istDate(startY + 1, 2, 31);

    const periods = [];

    if (normalizedFrequency === "Yearly") {
      periods.push({
        periodStart: fyStart,
        periodEnd: fyEnd,
        servicePeriod: fyLabel,
        periodKey: fyKeyBase,
      });
      return periods;
    }

    if (normalizedFrequency === "Half-Yearly") {
      periods.push({
        periodStart: istDate(startY, 3, 1),
        periodEnd: istDate(startY, 8, 30),
        servicePeriod: `${fyLabel} H1`,
        periodKey: `${fyKeyBase}-H1`,
      });

      periods.push({
        periodStart: istDate(startY, 9, 1),
        periodEnd: istDate(startY + 1, 2, 31),
        servicePeriod: `${fyLabel} H2`,
        periodKey: `${fyKeyBase}-H2`,
      });

      return periods;
    }

    if (normalizedFrequency === "Quarterly") {
      const q = [
        { y: startY, m0: 3, label: "Q1" },
        { y: startY, m0: 6, label: "Q2" },
        { y: startY, m0: 9, label: "Q3" },
        { y: startY + 1, m0: 0, label: "Q4" },
      ];

      for (const item of q) {
        const ps = istDate(item.y, item.m0, 1);
        const pe =
          item.label === "Q4"
            ? fyEnd
            : endOfMonthIST(istDate(item.y, item.m0 + 2, 1));

        periods.push({
          periodStart: ps,
          periodEnd: pe,
          servicePeriod: `${fyLabel} ${item.label}`,
          periodKey: `${fyKeyBase}-${item.label}`,
        });
      }
      return periods;
    }

    if (normalizedFrequency === "Monthly") {
      for (let i = 0; i < 12; i++) {
        const m0 = (3 + i) % 12;
        const y = m0 >= 3 ? startY : startY + 1;
        const ps = istDate(y, m0, 1);
        const pe = endOfMonthIST(ps);

        periods.push({
          periodStart: ps,
          periodEnd: pe,
          servicePeriod: format(ps, "MMM-yyyy"),
          periodKey: `${ps.getFullYear()}-${pad2(ps.getMonth() + 1)}`,
        });
      }
      return periods;
    }

    if (normalizedFrequency === "Weekly") {
      let cursor = fyStart;

      while (cursor <= fyEnd) {
        const ws = startOfWeek(cursor, { weekStartsOn: 1 });
        const we = endOfWeek(cursor, { weekStartsOn: 1 });
        const wk = getWeek(ws, { weekStartsOn: 1 });
        const yr = getYear(ws);

        periods.push({
          periodStart: istMidnightFrom(ws),
          periodEnd: istMidnightFrom(we),
          servicePeriod: `Block ${format(ws, "dd-MMM-yyyy")} → ${format(
            we,
            "dd-MMM-yyyy",
          )}`,
          periodKey: `W-${yr}-${pad2(wk)}`,
        });

        cursor = addWeeks(cursor, 1);
      }

      return periods;
    }

    return periods;
  }
}

TaskGenerator.generateFromAllClientServices = async (firmId) =>
  TaskGenerator.generateFromAllClientServicesForFirm({ firmId });

module.exports = TaskGenerator;
