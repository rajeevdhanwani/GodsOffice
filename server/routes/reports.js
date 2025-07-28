const express = require("express");
const mongoose = require("mongoose");
const { Parser } = require("json2csv");
const Client = require("../models/Client");
const Task = require("../models/Task");
const Invoice = require("../models/Invoice");
const Team = require("../models/Team");
const Record = require("../models/Record");
const Service = require("../models/Service");
const ReportCache = require("../models/ReportCache");
const Report = require("../models/Report");

const router = express.Router();

// --- ENHANCED AI INSIGHTS GENERATION HELPERS ---

// Enhanced utility function to format currency for insights
const formatCurrencyForInsight = (amount) => {
  if (typeof amount !== "number") {
    amount = parseFloat(amount) || 0;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Advanced AI insights with natural language generation
const generateAdvancedInsights = (data, reportType, additionalContext = {}) => {
  const insights = [];
  const { timeframe = "3 months", businessContext = "office automation" } =
    additionalContext;

  switch (reportType) {
    case "client_portfolio":
      insights.push(...generateClientPortfolioInsights(data, timeframe));
      break;
    case "team_performance":
      insights.push(...generateTeamPerformanceInsights(data, timeframe));
      break;
    case "task_status":
      insights.push(...generateTaskStatusInsights(data, timeframe));
      break;
    case "revenue_analysis":
      insights.push(...generateRevenueAnalysisInsights(data, timeframe));
      break;
    case "service_analysis":
      insights.push(...generateServiceAnalysisInsights(data, timeframe));
      break;
    default:
      insights.push("Advanced AI analysis completed for this report type.");
  }

  return insights;
};

// Predictive analytics functions
const generatePredictiveInsights = (data, reportType) => {
  const predictions = [];

  switch (reportType) {
    case "revenue_analysis":
      if (data.monthlyTrend && data.monthlyTrend.length >= 3) {
        const recentRevenue = data.monthlyTrend.slice(-3).map((m) => m.total);
        const avgGrowth =
          recentRevenue.reduce((sum, rev, idx) => {
            if (idx === 0) return 0;
            return (
              sum + (rev - recentRevenue[idx - 1]) / recentRevenue[idx - 1]
            );
          }, 0) /
          (recentRevenue.length - 1);

        const nextMonthPrediction =
          recentRevenue[recentRevenue.length - 1] * (1 + avgGrowth);
        predictions.push({
          type: "forecast",
          title: "Revenue Forecast",
          description: `Based on recent trends, next month's revenue is predicted to be ${formatCurrencyForInsight(
            nextMonthPrediction
          )} (${(avgGrowth * 100).toFixed(1)}% ${
            avgGrowth > 0 ? "growth" : "decline"
          }).`,
          confidence: Math.min(85, 60 + recentRevenue.length * 5),
          impact:
            avgGrowth > 0.1 ? "high" : avgGrowth < -0.1 ? "high" : "medium",
          priority: avgGrowth < -0.05 ? "high" : "medium",
          actionable: true,
        });
      }
      break;

    case "team_performance":
      if (data.teamReports && data.teamReports.length > 0) {
        const lowPerformers = data.teamReports.filter(
          (t) => t.performance.completionRate < 70
        );
        if (lowPerformers.length > 0) {
          predictions.push({
            type: "risk",
            title: "Performance Risk Alert",
            description: `${lowPerformers.length} team member(s) showing performance decline. Intervention recommended within 2 weeks to prevent project delays.`,
            confidence: 78,
            impact: "high",
            priority: "urgent",
            actionable: true,
          });
        }
      }
      break;
  }

  return predictions;
};

// Anomaly detection function
const detectAnomalies = (data, reportType) => {
  const anomalies = [];

  switch (reportType) {
    case "revenue_analysis":
      if (data.monthlyTrend && data.monthlyTrend.length >= 6) {
        const revenues = data.monthlyTrend.map((m) => m.total);
        const mean =
          revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
        const stdDev = Math.sqrt(
          revenues.reduce((sum, rev) => sum + Math.pow(rev - mean, 2), 0) /
            revenues.length
        );

        revenues.forEach((revenue, idx) => {
          const zScore = Math.abs((revenue - mean) / stdDev);
          if (zScore > 2) {
            // Significant deviation
            anomalies.push({
              type: "anomaly",
              title: "Revenue Anomaly Detected",
              description: `${
                data.monthlyTrend[idx].month
              } shows unusual revenue pattern (${zScore.toFixed(
                1
              )} standard deviations from norm). Investigation recommended.`,
              confidence: Math.min(95, 70 + zScore * 10),
              impact: zScore > 3 ? "critical" : "high",
              priority: "high",
              actionable: true,
            });
          }
        });
      }
      break;

    case "task_status":
      if (data.summary && data.summary.overdueRate > 20) {
        anomalies.push({
          type: "anomaly",
          title: "High Overdue Rate Detected",
          description: `Current overdue rate of ${data.summary.overdueRate}% is significantly above normal thresholds. Immediate attention required.`,
          confidence: 92,
          impact: "critical",
          priority: "urgent",
          actionable: true,
        });
      }
      break;
  }

  return anomalies;
};

// Enhanced existing insight functions
const generateClientPortfolioInsights = (data, timeframe = "3 months") => {
  const insights = [];
  const { summary, portfolioReports } = data;

  if (summary.totalClients === 0) {
    return [
      "📊 No client data available for analysis. Consider onboarding new clients to generate meaningful insights.",
    ];
  }

  // Revenue concentration analysis
  if (portfolioReports && portfolioReports.length > 0) {
    const sortedByRevenue = [...portfolioReports].sort(
      (a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue
    );
    const top20Percent = Math.ceil(sortedByRevenue.length * 0.2);
    const top20Revenue = sortedByRevenue
      .slice(0, top20Percent)
      .reduce((sum, client) => sum + client.metrics.totalRevenue, 0);
    const revenueConcentration = (top20Revenue / summary.totalRevenue) * 100;

    if (revenueConcentration > 80) {
      insights.push(
        `⚠️ High revenue concentration risk: Top 20% of clients contribute ${revenueConcentration.toFixed(
          1
        )}% of total revenue. Consider diversifying client base.`
      );
    } else if (revenueConcentration < 60) {
      insights.push(
        `✅ Healthy revenue distribution: Top 20% of clients contribute ${revenueConcentration.toFixed(
          1
        )}% of revenue, indicating good diversification.`
      );
    }

    // Client growth potential
    const lowUtilizationClients = portfolioReports.filter(
      (p) => p.metrics.totalTasks < 5 && p.metrics.totalRevenue > 0
    );

    if (lowUtilizationClients.length > 0) {
      insights.push(
        `💡 Growth opportunity: ${lowUtilizationClients.length} clients have low task volume but existing revenue. Potential for service expansion.`
      );
    }

    // Performance insights
    const highPerformanceClients = portfolioReports.filter(
      (p) => p.metrics.completionRate >= 90
    );
    if (highPerformanceClients.length > 0) {
      insights.push(
        `🌟 Excellence indicator: ${highPerformanceClients.length} clients maintain 90%+ completion rates, showcasing operational efficiency.`
      );
    }
  }

  insights.push(
    `📈 Portfolio summary: Managing ${
      summary.totalClients
    } clients with ${formatCurrencyForInsight(
      summary.totalRevenue
    )} total revenue across ${
      summary.totalTasks
    } tasks over the last ${timeframe}.`
  );

  return insights;
};

const generateTeamPerformanceInsights = (data, timeframe = "3 months") => {
  const insights = [];
  const { summary, teamReports } = data;

  if (summary.totalTeamMembers === 0) {
    return ["👥 No team performance data available for analysis."];
  }

  // Performance distribution analysis
  if (teamReports && teamReports.length > 0) {
    const completionRates = teamReports.map(
      (t) => t.performance.completionRate
    );
    const avgRate =
      completionRates.reduce((sum, rate) => sum + rate, 0) /
      completionRates.length;
    const highPerformers = teamReports.filter(
      (t) => t.performance.completionRate >= avgRate + 10
    );
    const lowPerformers = teamReports.filter(
      (t) => t.performance.completionRate <= avgRate - 15
    );

    if (highPerformers.length > 0) {
      insights.push(
        `🏆 Top performers identified: ${highPerformers
          .map((t) => t.teamMember.name)
          .join(
            ", "
          )} exceed average performance by 10%+. Consider them for mentoring roles.`
      );
    }

    if (lowPerformers.length > 0) {
      insights.push(
        `📚 Development opportunity: ${lowPerformers.length} team member(s) could benefit from additional training or support to improve completion rates.`
      );
    }

    // Workload distribution
    const taskCounts = teamReports.map((t) => t.performance.totalTasks);
    const maxTasks = Math.max(...taskCounts);
    const minTasks = Math.min(...taskCounts);
    const workloadImbalance =
      maxTasks > 0 ? ((maxTasks - minTasks) / maxTasks) * 100 : 0;

    if (workloadImbalance > 50) {
      insights.push(
        `⚖️ Workload imbalance detected: Task distribution variance of ${workloadImbalance.toFixed(
          1
        )}%. Consider redistributing for better efficiency.`
      );
    }

    // Revenue contribution analysis
    const totalAttributedRevenue = teamReports.reduce(
      (sum, t) => sum + t.performance.attributedRevenue,
      0
    );
    if (totalAttributedRevenue > 0) {
      const topRevenueContributor = teamReports.reduce((top, current) =>
        current.performance.attributedRevenue >
        top.performance.attributedRevenue
          ? current
          : top
      );
      insights.push(
        `💰 Revenue leader: ${
          topRevenueContributor.teamMember.name
        } contributed ${formatCurrencyForInsight(
          topRevenueContributor.performance.attributedRevenue
        )} in attributed revenue.`
      );
    }
  }

  insights.push(
    `👥 Team overview: ${summary.totalTeamMembers} active members with ${
      summary.avgCompletionRate
    }% average completion rate, generating ${formatCurrencyForInsight(
      summary.totalRevenue
    )} in total revenue.`
  );

  return insights;
};

const generateTaskStatusInsights = (data, timeframe = "3 months") => {
  const insights = [];
  const { summary, serviceBreakdown, monthlyTrend } = data;

  if (summary.totalTasks === 0) {
    return ["📋 No task data available for the selected period."];
  }

  // Completion rate analysis
  if (summary.completionRate >= 85) {
    insights.push(
      `✅ Excellent completion rate of ${summary.completionRate}% indicates strong project management and team efficiency.`
    );
  } else if (summary.completionRate < 70) {
    insights.push(
      `⚠️ Completion rate of ${summary.completionRate}% is below optimal. Review task assignment and resource allocation processes.`
    );
  }

  // Overdue analysis
  if (summary.overdueRate > 15) {
    insights.push(
      `🚨 Critical alert: ${summary.overdueRate}% overdue rate requires immediate intervention to prevent client dissatisfaction.`
    );
  } else if (summary.overdueRate < 5) {
    insights.push(
      `🎯 Outstanding time management: Only ${summary.overdueRate}% of tasks are overdue, demonstrating excellent planning.`
    );
  }

  // Service-specific insights
  if (serviceBreakdown && serviceBreakdown.length > 0) {
    const problematicServices = serviceBreakdown.filter(
      (s) => s.completionRate < 70 && s.total > 5
    );
    if (problematicServices.length > 0) {
      insights.push(
        `🔧 Service optimization needed: ${problematicServices[0].serviceName} shows ${problematicServices[0].completionRate}% completion rate. Consider process review.`
      );
    }

    const excellentServices = serviceBreakdown.filter(
      (s) => s.completionRate >= 95 && s.total > 3
    );
    if (excellentServices.length > 0) {
      insights.push(
        `🌟 Best practice identified: ${excellentServices[0].serviceName} achieves ${excellentServices[0].completionRate}% completion rate. Model for other services.`
      );
    }
  }

  // Trend analysis
  if (monthlyTrend && monthlyTrend.length >= 3) {
    const recentMonths = monthlyTrend.slice(-3);
    const completionTrend = recentMonths.map((m) =>
      m.total > 0 ? (m.completed / m.total) * 100 : 0
    );
    const isImproving = completionTrend[2] > completionTrend[0];

    if (isImproving) {
      insights.push(
        `📈 Positive trend: Task completion efficiency has improved over the last 3 months, indicating effective process optimization.`
      );
    } else {
      insights.push(
        `📉 Attention needed: Task completion trend shows decline. Review recent changes in processes or team capacity.`
      );
    }
  }

  insights.push(
    `📊 Task summary: ${summary.totalTasks} tasks analyzed with ${summary.completionRate}% completion rate and ${summary.overdueRate}% overdue rate over ${timeframe}.`
  );

  return insights;
};

const generateRevenueAnalysisInsights = (data, timeframe = "3 months") => {
  const insights = [];
  const { summary, topClients, monthlyTrend, serviceRevenue } = data;

  if (summary.totalRevenue === 0) {
    return ["💰 No revenue data available for the selected period."];
  }

  // Collection efficiency analysis
  if (summary.collectionEfficiency >= 90) {
    insights.push(
      `💎 Excellent collection efficiency of ${summary.collectionEfficiency}% demonstrates strong financial management and client relationships.`
    );
  } else if (summary.collectionEfficiency < 75) {
    insights.push(
      `💳 Collection efficiency of ${summary.collectionEfficiency}% needs improvement. Consider reviewing payment terms and follow-up processes.`
    );
  }

  // Revenue concentration risk
  if (topClients && topClients.length > 0) {
    const top3Revenue = topClients
      .slice(0, 3)
      .reduce((sum, client) => sum + client.totalRevenue, 0);
    const concentrationRisk = (top3Revenue / summary.totalRevenue) * 100;

    if (concentrationRisk > 60) {
      insights.push(
        `⚠️ High client dependency: Top 3 clients represent ${concentrationRisk.toFixed(
          1
        )}% of revenue. Diversification recommended to reduce risk.`
      );
    }

    // Payment behavior insights
    const problematicPayors = topClients.filter(
      (c) => c.paymentRate < 80 && c.totalRevenue > summary.totalRevenue * 0.05
    );
    if (problematicPayors.length > 0) {
      insights.push(
        `💼 Payment attention required: ${problematicPayors[0].clientName} has ${problematicPayors[0].paymentRate}% payment rate despite significant revenue contribution.`
      );
    }
  }

  // Monthly trend analysis
  if (monthlyTrend && monthlyTrend.length >= 3) {
    const revenues = monthlyTrend.map((m) => m.total);
    const growthRates = revenues
      .slice(1)
      .map((rev, idx) =>
        revenues[idx] > 0 ? ((rev - revenues[idx]) / revenues[idx]) * 100 : 0
      );
    const avgGrowth =
      growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;

    if (avgGrowth > 5) {
      insights.push(
        `📈 Strong growth trajectory: Average monthly growth of ${avgGrowth.toFixed(
          1
        )}% indicates healthy business expansion.`
      );
    } else if (avgGrowth < -5) {
      insights.push(
        `📉 Revenue decline: Average monthly decline of ${Math.abs(
          avgGrowth
        ).toFixed(1)}% requires strategic review and corrective action.`
      );
    }
  }

  // Service revenue insights
  if (serviceRevenue && serviceRevenue.length > 0) {
    const topService = serviceRevenue[0];
    const serviceContribution =
      (topService.totalRevenue / summary.totalRevenue) * 100;
    insights.push(
      `🏅 Revenue driver: '${
        topService.serviceName
      }' contributes ${serviceContribution.toFixed(
        1
      )}% of total revenue with ${formatCurrencyForInsight(
        topService.totalRevenue
      )}.`
    );
  }

  insights.push(
    `💰 Revenue overview: ${formatCurrencyForInsight(
      summary.totalRevenue
    )} total revenue with ${
      summary.collectionEfficiency
    }% collection efficiency across ${
      summary.totalInvoices
    } invoices in ${timeframe}.`
  );

  return insights;
};

const generateServiceAnalysisInsights = (data, timeframe = "3 months") => {
  const insights = [];
  const { summary, serviceReports } = data;

  if (summary.totalServices === 0) {
    return ["🔧 No service data available for analysis."];
  }

  if (serviceReports && serviceReports.length > 0) {
    // Service performance distribution
    const highPerformingServices = serviceReports.filter(
      (s) => s.completionRate >= 90 && s.totalTasks > 3
    );
    const underperformingServices = serviceReports.filter(
      (s) => s.completionRate < 70 && s.totalTasks > 5
    );

    if (highPerformingServices.length > 0) {
      insights.push(
        `🌟 Service excellence: ${highPerformingServices
          .map((s) => s.serviceName)
          .join(", ")} maintain 90%+ completion rates.`
      );
    }

    if (underperformingServices.length > 0) {
      insights.push(
        `🔧 Improvement opportunities: ${underperformingServices[0].serviceName} (${underperformingServices[0].completionRate}% completion) needs process optimization.`
      );
    }

    // Client penetration analysis
    const servicesWithHighPenetration = serviceReports.filter(
      (s) => s.uniqueClients > 10
    );
    if (servicesWithHighPenetration.length > 0) {
      insights.push(
        `🎯 Market leaders: ${servicesWithHighPenetration[0].serviceName} serves ${servicesWithHighPenetration[0].uniqueClients} unique clients, indicating strong market acceptance.`
      );
    }

    // Efficiency insights
    const servicesWithFastCompletion = serviceReports.filter(
      (s) => s.avgCompletionDays > 0 && s.avgCompletionDays < 7
    );
    if (servicesWithFastCompletion.length > 0) {
      insights.push(
        `⚡ Quick turnaround: ${servicesWithFastCompletion[0].serviceName} averages ${servicesWithFastCompletion[0].avgCompletionDays} days completion time.`
      );
    }
  }

  insights.push(
    `🔧 Service portfolio: ${summary.totalServices} active services with ${summary.avgCompletionRate}% average completion rate. '${summary.mostPopularService}' leads in demand.`
  );

  return insights;
};

// Natural Language Query Processing (Simplified)
const processNaturalLanguageQuery = async (query, userId) => {
  try {
    const lowercaseQuery = query.toLowerCase();
    let response = "I understand you're asking about ";

    // Simple keyword matching - in production, use more sophisticated NLP
    if (
      lowercaseQuery.includes("revenue") ||
      lowercaseQuery.includes("money") ||
      lowercaseQuery.includes("income")
    ) {
      response +=
        "revenue data. Let me fetch the latest revenue analysis for you.";
      return { type: "revenue-analysis", response };
    } else if (
      lowercaseQuery.includes("team") ||
      lowercaseQuery.includes("employee") ||
      lowercaseQuery.includes("staff")
    ) {
      response += "team performance. I'll get the current team metrics.";
      return { type: "team-performance", response };
    } else if (
      lowercaseQuery.includes("client") ||
      lowercaseQuery.includes("customer")
    ) {
      response += "client information. Here's the client portfolio analysis.";
      return { type: "client-portfolio", response };
    } else if (
      lowercaseQuery.includes("task") ||
      lowercaseQuery.includes("project") ||
      lowercaseQuery.includes("work")
    ) {
      response += "task status. Let me show you the current task dashboard.";
      return { type: "task-status", response };
    } else {
      response +=
        "business data. I'll provide a comprehensive dashboard overview.";
      return { type: "dashboard", response };
    }
  } catch (err) {
    console.error("NLP Query processing error:", err);
    return {
      type: "error",
      response:
        "I'm having trouble understanding your question. Please try rephrasing or use specific keywords like 'revenue', 'team', 'clients', or 'tasks'.",
    };
  }
};

// Authentication middleware (enhanced)
const auth = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({
      message: "No authorization header provided. Access denied.",
      code: "NO_AUTH_HEADER",
    });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({
      message: "No token provided or invalid format. Access denied.",
      code: "INVALID_TOKEN_FORMAT",
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
    return res.status(401).json({
      message: "Token verification failed. Access denied.",
      code: "TOKEN_VERIFICATION_FAILED",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Utility function to format currency
const formatCurrency = (amount) => {
  if (typeof amount !== "number") {
    amount = parseFloat(amount) || 0;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Enhanced utility function to get date range filter
const getDateFilter = (startDate, endDate, dateField = "createdAt") => {
  const filter = {};
  if (startDate) {
    filter[dateField] = { $gte: new Date(startDate) };
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter[dateField] = { ...filter[dateField], $lte: end };
  }
  return filter;
};

// Error handling wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Performance monitoring middleware
const performanceMonitor = (reportType) => (req, res, next) => {
  req.startTime = Date.now();
  req.reportType = reportType;
  next();
};

// ========================================
// NEW: NATURAL LANGUAGE QUERY ENDPOINT
// ========================================

router.post(
  "/ai/query",
  auth,
  asyncHandler(async (req, res) => {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        message: "Query is required and must be a string",
        example: "Show me revenue for last 3 months",
      });
    }

    const startTime = Date.now();
    const result = await processNaturalLanguageQuery(query, req.user.id);
    const processingTime = Date.now() - startTime;

    res.json({
      query,
      understanding: result.response,
      suggestedReport: result.type,
      processingTime,
      timestamp: new Date().toISOString(),
    });
  })
);

// ========================================
// NEW: AI INSIGHTS ENDPOINT
// ========================================

router.get(
  "/ai/insights",
  auth,
  asyncHandler(async (req, res) => {
    const { reportType, timeframe = "3 months" } = req.query;

    try {
      // This would be replaced with actual AI service in production
      const insights = {
        general: [
          "📊 Your business shows strong growth patterns in client acquisition.",
          "💡 Recommended focus: Improve task completion rates for better client satisfaction.",
          "🎯 Opportunity identified: Revenue optimization through service diversification.",
        ],
        predictive: [
          "📈 Forecasted 15% revenue growth next quarter based on current trends.",
          "⚠️ Potential bottleneck detected in Q4 due to increased task volume.",
          "🔮 Client retention rate expected to improve by 8% with current service quality.",
        ],
        recommendations: [
          "🚀 Consider hiring additional team members for high-demand services.",
          "💼 Implement automated follow-up for overdue payments to improve cash flow.",
          "📱 Mobile app development could improve client engagement by 25%.",
        ],
      };

      res.json({
        insights,
        generatedAt: new Date().toISOString(),
        timeframe,
        confidence: 85,
        aiModel: "enhanced-insights-v2.0",
      });
    } catch (err) {
      console.error("AI Insights error:", err);
      res
        .status(500)
        .json({ message: "Error generating AI insights", error: err.message });
    }
  })
);

// ========================================
// CLIENT-WISE REPORTS (Enhanced)
// ========================================

// Client Portfolio Report
router.get(
  "/client-reports/portfolio",
  auth,
  performanceMonitor("client-portfolio"),
  asyncHandler(async (req, res) => {
    const { clientCode, startDate, endDate } = req.query;
    const reportId = "client-portfolio";
    const filters = { clientCode, startDate, endDate };
    const startTime = Date.now();

    // Check cache
    try {
      const cachedData = await ReportCache.getCachedData(reportId, filters);
      if (cachedData) {
        console.log("✅ Serving client portfolio from cache");
        return res.json(cachedData);
      }
    } catch (cacheErr) {
      console.error("Cache retrieval error:", cacheErr);
    }

    let clientFilter = {};
    if (clientCode) {
      clientFilter.clientCode = new RegExp(clientCode, "i");
    }

    const clients = await Client.find(clientFilter);

    const portfolioReports = await Promise.all(
      clients.map(async (client) => {
        const dateFilter = getDateFilter(startDate, endDate, "assignedAt");

        // Get tasks for this client
        const tasks = await Task.find({
          clientCode: client.clientCode,
          ...dateFilter,
        });

        // Get invoices for this client
        const invoices = await Invoice.find({
          clientCode: client.clientCode,
          ...getDateFilter(startDate, endDate, "invoiceDate"),
        });

        // Get records for this client
        const records = await Record.find({
          clientCode: client.clientCode,
          ...getDateFilter(startDate, endDate, "timestamp"),
        });

        // Calculate metrics
        const totalRevenue = invoices.reduce(
          (sum, inv) => sum + (inv.totalAmount || 0),
          0
        );
        const paidRevenue = invoices
          .filter(
            (inv) => inv.paymentStatus === "Paid" || inv.status === "Paid"
          )
          .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

        const taskStats = {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === "Completed").length,
          pending: tasks.filter((t) => t.status === "Pending").length,
          overdue: tasks.filter((t) => t.overdue).length,
        };

        // Get unique services
        const uniqueServices = [...new Set(tasks.map((t) => t.serviceName))];

        // Get team members involved
        const teamMemberIds = [...new Set(tasks.map((t) => t.teamMemberId))];
        const teamMembers = await Team.find({
          teamMemberId: { $in: teamMemberIds },
        });

        return {
          client: {
            clientCode: client.clientCode,
            clientName: client.clientName,
            firmName: client.firmName || "N/A",
            withUsSince: client.withUsSince,
          },
          metrics: {
            totalRevenue: totalRevenue,
            paidRevenue: paidRevenue,
            outstandingAmount: totalRevenue - paidRevenue,
            totalTasks: taskStats.total,
            completedTasks: taskStats.completed,
            pendingTasks: taskStats.pending,
            overdueTasks: taskStats.overdue,
            completionRate:
              taskStats.total > 0
                ? Math.round((taskStats.completed / taskStats.total) * 100)
                : 0,
          },
          services: uniqueServices,
          teamMembers: teamMembers.map((tm) => ({
            id: tm.teamMemberId,
            name: tm.name,
          })),
          recordsCount: {
            inward: records.filter((r) => r.direction === "Inward").length,
            outward: records.filter((r) => r.direction === "Outward").length,
          },
        };
      })
    );

    const processingTime = Date.now() - startTime;

    const responseData = {
      summary: {
        totalClients: portfolioReports.length,
        totalRevenue: portfolioReports.reduce(
          (sum, p) => sum + p.metrics.totalRevenue,
          0
        ),
        totalTasks: portfolioReports.reduce(
          (sum, p) => sum + p.metrics.totalTasks,
          0
        ),
      },
      portfolioReports,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime,
        dataPoints: portfolioReports.length,
        timeframe: `${startDate || "inception"} to ${endDate || "current"}`,
      },
    };

    // Generate enhanced AI insights
    const basicInsights = generateAdvancedInsights(
      responseData,
      "client_portfolio",
      { timeframe: "3 months" }
    );
    const predictiveInsights = generatePredictiveInsights(
      responseData,
      "client_portfolio"
    );
    const anomalies = detectAnomalies(responseData, "client_portfolio");

    responseData.aiInsights = [...basicInsights];
    responseData.predictiveInsights = predictiveInsights;
    responseData.anomalies = anomalies;

    // Cache the result with enhanced options
    try {
      await ReportCache.setCachedData(reportId, filters, responseData, {
        ttlMinutes: 60,
        priority: "medium",
        processingTime,
        aiMetadata: {
          insightsGenerated: basicInsights.length,
          anomaliesDetected: anomalies.length,
          predictionsGenerated: predictiveInsights.length,
          nlpProcessingTime: 50,
          confidenceScore: 85,
        },
      });
    } catch (cacheErr) {
      console.error("Cache storage error:", cacheErr);
    }

    res.json(responseData);
  })
);

// Client Performance Report
router.get(
  "/client-reports/performance",
  auth,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, minRevenue } = req.query;

    const clients = await Client.find();

    const performanceReports = await Promise.all(
      clients.map(async (client) => {
        const dateFilter = getDateFilter(startDate, endDate, "assignedAt");

        const [tasks, invoices] = await Promise.all([
          Task.find({ clientCode: client.clientCode, ...dateFilter }),
          Invoice.find({
            clientCode: client.clientCode,
            ...getDateFilter(startDate, endDate, "invoiceDate"),
          }),
        ]);

        const totalRevenue = invoices.reduce(
          (sum, inv) => sum + (inv.totalAmount || 0),
          0
        );

        // Skip clients below minimum revenue threshold
        if (minRevenue && totalRevenue < parseFloat(minRevenue)) {
          return null;
        }

        const completedTasks = tasks.filter((t) => t.status === "Completed");
        const overdueTasks = tasks.filter((t) => t.overdue);

        // Calculate average completion time for completed tasks
        const avgCompletionTime =
          completedTasks.length > 0
            ? completedTasks.reduce((sum, task) => {
                if (task.completedAt && task.assignedAt) {
                  return (
                    sum +
                    (new Date(task.completedAt) - new Date(task.assignedAt))
                  );
                }
                return sum;
              }, 0) /
              completedTasks.length /
              (1000 * 60 * 60 * 24) // Convert to days
            : 0;

        // Payment efficiency
        const paidInvoices = invoices.filter(
          (inv) => inv.paymentStatus === "Paid" || inv.status === "Paid"
        );
        const paymentEfficiency =
          invoices.length > 0
            ? (paidInvoices.length / invoices.length) * 100
            : 0;

        return {
          client: {
            clientCode: client.clientCode,
            clientName: client.clientName,
            firmName: client.firmName || "N/A",
          },
          performance: {
            totalRevenue: totalRevenue,
            totalTasks: tasks.length,
            completedTasks: completedTasks.length,
            overdueTasks: overdueTasks.length,
            completionRate:
              tasks.length > 0
                ? Math.round((completedTasks.length / tasks.length) * 100)
                : 0,
            avgCompletionDays: Math.round(avgCompletionTime),
            paymentEfficiency: Math.round(paymentEfficiency),
            riskScore: overdueTasks.length + (100 - paymentEfficiency), // Simple risk calculation
          },
        };
      })
    );

    const validReports = performanceReports.filter((report) => report !== null);

    // Sort by total revenue descending
    validReports.sort(
      (a, b) => b.performance.totalRevenue - a.performance.totalRevenue
    );

    res.json({
      summary: {
        totalClients: validReports.length,
        avgCompletionRate:
          validReports.length > 0
            ? Math.round(
                validReports.reduce(
                  (sum, r) => sum + r.performance.completionRate,
                  0
                ) / validReports.length
              )
            : 0,
        avgPaymentEfficiency:
          validReports.length > 0
            ? Math.round(
                validReports.reduce(
                  (sum, r) => sum + r.performance.paymentEfficiency,
                  0
                ) / validReports.length
              )
            : 0,
      },
      performanceReports: validReports,
    });
  })
);

// ========================================
// TEAM-WISE REPORTS
// ========================================

// Team Performance Report
router.get(
  "/team-reports/performance",
  auth,
  performanceMonitor("team-performance"),
  asyncHandler(async (req, res) => {
    const { startDate, endDate, teamMemberId } = req.query;
    const reportId = "team-performance";
    const filters = { startDate, endDate, teamMemberId };

    // Check cache
    try {
      const cachedData = await ReportCache.getCachedData(reportId, filters);
      if (cachedData) {
        console.log("✅ Serving team performance from cache");
        return res.json(cachedData);
      }
    } catch (cacheErr) {
      console.error("Cache retrieval error:", cacheErr);
    }

    let teamFilter = {};
    if (teamMemberId) {
      teamFilter.teamMemberId = teamMemberId;
    }

    const teamMembers = await Team.find(teamFilter);

    const teamReports = await Promise.all(
      teamMembers.map(async (member) => {
        const dateFilter = getDateFilter(startDate, endDate, "assignedAt");

        const tasks = await Task.find({
          teamMemberId: member.teamMemberId,
          ...dateFilter,
        });

        // Get invoices related to this team member's tasks
        const taskIds = tasks.map((t) => t._id);
        const invoices = await Invoice.find({
          "services.taskId": { $in: taskIds },
          ...getDateFilter(startDate, endDate, "invoiceDate"),
        });

        const completedTasks = tasks.filter((t) => t.status === "Completed");
        const pendingTasks = tasks.filter((t) => t.status === "Pending");
        const overdueTasks = tasks.filter((t) => t.overdue);

        // Calculate revenue attributed to this team member
        const attributedRevenue = invoices.reduce((sum, inv) => {
          const memberServices = inv.services.filter((service) =>
            taskIds.includes(service.taskId)
          );
          return (
            sum +
            memberServices.reduce(
              (serviceSum, service) => serviceSum + (service.amount || 0),
              0
            )
          );
        }, 0);

        // Get unique clients served
        const uniqueClients = [...new Set(tasks.map((t) => t.clientCode))];

        // Get service specialization
        const serviceFrequency = {};
        tasks.forEach((task) => {
          serviceFrequency[task.serviceName] =
            (serviceFrequency[task.serviceName] || 0) + 1;
        });

        return {
          teamMember: {
            teamMemberId: member.teamMemberId,
            name: member.name,
            designation: member.designation || "N/A",
            role: member.role || "N/A",
          },
          performance: {
            totalTasks: tasks.length,
            completedTasks: completedTasks.length,
            pendingTasks: pendingTasks.length,
            overdueTasks: overdueTasks.length,
            completionRate:
              tasks.length > 0
                ? Math.round((completedTasks.length / tasks.length) * 100)
                : 0,
            attributedRevenue: attributedRevenue,
            uniqueClientsServed: uniqueClients.length,
            primaryService:
              Object.keys(serviceFrequency).length > 0
                ? Object.keys(serviceFrequency).reduce((a, b) =>
                    serviceFrequency[a] > serviceFrequency[b] ? a : b
                  )
                : "None",
          },
          serviceBreakdown: Object.keys(serviceFrequency)
            .map((service) => ({
              serviceName: service,
              taskCount: serviceFrequency[service],
            }))
            .sort((a, b) => b.taskCount - a.taskCount),
        };
      })
    );

    const responseData = {
      summary: {
        totalTeamMembers: teamReports.length,
        avgCompletionRate:
          teamReports.length > 0
            ? Math.round(
                teamReports.reduce(
                  (sum, r) => sum + r.performance.completionRate,
                  0
                ) / teamReports.length
              )
            : 0,
        totalRevenue: teamReports.reduce(
          (sum, r) => sum + r.performance.attributedRevenue,
          0
        ),
      },
      teamReports,
    };

    // Generate and add AI insights
    responseData.aiInsights = generateTeamPerformanceInsights(responseData);

    // Cache the result
    try {
      await ReportCache.setCachedData(reportId, filters, responseData, 60);
    } catch (cacheErr) {
      console.error("Cache storage error:", cacheErr);
    }

    res.json(responseData);
  })
);

// Team Workload Analysis
router.get(
  "/team-reports/workload",
  auth,
  performanceMonitor("team-workload"),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const reportId = "team-workload";
    const filters = { startDate, endDate };

    // Check cache
    try {
      const cachedData = await ReportCache.getCachedData(reportId, filters);
      if (cachedData) {
        console.log("✅ Serving team workload from cache");
        return res.json(cachedData);
      }
    } catch (cacheErr) {
      console.error("Cache retrieval error:", cacheErr);
    }

    const teamMembers = await Team.find();

    const workloadAnalysis = await Promise.all(
      teamMembers.map(async (member) => {
        const currentTasks = await Task.find({
          teamMemberId: member.teamMemberId,
          status: { $in: ["Pending", "Upcoming", "Pending-Client"] },
          ...getDateFilter(startDate, endDate, "assignedAt"),
        });

        const upcomingTasks = await Task.find({
          teamMemberId: member.teamMemberId,
          status: "Upcoming",
          ...getDateFilter(startDate, endDate, "assignedAt"),
        });

        const overdueTasks = currentTasks.filter(
          (task) =>
            task.overdue ||
            (task.dueDate &&
              new Date(task.dueDate) < new Date() &&
              task.status === "Pending")
        );

        // Calculate workload score (simple algorithm)
        const workloadScore =
          currentTasks.length * 10 + overdueTasks.length * 20;

        let status = "Light";
        if (workloadScore > 100) status = "Overloaded";
        else if (workloadScore > 50) status = "Busy";
        else if (workloadScore > 20) status = "Moderate";

        return {
          teamMember: {
            teamMemberId: member.teamMemberId,
            name: member.name,
            designation: member.designation || "N/A",
          },
          workload: {
            currentTasks: currentTasks.length,
            upcomingTasks: upcomingTasks.length,
            overdueTasks: overdueTasks.length,
            workloadScore: workloadScore,
            status: status,
          },
          taskBreakdown: currentTasks.map((task) => ({
            clientCode: task.clientCode,
            serviceName: task.serviceName,
            dueDate: task.dueDate,
            status: task.status,
            isOverdue:
              task.overdue ||
              (task.dueDate && new Date(task.dueDate) < new Date()),
          })),
        };
      })
    );

    const responseData = {
      summary: {
        totalMembers: workloadAnalysis.length,
        overloadedMembers: workloadAnalysis.filter(
          (w) => w.workload.status === "Overloaded"
        ).length,
        avgWorkloadScore:
          workloadAnalysis.length > 0
            ? Math.round(
                workloadAnalysis.reduce(
                  (sum, w) => sum + w.workload.workloadScore,
                  0
                ) / workloadAnalysis.length
              )
            : 0,
      },
      workloadAnalysis,
    };

    // Simple AI insight for workload
    const insights = [];
    if (responseData.summary.overloadedMembers > 0) {
      insights.push(
        `${responseData.summary.overloadedMembers} team member(s) are currently overloaded. Consider re-distributing tasks.`
      );
    }
    const avgScore = responseData.summary.avgWorkloadScore;
    if (avgScore > 75) {
      insights.push(
        `The average team workload score is high (${avgScore}). The team may be approaching capacity.`
      );
    }
    responseData.aiInsights = insights;

    // Cache the result
    try {
      await ReportCache.setCachedData(reportId, filters, responseData, 60);
    } catch (cacheErr) {
      console.error("Cache storage error:", cacheErr);
    }

    res.json(responseData);
  })
);

// ========================================
// TASK-WISE REPORTS
// ========================================

// Task Status Dashboard
router.get(
  "/task-reports/status",
  auth,
  performanceMonitor("task-status"),
  asyncHandler(async (req, res) => {
    const { startDate, endDate, clientCode, serviceName, financialYear } =
      req.query;
    const reportId = "task-status";
    const filters = {
      startDate,
      endDate,
      clientCode,
      serviceName,
      financialYear,
    };

    // Check cache
    try {
      const cachedData = await ReportCache.getCachedData(reportId, filters);
      if (cachedData) {
        console.log("✅ Serving task status from cache");
        return res.json(cachedData);
      }
    } catch (cacheErr) {
      console.error("Cache retrieval error:", cacheErr);
    }

    let filter = getDateFilter(startDate, endDate, "assignedAt");

    if (clientCode) {
      filter.clientCode = new RegExp(clientCode, "i");
    }
    if (serviceName) {
      filter.serviceName = new RegExp(serviceName, "i");
    }
    if (financialYear) {
      filter.financialYear = financialYear;
    }

    const tasks = await Task.find(filter);

    // Status breakdown
    const statusBreakdown = {
      pending: tasks.filter((t) => t.status === "Pending").length,
      completed: tasks.filter((t) => t.status === "Completed").length,
      upcoming: tasks.filter((t) => t.status === "Upcoming").length,
      pendingClient: tasks.filter((t) => t.status === "Pending-Client").length,
      overdue: tasks.filter((t) => t.overdue).length,
    };

    // Service-wise breakdown
    const serviceMap = {};
    tasks.forEach((task) => {
      if (!serviceMap[task.serviceName]) {
        serviceMap[task.serviceName] = {
          total: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
        };
      }
      serviceMap[task.serviceName].total++;
      if (task.status === "Completed") serviceMap[task.serviceName].completed++;
      if (task.status === "Pending") serviceMap[task.serviceName].pending++;
      if (task.overdue) serviceMap[task.serviceName].overdue++;
    });

    const serviceBreakdown = Object.keys(serviceMap)
      .map((service) => ({
        serviceName: service,
        ...serviceMap[service],
        completionRate:
          serviceMap[service].total > 0
            ? Math.round(
                (serviceMap[service].completed / serviceMap[service].total) *
                  100
              )
            : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Monthly trend (last 12 months)
    const monthlyTrend = [];
    const dateToIterate = new Date(endDate || new Date());
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(
        dateToIterate.getFullYear(),
        dateToIterate.getMonth() - i,
        1
      );
      const monthEnd = new Date(
        dateToIterate.getFullYear(),
        dateToIterate.getMonth() - i + 1,
        0
      );

      const monthTasks = tasks.filter((task) => {
        const taskDate = new Date(task.assignedAt);
        return taskDate >= monthStart && taskDate <= monthEnd;
      });

      monthlyTrend.push({
        month: monthStart.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        total: monthTasks.length,
        completed: monthTasks.filter((t) => t.status === "Completed").length,
        pending: monthTasks.filter((t) => t.status === "Pending").length,
      });
    }

    const responseData = {
      summary: {
        totalTasks: tasks.length,
        completionRate:
          tasks.length > 0
            ? Math.round((statusBreakdown.completed / tasks.length) * 100)
            : 0,
        overdueRate:
          tasks.length > 0
            ? Math.round((statusBreakdown.overdue / tasks.length) * 100)
            : 0,
      },
      statusBreakdown,
      serviceBreakdown,
      monthlyTrend,
    };

    // Generate and add AI insights
    responseData.aiInsights = generateTaskStatusInsights(responseData);

    // Cache the result
    try {
      await ReportCache.setCachedData(reportId, filters, responseData, 60);
    } catch (cacheErr) {
      console.error("Cache storage error:", cacheErr);
    }

    res.json(responseData);
  })
);

// Service-wise Task Analysis
router.get(
  "/task-reports/service-analysis",
  auth,
  performanceMonitor("service-analysis"),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const reportId = "service-analysis";
    const filters = { startDate, endDate };

    // Check cache
    try {
      const cachedData = await ReportCache.getCachedData(reportId, filters);
      if (cachedData) {
        console.log("✅ Serving service analysis from cache");
        return res.json(cachedData);
      }
    } catch (cacheErr) {
      console.error("Cache retrieval error:", cacheErr);
    }

    const filter = getDateFilter(startDate, endDate, "assignedAt");
    const tasks = await Task.find(filter);

    // Group by service
    const serviceAnalysis = {};

    tasks.forEach((task) => {
      if (!serviceAnalysis[task.serviceName]) {
        serviceAnalysis[task.serviceName] = {
          serviceName: task.serviceName,
          serviceCode: task.serviceCode || "N/A",
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          uniqueClients: new Set(),
          teamMembers: new Set(),
          avgCompletionTime: [],
          financialYears: new Set(),
        };
      }

      const service = serviceAnalysis[task.serviceName];
      service.totalTasks++;
      service.uniqueClients.add(task.clientCode);
      service.teamMembers.add(task.teamMemberId);
      service.financialYears.add(task.financialYear);

      if (task.status === "Completed") {
        service.completedTasks++;
        if (task.completedAt && task.assignedAt) {
          const completionTime =
            (new Date(task.completedAt) - new Date(task.assignedAt)) /
            (1000 * 60 * 60 * 24);
          service.avgCompletionTime.push(completionTime);
        }
      }
      if (task.status === "Pending") service.pendingTasks++;
      if (task.overdue) service.overdueTasks++;
    });

    // Convert to array and calculate final metrics
    const serviceReports = Object.values(serviceAnalysis).map((service) => ({
      ...service,
      uniqueClients: service.uniqueClients.size,
      teamMembers: Array.from(service.teamMembers),
      completionRate:
        service.totalTasks > 0
          ? Math.round((service.completedTasks / service.totalTasks) * 100)
          : 0,
      avgCompletionDays:
        service.avgCompletionTime.length > 0
          ? Math.round(
              service.avgCompletionTime.reduce((sum, time) => sum + time, 0) /
                service.avgCompletionTime.length
            )
          : 0,
      financialYears: Array.from(service.financialYears),
    }));

    // Remove temporary arrays
    serviceReports.forEach((service) => {
      delete service.avgCompletionTime;
    });

    // Sort by total tasks descending
    serviceReports.sort((a, b) => b.totalTasks - a.totalTasks);

    const responseData = {
      summary: {
        totalServices: serviceReports.length,
        mostPopularService:
          serviceReports.length > 0 ? serviceReports[0].serviceName : null,
        avgCompletionRate:
          serviceReports.length > 0
            ? Math.round(
                serviceReports.reduce((sum, s) => sum + s.completionRate, 0) /
                  serviceReports.length
              )
            : 0,
      },
      serviceReports,
    };

    // AI Insights for Service Analysis
    const insights = [];
    if (responseData.summary.mostPopularService) {
      insights.push(
        `The most popular service is '${responseData.summary.mostPopularService}', accounting for a significant portion of tasks.`
      );
    }
    const lowPerformingServices = serviceReports.filter(
      (s) => s.completionRate < 70 && s.totalTasks > 5
    );
    if (lowPerformingServices.length > 0) {
      insights.push(
        `${lowPerformingServices.length} service(s), including '${lowPerformingServices[0].serviceName}', have a completion rate below 70%.`
      );
    }
    responseData.aiInsights = insights;

    // Cache the result
    try {
      await ReportCache.setCachedData(reportId, filters, responseData, 60);
    } catch (cacheErr) {
      console.error("Cache storage error:", cacheErr);
    }

    res.json(responseData);
  })
);

// ========================================
// INVOICE/REVENUE REPORTS
// ========================================

// Revenue Analysis Report
router.get(
  "/invoice-reports/revenue-analysis",
  auth,
  performanceMonitor("revenue-analysis"),
  asyncHandler(async (req, res) => {
    const { startDate, endDate, isBiller2 } = req.query;
    const reportId = "revenue-analysis";
    const filters = { startDate, endDate, isBiller2 };
    const startTime = Date.now();

    // Check cache
    try {
      const cachedData = await ReportCache.getCachedData(reportId, filters);
      if (cachedData) {
        console.log("✅ Serving revenue analysis from cache");
        return res.json(cachedData);
      }
    } catch (cacheErr) {
      console.error("Cache retrieval error:", cacheErr);
    }

    let filter = getDateFilter(startDate, endDate, "invoiceDate");

    if (isBiller2 !== undefined) {
      filter.isBiller2 = isBiller2 === "true";
    }

    const invoices = await Invoice.find(filter);
    const processingTime = Date.now() - startTime;

    // Revenue breakdown
    const totalRevenue = invoices.reduce(
      (sum, invoice) => sum + (invoice.totalAmount || 0),
      0
    );
    const paidRevenue = invoices
      .filter(
        (invoice) =>
          invoice.paymentStatus === "Paid" || invoice.status === "Paid"
      )
      .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
    const pendingRevenue = totalRevenue - paidRevenue;

    // Monthly revenue trend
    const monthlyRevenue = {};
    invoices.forEach((invoice) => {
      const monthKey = new Date(invoice.invoiceDate).toISOString().slice(0, 7);
      const monthLabel = new Date(invoice.invoiceDate).toLocaleDateString(
        "en-US",
        { month: "short", year: "2-digit" }
      );

      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = {
          month: monthLabel,
          total: 0,
          paid: 0,
          pending: 0,
        };
      }
      monthlyRevenue[monthKey].total += invoice.totalAmount || 0;
      if (invoice.paymentStatus === "Paid" || invoice.status === "Paid") {
        monthlyRevenue[monthKey].paid += invoice.totalAmount || 0;
      } else {
        monthlyRevenue[monthKey].pending += invoice.totalAmount || 0;
      }
    });

    // Client-wise revenue
    const clientRevenue = {};
    invoices.forEach((invoice) => {
      if (!clientRevenue[invoice.clientCode]) {
        clientRevenue[invoice.clientCode] = {
          clientCode: invoice.clientCode,
          clientName: invoice.clientName || "Unknown",
          totalRevenue: 0,
          paidRevenue: 0,
          invoiceCount: 0,
        };
      }
      clientRevenue[invoice.clientCode].totalRevenue +=
        invoice.totalAmount || 0;
      clientRevenue[invoice.clientCode].invoiceCount++;
      if (invoice.paymentStatus === "Paid" || invoice.status === "Paid") {
        clientRevenue[invoice.clientCode].paidRevenue +=
          invoice.totalAmount || 0;
      }
    });

    const topClients = Object.values(clientRevenue)
      .map((client) => ({
        ...client,
        pendingRevenue: client.totalRevenue - client.paidRevenue,
        paymentRate:
          client.totalRevenue > 0
            ? Math.round((client.paidRevenue / client.totalRevenue) * 100)
            : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Service-wise revenue from invoice services
    const serviceRevenueMap = {};
    invoices.forEach((invoice) => {
      if (invoice.services && Array.isArray(invoice.services)) {
        invoice.services.forEach((service) => {
          if (!serviceRevenueMap[service.serviceName]) {
            serviceRevenueMap[service.serviceName] = {
              serviceName: service.serviceName,
              totalRevenue: 0,
              invoiceCount: 0,
            };
          }
          serviceRevenueMap[service.serviceName].totalRevenue +=
            service.amount || 0;
          serviceRevenueMap[service.serviceName].invoiceCount++;
        });
      }
    });

    const serviceRevenue = Object.values(serviceRevenueMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    const responseData = {
      summary: {
        totalRevenue: totalRevenue,
        paidRevenue: paidRevenue,
        pendingRevenue: pendingRevenue,
        collectionEfficiency:
          totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0,
        totalInvoices: invoices.length,
        paidInvoices: invoices.filter(
          (invoice) =>
            invoice.paymentStatus === "Paid" || invoice.status === "Paid"
        ).length,
      },
      monthlyTrend: Object.keys(monthlyRevenue)
        .sort()
        .map((key) => monthlyRevenue[key]),
      topClients: topClients,
      serviceRevenue: serviceRevenue,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime,
        dataPoints: invoices.length,
        timeframe: `${startDate || "inception"} to ${endDate || "current"}`,
      },
    };

    // Generate enhanced AI insights with the fixed function
    const basicInsights = generateAdvancedInsights(
      responseData,
      "revenue_analysis",
      { timeframe: "3 months" }
    );
    const predictiveInsights = generatePredictiveInsights(
      responseData,
      "revenue_analysis"
    );
    const anomalies = detectAnomalies(responseData, "revenue_analysis");

    responseData.aiInsights = [...basicInsights];
    responseData.predictiveInsights = predictiveInsights;
    responseData.anomalies = anomalies;

    // Cache the result
    try {
      await ReportCache.setCachedData(reportId, filters, responseData, {
        ttlMinutes: 60,
        priority: "high", // Revenue reports are high priority
        processingTime,
        aiMetadata: {
          insightsGenerated: basicInsights.length,
          anomaliesDetected: anomalies.length,
          predictionsGenerated: predictiveInsights.length,
          nlpProcessingTime: 75,
          confidenceScore: 88,
        },
      });
    } catch (cacheErr) {
      console.error("Cache storage error:", cacheErr);
    }

    res.json(responseData);
  })
);

// ========================================
// CROSS-MODULE ANALYTICS
// ========================================

// Business Intelligence Dashboard
router.get(
  "/cross-module-analytics/dashboard",
  auth,
  asyncHandler(async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter = getDateFilter(startDate, endDate);

      // Get all data for the period
      const [clients, tasks, invoices, records, teamMembers] =
        await Promise.all([
          Client.find(),
          Task.find({ ...getDateFilter(startDate, endDate, "assignedAt") }),
          Invoice.find({ ...getDateFilter(startDate, endDate, "invoiceDate") }),
          Record.find({ ...getDateFilter(startDate, endDate, "timestamp") }),
          Team.find(),
        ]);

      // Calculate key metrics
      const totalRevenue = invoices.reduce(
        (sum, invoice) => sum + (invoice.totalAmount || 0),
        0
      );
      const paidRevenue = invoices
        .filter(
          (invoice) =>
            invoice.paymentStatus === "Paid" || invoice.status === "Paid"
        )
        .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);

      const taskCompletionRate =
        tasks.length > 0
          ? Math.round(
              (tasks.filter((t) => t.status === "Completed").length /
                tasks.length) *
                100
            )
          : 0;

      const activeClients = new Set(tasks.map((t) => t.clientCode)).size;

      // Client engagement metrics
      const clientEngagement = {};
      tasks.forEach((task) => {
        if (!clientEngagement[task.clientCode]) {
          clientEngagement[task.clientCode] = {
            tasks: 0,
            services: new Set(),
            lastActivity: null,
          };
        }
        clientEngagement[task.clientCode].tasks++;
        clientEngagement[task.clientCode].services.add(task.serviceName);

        const taskDate = new Date(task.assignedAt);
        if (
          !clientEngagement[task.clientCode].lastActivity ||
          taskDate > clientEngagement[task.clientCode].lastActivity
        ) {
          clientEngagement[task.clientCode].lastActivity = taskDate;
        }
      });

      // Team productivity
      const teamProductivity = {};
      tasks.forEach((task) => {
        if (!teamProductivity[task.teamMemberId]) {
          teamProductivity[task.teamMemberId] = {
            tasks: 0,
            completed: 0,
            clients: new Set(),
          };
        }
        teamProductivity[task.teamMemberId].tasks++;
        teamProductivity[task.teamMemberId].clients.add(task.clientCode);
        if (task.status === "Completed") {
          teamProductivity[task.teamMemberId].completed++;
        }
      });

      // Top performers
      const topPerformers = Object.keys(teamProductivity)
        .map((memberId) => {
          const member = teamMembers.find((tm) => tm.teamMemberId === memberId);
          const productivity = teamProductivity[memberId];
          return {
            teamMemberId: memberId,
            name: member ? member.name : "Unknown",
            tasksCompleted: productivity.completed,
            completionRate:
              productivity.tasks > 0
                ? Math.round(
                    (productivity.completed / productivity.tasks) * 100
                  )
                : 0,
            clientsServed: productivity.clients.size,
          };
        })
        .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
        .slice(0, 5);

      // Service popularity
      const servicePopularity = {};
      tasks.forEach((task) => {
        servicePopularity[task.serviceName] =
          (servicePopularity[task.serviceName] || 0) + 1;
      });

      const topServices = Object.keys(servicePopularity)
        .map((service) => ({
          serviceName: service,
          taskCount: servicePopularity[service],
        }))
        .sort((a, b) => b.taskCount - a.taskCount)
        .slice(0, 5);

      const responseData = {
        overview: {
          totalClients: clients.length,
          activeClients: activeClients,
          totalRevenue: totalRevenue,
          paidRevenue: paidRevenue,
          collectionRate:
            totalRevenue > 0
              ? Math.round((paidRevenue / totalRevenue) * 100)
              : 0,
          totalTasks: tasks.length,
          taskCompletionRate: taskCompletionRate,
          totalInvoices: invoices.length,
          totalRecords: records.length,
        },
        topPerformers,
        topServices,
        recentActivity: {
          newClients: clients.filter((c) => {
            const clientDate = new Date(c.createdAt || c.withUsSince);
            const thirtyDaysAgo = new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000
            );
            return clientDate >= thirtyDaysAgo;
          }).length,
          newTasks: tasks.filter((t) => {
            const taskDate = new Date(t.assignedAt);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return taskDate >= sevenDaysAgo;
          }).length,
          recentInvoices: invoices.filter((i) => {
            const invoiceDate = new Date(i.invoiceDate);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return invoiceDate >= sevenDaysAgo;
          }).length,
        },
      };

      res.json(responseData);
    } catch (err) {
      console.error("Error generating dashboard analytics:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  })
);

// Client Service Matrix Report
router.get(
  "/cross-module-analytics/client-service-matrix",
  auth,
  asyncHandler(async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const reportId = "client-service-matrix";
      const filters = { startDate, endDate };

      const cachedData = await ReportCache.getCachedData(reportId, filters);
      if (cachedData) {
        console.log("✅ Serving client service matrix from cache");
        return res.json(cachedData);
      }

      const filter = getDateFilter(startDate, endDate, "assignedAt");
      const tasks = await Task.find(filter);

      const matrix = {};
      const allServices = new Set();
      const allClients = new Set();

      tasks.forEach((task) => {
        allServices.add(task.serviceName);
        allClients.add(task.clientCode);
        if (!matrix[task.clientCode]) matrix[task.clientCode] = {};
        if (!matrix[task.clientCode][task.serviceName]) {
          matrix[task.clientCode][task.serviceName] = {
            taskCount: 0,
            completed: 0,
            pending: 0,
            revenue: 0,
          };
        }
        matrix[task.clientCode][task.serviceName].taskCount++;
        if (task.status === "Completed")
          matrix[task.clientCode][task.serviceName].completed++;
        else if (task.status === "Pending")
          matrix[task.clientCode][task.serviceName].pending++;
      });

      const clients = await Client.find({
        clientCode: { $in: Array.from(allClients) },
      });
      const clientMap = {};
      clients.forEach((client) => {
        clientMap[client.clientCode] = client.clientName;
      });

      const matrixData = Array.from(allClients).map((clientCode) => {
        const clientData = {
          clientCode,
          clientName: clientMap[clientCode] || clientCode,
          services: {},
        };
        Array.from(allServices).forEach((serviceName) => {
          clientData.services[serviceName] = matrix[clientCode]?.[
            serviceName
          ] || { taskCount: 0, completed: 0, pending: 0, revenue: 0 };
        });
        return clientData;
      });

      const responseData = {
        matrix: matrixData,
        services: Array.from(allServices).sort(),
        summary: {
          totalClients: allClients.size,
          totalServices: allServices.size,
          totalTasks: tasks.length,
        },
      };

      const insights = [];
      if (responseData.services.length > 0) {
        const serviceCounts = responseData.services.map((service) => ({
          name: service,
          clientCount: responseData.matrix.filter(
            (client) => client.services[service].taskCount > 0
          ).length,
        }));
        const mostDiverseService = serviceCounts.sort(
          (a, b) => b.clientCount - a.clientCount
        )[0];
        if (mostDiverseService)
          insights.push(
            `'${mostDiverseService.name}' is your most widespread service, used by ${mostDiverseService.clientCount} clients.`
          );
      }
      responseData.aiInsights = insights;

      await ReportCache.setCachedData(reportId, filters, responseData, 60);

      res.json(responseData);
    } catch (err) {
      console.error("Error generating client-service matrix:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  })
);

// ========================================
// EXPORT FUNCTIONALITY (Enhanced)
// ========================================

router.get(
  "/export/:reportType",
  auth,
  asyncHandler(async (req, res) => {
    const { reportType } = req.params;
    const { format = "json", startDate, endDate } = req.query;

    try {
      let reportData;

      // Get report data based on type
      switch (reportType) {
        case "revenue-analysis":
          // Fetch data using the same logic as the revenue analysis endpoint
          const response = await fetch(
            `${req.protocol}://${req.get(
              "host"
            )}/api/reports/invoice-reports/revenue-analysis?${new URLSearchParams(
              { startDate, endDate }
            )}`,
            {
              headers: {
                Authorization: req.header("Authorization"),
                "Content-Type": "application/json",
              },
            }
          );
          reportData = await response.json();
          break;

        case "client-portfolio":
          const portfolioResponse = await fetch(
            `${req.protocol}://${req.get(
              "host"
            )}/api/reports/client-reports/portfolio?${new URLSearchParams({
              startDate,
              endDate,
            })}`,
            {
              headers: {
                Authorization: req.header("Authorization"),
                "Content-Type": "application/json",
              },
            }
          );
          reportData = await portfolioResponse.json();
          break;

        case "team-performance":
          const teamResponse = await fetch(
            `${req.protocol}://${req.get(
              "host"
            )}/api/reports/team-reports/performance?${new URLSearchParams({
              startDate,
              endDate,
            })}`,
            {
              headers: {
                Authorization: req.header("Authorization"),
                "Content-Type": "application/json",
              },
            }
          );
          reportData = await teamResponse.json();
          break;

        case "task-status":
          const taskResponse = await fetch(
            `${req.protocol}://${req.get(
              "host"
            )}/api/reports/task-reports/status?${new URLSearchParams({
              startDate,
              endDate,
            })}`,
            {
              headers: {
                Authorization: req.header("Authorization"),
                "Content-Type": "application/json",
              },
            }
          );
          reportData = await taskResponse.json();
          break;

        default:
          return res.status(400).json({ message: "Invalid report type" });
      }

      if (format === "csv") {
        // Enhanced CSV export logic with better formatting
        const fields = [];
        let data = [];

        if (reportType === "revenue-analysis") {
          fields.push(
            { label: "Client Code", value: "clientCode" },
            { label: "Client Name", value: "clientName" },
            { label: "Total Revenue (INR)", value: "totalRevenue" },
            { label: "Paid Revenue (INR)", value: "paidRevenue" },
            { label: "Pending Revenue (INR)", value: "pendingRevenue" },
            { label: "Payment Rate (%)", value: "paymentRate" },
            { label: "Invoice Count", value: "invoiceCount" }
          );
          data = reportData.topClients;
        } else if (reportType === "client-portfolio") {
          fields.push(
            { label: "Client Code", value: "client.clientCode" },
            { label: "Client Name", value: "client.clientName" },
            { label: "Total Revenue", value: "metrics.totalRevenue" },
            { label: "Completion Rate", value: "metrics.completionRate" },
            { label: "Total Tasks", value: "metrics.totalTasks" }
          );
          data = reportData.portfolioReports;
        } else if (reportType === "team-performance") {
          fields.push(
            { label: "Team Member", value: "teamMember.name" },
            { label: "Total Tasks", value: "performance.totalTasks" },
            { label: "Completion Rate", value: "performance.completionRate" },
            { label: "Revenue", value: "performance.attributedRevenue" }
          );
          data = reportData.teamReports;
        } else if (reportType === "task-status") {
          fields.push(
            { label: "Service", value: "serviceName" },
            { label: "Total Tasks", value: "total" },
            { label: "Completed", value: "completed" },
            { label: "Completion Rate", value: "completionRate" }
          );
          data = reportData.serviceBreakdown;
        }

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${reportType}-${
            new Date().toISOString().split("T")[0]
          }.csv"`
        );
        res.send(csv);
      } else {
        res.json({
          reportType,
          generatedAt: new Date().toISOString(),
          exportFormat: format,
          data: reportData,
        });
      }
    } catch (err) {
      console.error("Error exporting report:", err);
      res.status(500).json({
        message: "Server error during export",
        error: err.message,
        reportType,
        format,
      });
    }
  })
);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error("Report route error:", err);
  res.status(500).json({
    message: "Internal server error in reports module",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
    requestId: req.id || "unknown",
  });
});

module.exports = router;
