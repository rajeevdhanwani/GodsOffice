const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "task_performance",
        "revenue_analytics",
        "client_insights",
        "team_performance",
        "service_analytics",
        "custom",
        "ai_powered",
        "predictive_analysis",
      ],
    },
    category: {
      type: String,
      required: true,
      enum: [
        "operational",
        "financial",
        "client",
        "strategic",
        "ai_insights",
        "predictive",
      ],
    },
    description: {
      type: String,
      trim: true,
    },
    filters: {
      dateRange: {
        start: Date,
        end: Date,
      },
      clients: [String], // Client IDs
      teams: [String], // Team IDs
      services: [String], // Service IDs
      users: [String], // User IDs
      status: [String], // Task/Invoice status
      customFilters: mongoose.Schema.Types.Mixed,
      // Enhanced filtering capabilities
      advancedFilters: {
        revenueRange: {
          min: Number,
          max: Number,
        },
        completionRateRange: {
          min: Number,
          max: Number,
        },
        riskLevel: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
        },
        performanceThreshold: Number,
      },
    },
    configuration: {
      chartType: {
        type: String,
        enum: [
          "bar",
          "line",
          "pie",
          "doughnut",
          "area",
          "scatter",
          "table",
          "heatmap",
          "treemap",
          "gauge",
        ],
        default: "bar",
      },
      groupBy: {
        type: String,
        enum: [
          "date",
          "client",
          "team",
          "service",
          "user",
          "status",
          "month",
          "week",
          "quarter",
          "year",
        ],
      },
      metrics: [
        {
          name: String,
          field: String,
          aggregation: {
            type: String,
            enum: ["sum", "avg", "count", "max", "min", "median", "percentile"],
          },
          // Enhanced metric configuration
          format: {
            type: String,
            enum: ["currency", "percentage", "number", "date", "duration"],
          },
          threshold: {
            warning: Number,
            critical: Number,
          },
        },
      ],
      sorting: {
        field: String,
        direction: {
          type: String,
          enum: ["asc", "desc"],
          default: "desc",
        },
      },
      limit: {
        type: Number,
        default: 50,
        max: 1000,
      },
      // Enhanced visualization options
      visualization: {
        colors: [String],
        theme: {
          type: String,
          enum: ["light", "dark", "auto"],
          default: "light",
        },
        animation: {
          enabled: {
            type: Boolean,
            default: true,
          },
          duration: {
            type: Number,
            default: 750,
          },
        },
        responsive: {
          type: Boolean,
          default: true,
        },
      },
    },
    schedule: {
      enabled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "quarterly", "real_time"],
        default: "weekly",
      },
      recipients: [String], // Email addresses
      lastRun: Date,
      nextRun: Date,
      // Enhanced scheduling
      timezone: {
        type: String,
        default: "Asia/Kolkata",
      },
      format: {
        type: String,
        enum: ["email", "pdf", "csv", "json", "dashboard_notification"],
        default: "email",
      },
      conditions: {
        onlyIfDataChanged: {
          type: Boolean,
          default: false,
        },
        thresholdAlert: {
          enabled: Boolean,
          metrics: [
            {
              field: String,
              operator: String, // '>', '<', '>=', '<=', '==', '!='
              value: Number,
            },
          ],
        },
      },
    },
    access: {
      isPublic: {
        type: Boolean,
        default: false,
      },
      allowedUsers: [String], // User IDs
      allowedRoles: [
        {
          type: String,
          enum: ["admin", "manager", "user", "client", "analyst", "viewer"],
        },
      ],
      // Enhanced access control
      permissions: {
        read: [String],
        write: [String],
        delete: [String],
        share: [String],
      },
      dataVisibility: {
        level: {
          type: String,
          enum: ["full", "summary", "aggregated_only"],
          default: "full",
        },
        maskSensitiveData: {
          type: Boolean,
          default: false,
        },
      },
    },
    metadata: {
      createdBy: {
        type: String,
        required: true,
      },
      lastModifiedBy: String,
      tags: [String],
      favorite: {
        type: Boolean,
        default: false,
      },
      views: {
        type: Number,
        default: 0,
      },
      // Enhanced metadata
      performance: {
        avgGenerationTime: Number, // milliseconds
        cacheHitRate: Number, // percentage
        lastPerformanceScore: Number, // 0-100
      },
      usage: {
        totalRuns: {
          type: Number,
          default: 0,
        },
        uniqueUsers: [String],
        popularityScore: {
          type: Number,
          default: 0,
        },
      },
      version: {
        current: {
          type: String,
          default: "1.0.0",
        },
        history: [
          {
            version: String,
            changes: String,
            changedBy: String,
            changedAt: Date,
          },
        ],
      },
    },
    // ENHANCED AI INSIGHTS WITH ADVANCED CAPABILITIES
    aiInsights: {
      enabled: {
        type: Boolean,
        default: true,
      },
      lastAnalysis: Date,
      insights: [
        {
          type: {
            type: String,
            enum: [
              "trend",
              "anomaly",
              "recommendation",
              "forecast",
              "risk_alert",
              "opportunity",
              "pattern",
              "correlation",
            ],
          },
          title: String,
          description: String,
          confidence: {
            type: Number,
            min: 0,
            max: 100,
          },
          impact: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
          },
          priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
          },
          actionable: {
            type: Boolean,
            default: false,
          },
          // Enhanced AI features
          categories: [String], // e.g., ['financial', 'operational', 'strategic']
          relatedMetrics: [String],
          suggestedActions: [
            {
              action: String,
              expectedImpact: String,
              effort: {
                type: String,
                enum: ["low", "medium", "high"],
              },
              timeline: String,
            },
          ],
          dataPoints: [
            {
              metric: String,
              value: Number,
              previousValue: Number,
              changePercentage: Number,
            },
          ],
          generatedAt: {
            type: Date,
            default: Date.now,
          },
          expiresAt: Date,
          aiModel: {
            name: String,
            version: String,
            processingTime: Number,
          },
        },
      ],
      // Predictive Analytics
      predictions: [
        {
          metric: String,
          timeframe: String, // '1month', '3months', '6months', '1year'
          predictedValue: Number,
          confidence: Number,
          trend: {
            type: String,
            enum: ["increasing", "decreasing", "stable", "volatile"],
          },
          factors: [String], // factors influencing the prediction
          scenarios: [
            {
              name: String, // 'optimistic', 'realistic', 'pessimistic'
              value: Number,
              probability: Number,
            },
          ],
          generatedAt: Date,
          modelAccuracy: Number,
        },
      ],
      // Anomaly Detection
      anomalies: [
        {
          metric: String,
          detectedValue: Number,
          expectedValue: Number,
          deviation: Number, // standard deviations from norm
          severity: {
            type: String,
            enum: ["minor", "moderate", "major", "critical"],
          },
          detectedAt: Date,
          resolved: {
            type: Boolean,
            default: false,
          },
          resolvedAt: Date,
          falsePositive: {
            type: Boolean,
            default: false,
          },
        },
      ],
      // Natural Language Processing
      nlp: {
        queries: [
          {
            query: String,
            intent: String,
            entities: [
              {
                entity: String,
                value: String,
                confidence: Number,
              },
            ],
            response: String,
            timestamp: Date,
          },
        ],
        summaries: {
          executive: String,
          technical: String,
          lastGenerated: Date,
        },
      },
      // Performance Benchmarking
      benchmarks: {
        industry: {
          source: String,
          values: [
            {
              metric: String,
              benchmarkValue: Number,
              ourValue: Number,
              percentile: Number,
            },
          ],
        },
        historical: {
          periods: [
            {
              period: String,
              metrics: [
                {
                  name: String,
                  value: Number,
                },
              ],
            },
          ],
        },
      },
      // Advanced Analytics Settings
      settings: {
        analysisDepth: {
          type: String,
          enum: ["basic", "standard", "advanced", "comprehensive"],
          default: "standard",
        },
        autoRefresh: {
          enabled: {
            type: Boolean,
            default: true,
          },
          interval: {
            type: Number,
            default: 3600000, // 1 hour in milliseconds
          },
        },
        notifications: {
          enabled: {
            type: Boolean,
            default: true,
          },
          thresholds: {
            anomalyScore: Number,
            confidenceLevel: Number,
          },
          channels: [
            {
              type: String,
              enabled: Boolean,
              settings: mongoose.Schema.Types.Mixed,
            },
          ],
        },
      },
    },
    // Real-time data streaming
    realTime: {
      enabled: {
        type: Boolean,
        default: false,
      },
      updateFrequency: {
        type: Number,
        default: 30000, // 30 seconds
      },
      lastUpdate: Date,
      subscribers: [String], // User IDs subscribed to real-time updates
    },
    // Data quality metrics
    dataQuality: {
      completeness: Number, // 0-100
      accuracy: Number, // 0-100
      consistency: Number, // 0-100
      timeliness: Number, // 0-100
      lastAssessment: Date,
      issues: [
        {
          type: String,
          description: String,
          severity: String,
          detectedAt: Date,
          resolved: Boolean,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Enhanced indexes for performance
reportSchema.index({ type: 1, category: 1 });
reportSchema.index({ "metadata.createdBy": 1 });
reportSchema.index({ "schedule.enabled": 1, "schedule.nextRun": 1 });
reportSchema.index({ "access.allowedUsers": 1 });
reportSchema.index({ "metadata.tags": 1 });
reportSchema.index({ "aiInsights.lastAnalysis": 1 });
reportSchema.index({ "metadata.performance.lastPerformanceScore": -1 });
reportSchema.index({ "metadata.usage.popularityScore": -1 });
reportSchema.index({ "realTime.enabled": 1, "realTime.lastUpdate": 1 });

// Virtual for report URL
reportSchema.virtual("url").get(function () {
  return `/reports/${this._id}`;
});

// Virtual for performance score calculation
reportSchema.virtual("performanceScore").get(function () {
  const avgTime = this.metadata.performance.avgGenerationTime || 5000;
  const cacheHit = this.metadata.performance.cacheHitRate || 0;
  const views = this.metadata.views || 0;

  // Calculate score based on speed, cache efficiency, and popularity
  const speedScore = Math.max(0, 100 - avgTime / 100);
  const cacheScore = cacheHit;
  const popularityScore = Math.min(100, views * 2);

  return Math.round((speedScore + cacheScore + popularityScore) / 3);
});

// Enhanced instance methods
reportSchema.methods.hasAccess = function (userId, userRole) {
  if (this.access.isPublic) return true;
  if (this.access.allowedUsers.includes(userId)) return true;
  if (this.access.allowedRoles.includes(userRole)) return true;
  if (this.access.permissions.read.includes(userId)) return true;
  return this.metadata.createdBy === userId;
};

reportSchema.methods.hasWriteAccess = function (userId, userRole) {
  if (userRole === "admin") return true;
  if (this.access.permissions.write.includes(userId)) return true;
  return this.metadata.createdBy === userId;
};

reportSchema.methods.canDelete = function (userId, userRole) {
  if (userRole === "admin") return true;
  if (this.access.permissions.delete.includes(userId)) return true;
  return this.metadata.createdBy === userId;
};

reportSchema.methods.canShare = function (userId, userRole) {
  if (userRole === "admin") return true;
  if (this.access.permissions.share.includes(userId)) return true;
  return this.metadata.createdBy === userId;
};

reportSchema.methods.incrementView = function (userId) {
  this.metadata.views += 1;
  if (userId && !this.metadata.usage.uniqueUsers.includes(userId)) {
    this.metadata.usage.uniqueUsers.push(userId);
  }
  // Update popularity score
  this.metadata.usage.popularityScore =
    this.metadata.views + this.metadata.usage.uniqueUsers.length * 5;
  return this.save();
};

reportSchema.methods.updatePerformance = function (
  generationTime,
  cacheHit = false
) {
  const current = this.metadata.performance;
  const newAvgTime = current.avgGenerationTime
    ? (current.avgGenerationTime + generationTime) / 2
    : generationTime;

  this.metadata.performance.avgGenerationTime = newAvgTime;

  if (cacheHit) {
    const currentRate = current.cacheHitRate || 0;
    this.metadata.performance.cacheHitRate = Math.min(100, currentRate + 1);
  }

  this.metadata.performance.lastPerformanceScore = this.performanceScore;
  return this.save();
};

// Enhanced static methods
reportSchema.statics.getByCategory = function (category, userId, userRole) {
  return this.find({
    category,
    $or: [
      { "access.isPublic": true },
      { "access.allowedUsers": userId },
      { "access.allowedRoles": userRole },
      { "access.permissions.read": userId },
      { "metadata.createdBy": userId },
    ],
  }).sort({ "metadata.usage.popularityScore": -1, updatedAt: -1 });
};

reportSchema.statics.getPopular = function (limit = 10) {
  return this.find({ "access.isPublic": true })
    .sort({ "metadata.usage.popularityScore": -1 })
    .limit(limit);
};

reportSchema.statics.getTrending = function (days = 7, limit = 10) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    "access.isPublic": true,
    updatedAt: { $gte: cutoffDate },
  })
    .sort({ "metadata.views": -1, updatedAt: -1 })
    .limit(limit);
};

reportSchema.statics.getRecentlyAnalyzed = function (limit = 5) {
  return this.find({
    "aiInsights.enabled": true,
    "aiInsights.lastAnalysis": { $exists: true },
  })
    .sort({ "aiInsights.lastAnalysis": -1 })
    .limit(limit);
};

reportSchema.statics.getByPerformance = function (minScore = 70, limit = 10) {
  return this.find({
    "metadata.performance.lastPerformanceScore": { $gte: minScore },
  })
    .sort({ "metadata.performance.lastPerformanceScore": -1 })
    .limit(limit);
};

reportSchema.statics.searchReports = function (query, userId, userRole) {
  const searchRegex = new RegExp(query, "i");
  return this.find({
    $and: [
      {
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { "metadata.tags": searchRegex },
        ],
      },
      {
        $or: [
          { "access.isPublic": true },
          { "access.allowedUsers": userId },
          { "access.allowedRoles": userRole },
          { "access.permissions.read": userId },
          { "metadata.createdBy": userId },
        ],
      },
    ],
  }).sort({ "metadata.usage.popularityScore": -1 });
};

// Pre-save middleware to update nextRun for scheduled reports
reportSchema.pre("save", function (next) {
  if (this.schedule.enabled && this.isModified("schedule.frequency")) {
    const now = new Date();
    switch (this.schedule.frequency) {
      case "daily":
        this.schedule.nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "weekly":
        this.schedule.nextRun = new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000
        );
        break;
      case "monthly":
        this.schedule.nextRun = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          now.getDate()
        );
        break;
      case "quarterly":
        this.schedule.nextRun = new Date(
          now.getFullYear(),
          now.getMonth() + 3,
          now.getDate()
        );
        break;
      case "real_time":
        this.schedule.nextRun = new Date(
          now.getTime() + (this.realTime.updateFrequency || 30000)
        );
        break;
    }
  }

  // Auto-increment version on significant changes
  if (this.isModified("configuration") || this.isModified("filters")) {
    const currentVersion = this.metadata.version.current || "1.0.0";
    const [major, minor, patch] = currentVersion.split(".").map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;

    this.metadata.version.history.push({
      version: currentVersion,
      changes: "Configuration or filters updated",
      changedBy: this.metadata.lastModifiedBy,
      changedAt: new Date(),
    });

    this.metadata.version.current = newVersion;
  }

  next();
});

// Post-save middleware for analytics
reportSchema.post("save", function (doc) {
  // Update usage statistics
  this.metadata.usage.totalRuns += 1;

  // Trigger AI analysis if enabled and due
  if (this.aiInsights.enabled) {
    const lastAnalysis = this.aiInsights.lastAnalysis;
    const now = new Date();
    const analysisInterval = 24 * 60 * 60 * 1000; // 24 hours

    if (!lastAnalysis || now - lastAnalysis > analysisInterval) {
      // Queue AI analysis (this would be handled by a background job in production)
      console.log(`Queuing AI analysis for report: ${this.name}`);
    }
  }
});

module.exports = mongoose.model("Report", reportSchema);
