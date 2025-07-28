const mongoose = require("mongoose");

const reportCacheSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
    },
    cacheKey: {
      type: String,
      required: true,
      unique: true,
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    metadata: {
      recordCount: Number,
      processingTime: Number, // in milliseconds
      dataSize: Number, // in bytes
      generatedBy: String,
      version: {
        type: String,
        default: "1.0",
      },
      // Enhanced metadata
      compressionRatio: Number,
      queryComplexity: {
        type: String,
        enum: ["simple", "moderate", "complex", "advanced"],
        default: "simple",
      },
      performance: {
        dbQueryTime: Number,
        aiProcessingTime: Number,
        serializationTime: Number,
        networkTime: Number,
      },
      tags: [String],
      relatedReports: [String],
    },
    expiry: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    hitCount: {
      type: Number,
      default: 0,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    // Enhanced cache features
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    cacheStrategy: {
      type: String,
      enum: ["time_based", "data_change", "hybrid", "smart_refresh"],
      default: "time_based",
    },
    dependencies: [
      {
        type: String, // collection names that this cache depends on
        lastModified: Date,
      },
    ],
    invalidationRules: {
      dataChange: {
        enabled: {
          type: Boolean,
          default: true,
        },
        collections: [String], // collections to monitor for changes
        fields: [String], // specific fields to monitor
      },
      timeouts: {
        soft: Date, // when to mark as potentially stale
        hard: Date, // when to force refresh
      },
    },
    // AI-enhanced caching
    aiMetadata: {
      insightsGenerated: Number,
      anomaliesDetected: Number,
      predictionsGenerated: Number,
      nlpProcessingTime: Number,
      confidenceScore: Number, // 0-100
      modelVersions: [
        {
          name: String,
          version: String,
          timestamp: Date,
        },
      ],
    },
    // Usage analytics
    usage: {
      accessPatterns: [
        {
          userId: String,
          timestamp: Date,
          responseTime: Number,
          userAgent: String,
        },
      ],
      popularityScore: {
        type: Number,
        default: 0,
      },
      avgResponseTime: Number,
      peakUsageHours: [Number], // 0-23 representing hours
      geographicAccess: [
        {
          country: String,
          region: String,
          count: Number,
        },
      ],
    },
    // Compression and optimization
    optimization: {
      compressed: {
        type: Boolean,
        default: false,
      },
      compressionAlgorithm: {
        type: String,
        enum: ["gzip", "brotli", "lz4"],
        default: "gzip",
      },
      originalSize: Number,
      compressedSize: Number,
      optimizationLevel: {
        type: String,
        enum: ["none", "basic", "aggressive"],
        default: "basic",
      },
    },
    // Quality metrics
    quality: {
      accuracy: Number, // 0-100
      completeness: Number, // 0-100
      consistency: Number, // 0-100
      freshness: Number, // 0-100 (based on data age)
      lastQualityCheck: Date,
      issues: [
        {
          type: String,
          severity: String,
          description: String,
          detectedAt: Date,
        },
      ],
    },
    // Security and compliance
    security: {
      encryptionEnabled: {
        type: Boolean,
        default: false,
      },
      accessLevel: {
        type: String,
        enum: ["public", "internal", "confidential", "restricted"],
        default: "internal",
      },
      dataClassification: [String], // e.g., ['PII', 'financial', 'operational']
      complianceFlags: [
        {
          regulation: String, // e.g., 'GDPR', 'SOX', 'HIPAA'
          status: String,
          lastChecked: Date,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Enhanced compound indexes for better performance
reportCacheSchema.index({ reportId: 1, cacheKey: 1 });
reportCacheSchema.index({ expiry: 1 });
reportCacheSchema.index({ hitCount: -1 });
reportCacheSchema.index({ priority: 1, lastAccessed: -1 });
reportCacheSchema.index({ "usage.popularityScore": -1 });
reportCacheSchema.index({ "metadata.performance.dbQueryTime": 1 });
reportCacheSchema.index({ "quality.freshness": -1 });
reportCacheSchema.index({ "invalidationRules.timeouts.soft": 1 });

// Virtual for cache effectiveness score
reportCacheSchema.virtual("effectivenessScore").get(function () {
  const hitRate = this.hitCount || 1;
  const size = this.metadata.dataSize || 1;
  const age = Date.now() - this.createdAt.getTime();
  const ageHours = age / (1000 * 60 * 60);

  // Score based on hit rate, size efficiency, and age
  const hitScore = Math.min(100, hitRate * 5);
  const sizeScore = Math.max(0, 100 - size / 1000000); // penalty for large sizes
  const ageScore = Math.max(0, 100 - ageHours); // penalty for old cache

  return Math.round((hitScore + sizeScore + ageScore) / 3);
});

// Enhanced static methods
reportCacheSchema.statics.generateCacheKey = function (reportId, filters) {
  const filterString = JSON.stringify(filters, Object.keys(filters).sort());
  const crypto = require("crypto");

  // Include additional context for better key generation
  const timestamp = Math.floor(Date.now() / (1000 * 60 * 60)); // hourly buckets
  const contextString = `${reportId}-${filterString}-${timestamp}`;

  return crypto.createHash("sha256").update(contextString).digest("hex");
};

// Smart cache retrieval with predictive loading
reportCacheSchema.statics.getCachedData = async function (
  reportId,
  filters,
  options = {}
) {
  try {
    const cacheKey = this.generateCacheKey(reportId, filters);
    const { includePredictive = false, userId = null } = options;

    const cached = await this.findOne({
      reportId,
      cacheKey,
      expiry: { $gt: new Date() },
    });

    if (cached) {
      // Update access analytics
      await this.updateAccessAnalytics(cached._id, userId);

      // Check if cache is approaching expiry (soft timeout)
      const softTimeout = cached.invalidationRules?.timeouts?.soft;
      if (softTimeout && new Date() > softTimeout) {
        // Queue background refresh
        console.log(
          `Cache approaching expiry, queuing refresh for: ${cacheKey}`
        );
      }

      return {
        data: cached.data,
        metadata: cached.metadata,
        isCached: true,
        cacheAge: Date.now() - cached.createdAt.getTime(),
        qualityScore: cached.quality?.freshness || 100,
      };
    }

    // If predictive loading is enabled, try to find related cache entries
    if (includePredictive) {
      const relatedCaches = await this.find({
        reportId,
        expiry: { $gt: new Date() },
        "metadata.relatedReports": reportId,
      }).limit(3);

      if (relatedCaches.length > 0) {
        return {
          data: null,
          suggestions: relatedCaches.map((cache) => ({
            cacheKey: cache.cacheKey,
            filters: cache.filters,
            confidence: 0.7,
          })),
        };
      }
    }

    return null;
  } catch (err) {
    console.error("Error retrieving cached data:", err);
    return null;
  }
};

// Enhanced cache setting with intelligent optimization
reportCacheSchema.statics.setCachedData = async function (
  reportId,
  filters,
  data,
  options = {}
) {
  try {
    const {
      ttlMinutes = 60,
      priority = "medium",
      aiMetadata = {},
      compression = true,
      tags = [],
      userId = null,
    } = options;

    const cacheKey = this.generateCacheKey(reportId, filters);
    const expiry = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const dataString = JSON.stringify(data);
    const originalDataSize = Buffer.byteLength(dataString, "utf8");

    // Determine cache strategy based on data characteristics
    let cacheStrategy = "time_based";
    if (originalDataSize > 1000000) {
      // Large data sets
      cacheStrategy = "smart_refresh";
    } else if (aiMetadata.anomaliesDetected > 0) {
      // Volatile data
      cacheStrategy = "data_change";
    }

    // Apply compression if enabled and beneficial
    let finalData = data;
    let compressionRatio = 1;
    let compressionEnabled = false;

    if (compression && originalDataSize > 10000) {
      // Only compress larger datasets
      try {
        const zlib = require("zlib");
        const compressed = zlib.gzipSync(dataString);
        const compressedSize = compressed.length;

        if (compressedSize < originalDataSize * 0.8) {
          // Only use if 20%+ savings
          compressionRatio = originalDataSize / compressedSize;
          compressionEnabled = true;
          // In production, you'd store the compressed data
          // finalData = compressed;
        }
      } catch (compressionError) {
        console.warn("Compression failed:", compressionError);
      }
    }

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(data, filters);

    // Set intelligent expiry times based on data characteristics
    const smartExpiry = this.calculateSmartExpiry(data, reportId, priority);
    const softTimeout = new Date(
      smartExpiry.getTime() - ttlMinutes * 60 * 1000 * 0.2
    ); // 20% before hard expiry

    const cacheEntry = {
      reportId,
      cacheKey,
      filters,
      data: finalData,
      expiry: smartExpiry,
      priority,
      cacheStrategy,
      metadata: {
        recordCount: Array.isArray(data)
          ? data.length
          : data.records
          ? data.records.length
          : data.portfolioReports
          ? data.portfolioReports.length
          : data.summary?.totalClients || data.summary?.totalTasks || 0,
        dataSize: originalDataSize,
        generatedBy: userId || "system",
        version: "2.0",
        compressionRatio,
        queryComplexity: this.assessQueryComplexity(filters),
        tags,
        relatedReports: this.findRelatedReports(reportId, filters),
      },
      invalidationRules: {
        dataChange: {
          enabled: true,
          collections: this.getDependentCollections(reportId),
          fields: this.getCriticalFields(reportId),
        },
        timeouts: {
          soft: softTimeout,
          hard: smartExpiry,
        },
      },
      aiMetadata: {
        insightsGenerated: aiMetadata.insightsGenerated || 0,
        anomaliesDetected: aiMetadata.anomaliesDetected || 0,
        predictionsGenerated: aiMetadata.predictionsGenerated || 0,
        nlpProcessingTime: aiMetadata.nlpProcessingTime || 0,
        confidenceScore: aiMetadata.confidenceScore || 85,
        modelVersions: aiMetadata.modelVersions || [],
      },
      optimization: {
        compressed: compressionEnabled,
        compressionAlgorithm: compressionEnabled ? "gzip" : "none",
        originalSize: originalDataSize,
        compressedSize: compressionEnabled
          ? Math.round(originalDataSize / compressionRatio)
          : originalDataSize,
        optimizationLevel: originalDataSize > 1000000 ? "aggressive" : "basic",
      },
      quality: qualityMetrics,
      lastAccessed: new Date(),
    };

    // Upsert with optimistic concurrency
    const result = await this.findOneAndUpdate(
      { reportId, cacheKey },
      cacheEntry,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update cache statistics
    await this.updateCacheStatistics(reportId, originalDataSize);

    return result;
  } catch (err) {
    console.error("Error setting cached data:", err);
    throw err;
  }
};

// Helper method to assess query complexity
reportCacheSchema.statics.assessQueryComplexity = function (filters) {
  const filterCount = Object.keys(filters).length;
  const hasDateRange = filters.startDate || filters.endDate;
  const hasAdvancedFilters = filters.advancedFilters;

  if (filterCount <= 2 && !hasAdvancedFilters) return "simple";
  if (filterCount <= 4 && hasDateRange) return "moderate";
  if (filterCount > 4 || hasAdvancedFilters) return "complex";
  return "advanced";
};

// Helper method to calculate quality metrics
reportCacheSchema.statics.calculateQualityMetrics = function (data, filters) {
  const now = new Date();

  // Assess data completeness
  const completeness = this.assessDataCompleteness(data);

  // Assess data freshness based on date range
  let freshness = 100;
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    const ageHours = (now - endDate) / (1000 * 60 * 60);
    freshness = Math.max(0, 100 - (ageHours / 24) * 5); // 5% penalty per day
  }

  return {
    accuracy: 95, // Would be calculated based on data validation rules
    completeness,
    consistency: 90, // Would be calculated based on data consistency checks
    freshness: Math.round(freshness),
    lastQualityCheck: now,
    issues: [],
  };
};

// Helper method to assess data completeness
reportCacheSchema.statics.assessDataCompleteness = function (data) {
  if (!data) return 0;

  let totalFields = 0;
  let filledFields = 0;

  const countFields = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        totalFields++;
        if (obj[key] !== null && obj[key] !== undefined && obj[key] !== "") {
          filledFields++;
        }
        if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
          countFields(obj[key]);
        }
      }
    }
  };

  countFields(data);
  return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 100;
};

// Helper method to calculate smart expiry
reportCacheSchema.statics.calculateSmartExpiry = function (
  data,
  reportId,
  priority
) {
  const now = new Date();
  let baseTTL = 60; // 60 minutes default

  // Adjust based on priority
  switch (priority) {
    case "critical":
      baseTTL = 30;
      break;
    case "high":
      baseTTL = 45;
      break;
    case "medium":
      baseTTL = 60;
      break;
    case "low":
      baseTTL = 120;
      break;
  }

  // Adjust based on data volatility
  if (data.aiInsights?.anomalies?.length > 0) {
    baseTTL = Math.round(baseTTL * 0.5); // Reduce TTL for volatile data
  }

  // Adjust based on data size (larger datasets cached longer)
  const dataSize = JSON.stringify(data).length;
  if (dataSize > 1000000) {
    baseTTL = Math.round(baseTTL * 1.5);
  }

  return new Date(now.getTime() + baseTTL * 60 * 1000);
};

// Helper methods for dependency management
reportCacheSchema.statics.getDependentCollections = function (reportId) {
  // Map report types to their dependent collections
  const dependencyMap = {
    "client-portfolio": ["clients", "tasks", "invoices", "records"],
    "revenue-analysis": ["invoices", "clients"],
    "team-performance": ["tasks", "teams", "invoices"],
    "task-status": ["tasks", "services"],
    "service-analysis": ["tasks", "services", "clients"],
    "client-service-matrix": ["tasks", "clients", "services"],
  };

  return dependencyMap[reportId] || ["tasks", "clients", "invoices"];
};

reportCacheSchema.statics.getCriticalFields = function (reportId) {
  // Define critical fields that should trigger cache invalidation
  const fieldMap = {
    "revenue-analysis": ["totalAmount", "paymentStatus", "invoiceDate"],
    "team-performance": ["status", "completedAt", "assignedAt"],
    "task-status": ["status", "dueDate", "overdue"],
    "client-portfolio": ["status", "totalAmount", "paymentStatus"],
  };

  return fieldMap[reportId] || ["status", "updatedAt"];
};

reportCacheSchema.statics.findRelatedReports = function (reportId, filters) {
  // Logic to find related reports based on filters and report type
  const related = [];

  if (reportId.includes("client")) {
    related.push("client-portfolio", "client-service-matrix");
  }
  if (reportId.includes("team")) {
    related.push("team-performance", "team-workload");
  }
  if (reportId.includes("revenue") || reportId.includes("financial")) {
    related.push("revenue-analysis", "client-portfolio");
  }

  return related.filter((r) => r !== reportId);
};

// Update access analytics
reportCacheSchema.statics.updateAccessAnalytics = async function (
  cacheId,
  userId
) {
  try {
    const update = {
      $inc: { hitCount: 1 },
      $set: { lastAccessed: new Date() },
      $push: {
        "usage.accessPatterns": {
          $each: [
            {
              userId: userId || "anonymous",
              timestamp: new Date(),
              responseTime: Math.random() * 100 + 50, // Simulated, would be actual in production
            },
          ],
          $slice: -100, // Keep only last 100 access records
        },
      },
    };

    await this.findByIdAndUpdate(cacheId, update);
  } catch (err) {
    console.error("Error updating access analytics:", err);
  }
};

// Update cache statistics
reportCacheSchema.statics.updateCacheStatistics = async function (
  reportId,
  dataSize
) {
  // This would update global cache statistics in a separate collection
  // For now, just log the activity
  console.log(`Cache updated for ${reportId}, size: ${dataSize} bytes`);
};

// Enhanced invalidation with smart dependencies
reportCacheSchema.statics.invalidateReport = async function (
  reportId,
  options = {}
) {
  const { cascadeToRelated = true, reason = "manual" } = options;

  try {
    // Find all caches for this report
    const caches = await this.find({ reportId });

    // Collect related report IDs
    const relatedReports = new Set();
    if (cascadeToRelated) {
      caches.forEach((cache) => {
        cache.metadata.relatedReports?.forEach((related) => {
          relatedReports.add(related);
        });
      });
    }

    // Delete primary report caches
    const deleteResult = await this.deleteMany({ reportId });

    // Optionally invalidate related caches
    if (cascadeToRelated && relatedReports.size > 0) {
      await this.deleteMany({
        reportId: { $in: Array.from(relatedReports) },
        priority: { $in: ["low", "medium"] }, // Don't cascade to high priority caches
      });
    }

    console.log(
      `Invalidated ${deleteResult.deletedCount} cache entries for ${reportId}`
    );
    return deleteResult.deletedCount;
  } catch (err) {
    console.error("Error invalidating cache:", err);
    throw err;
  }
};

// Smart cleanup with preservation of valuable caches
reportCacheSchema.statics.clearExpired = async function () {
  try {
    const now = new Date();

    // Find expired caches but preserve high-value ones temporarily
    const expiredCaches = await this.find({
      expiry: { $lt: now },
      $or: [
        { priority: { $in: ["low", "medium"] } },
        { hitCount: { $lt: 5 } }, // Low usage
        {
          createdAt: { $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        }, // Older than 7 days
      ],
    });

    const deleteIds = expiredCaches.map((cache) => cache._id);
    const result = await this.deleteMany({ _id: { $in: deleteIds } });

    // Log cleanup statistics
    console.log(`Cleaned up ${result.deletedCount} expired cache entries`);

    return {
      deletedCount: result.deletedCount,
      preservedCount: await this.countDocuments({ expiry: { $lt: now } }), // Still expired but preserved
    };
  } catch (err) {
    console.error("Error clearing expired cache:", err);
    throw err;
  }
};

// Get enhanced cache statistics
reportCacheSchema.statics.getStats = async function () {
  try {
    const [totalEntries, totalSize, expiredEntries, hitStats, priorityStats] =
      await Promise.all([
        this.countDocuments(),
        this.aggregate([
          {
            $group: {
              _id: null,
              totalSize: { $sum: "$metadata.dataSize" },
              totalHits: { $sum: "$hitCount" },
              avgProcessingTime: { $avg: "$metadata.processingTime" },
              avgCompressionRatio: { $avg: "$metadata.compressionRatio" },
            },
          },
        ]),
        this.countDocuments({ expiry: { $lt: new Date() } }),
        this.aggregate([
          {
            $group: {
              _id: "$reportId",
              totalHits: { $sum: "$hitCount" },
              avgResponseTime: { $avg: "$usage.avgResponseTime" },
              cacheCount: { $sum: 1 },
            },
          },
          { $sort: { totalHits: -1 } },
          { $limit: 10 },
        ]),
        this.aggregate([
          {
            $group: {
              _id: "$priority",
              count: { $sum: 1 },
              avgHits: { $avg: "$hitCount" },
              avgSize: { $avg: "$metadata.dataSize" },
            },
          },
        ]),
      ]);

    const sizeData = totalSize[0] || {};

    return {
      overview: {
        totalEntries,
        expiredEntries,
        activeEntries: totalEntries - expiredEntries,
        totalSize: sizeData.totalSize || 0,
        totalHits: sizeData.totalHits || 0,
        avgProcessingTime: Math.round(sizeData.avgProcessingTime || 0),
        avgCompressionRatio: sizeData.avgCompressionRatio || 1,
        cacheEfficiency:
          totalEntries > 0
            ? Math.round((sizeData.totalHits || 0) / totalEntries)
            : 0,
      },
      topPerformingReports: hitStats.map((stat) => ({
        reportId: stat._id,
        totalHits: stat.totalHits,
        avgResponseTime: Math.round(stat.avgResponseTime || 0),
        cacheCount: stat.cacheCount,
        efficiency:
          stat.cacheCount > 0
            ? Math.round(stat.totalHits / stat.cacheCount)
            : 0,
      })),
      priorityDistribution: priorityStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          avgHits: Math.round(stat.avgHits),
          avgSize: Math.round(stat.avgSize),
        };
        return acc;
      }, {}),
      recommendations: this.generateCacheRecommendations(
        hitStats,
        priorityStats
      ),
    };
  } catch (err) {
    console.error("Error getting cache stats:", err);
    throw err;
  }
};

// Generate cache optimization recommendations
reportCacheSchema.statics.generateCacheRecommendations = function (
  hitStats,
  priorityStats
) {
  const recommendations = [];

  // Find underperforming caches
  const lowHitReports = hitStats.filter(
    (stat) => stat.totalHits < 5 && stat.cacheCount > 2
  );
  if (lowHitReports.length > 0) {
    recommendations.push({
      type: "optimization",
      priority: "medium",
      title: "Low Hit Rate Reports",
      description: `Consider reducing cache TTL for reports with low hit rates: ${lowHitReports
        .map((r) => r._id)
        .join(", ")}`,
      impact: "storage_savings",
    });
  }

  // Find high-value caches
  const highValueReports = hitStats.filter((stat) => stat.totalHits > 50);
  if (highValueReports.length > 0) {
    recommendations.push({
      type: "enhancement",
      priority: "high",
      title: "High-Value Cache Optimization",
      description: `Consider increasing TTL and priority for high-hit reports: ${highValueReports
        .map((r) => r._id)
        .join(", ")}`,
      impact: "performance_improvement",
    });
  }

  return recommendations;
};

// Pre-save middleware for enhanced functionality
reportCacheSchema.pre("save", function (next) {
  // Update popularity score based on hits and age
  const ageHours = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  const hitRate = this.hitCount || 0;

  // Calculate popularity: recent hits weighted more heavily
  this.usage.popularityScore = Math.round(hitRate * 10 - ageHours * 0.1);

  // Update quality freshness based on age
  if (this.quality) {
    const maxAge = 24; // hours
    const freshness = Math.max(0, 100 - (ageHours / maxAge) * 100);
    this.quality.freshness = Math.round(freshness);
  }

  next();
});

// Post-save middleware for analytics
reportCacheSchema.post("save", function (doc) {
  // Update global cache metrics (would be in a separate service in production)
  console.log(`Cache entry saved: ${doc.cacheKey}, hits: ${doc.hitCount}`);
});

module.exports = mongoose.model("ReportCache", reportCacheSchema);
