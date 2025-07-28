const express = require("express");
const router = express.Router();
const Service = require("../models/Service");

// Enhanced auth middleware handling with fallback
let auth;
try {
  const authModule = require("../middleware/auth");
  auth =
    authModule.auth ||
    authModule.authenticateToken ||
    authModule.verifyToken ||
    authModule;
} catch (err) {
  console.warn("Auth middleware not found, using fallback authentication");
  auth = (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );
      req.user = decoded;
      next();
    } catch (error) {
      res.status(400).json({ message: "Invalid token." });
    }
  };
}

// Get all services with filtering and pagination
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, frequency, serviceGroup, search } = req.query;

    let filter = {};

    if (frequency) filter.frequency = frequency;
    if (serviceGroup) filter.serviceGroup = serviceGroup;
    if (search) {
      filter.$or = [
        { serviceName: new RegExp(search, "i") },
        { serviceCode: new RegExp(search, "i") },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const services = await Service.find(filter)
      .sort({ serviceName: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(filter);

    res.json({
      services,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ENHANCED: Get service by name (for frequency lookup) with improved matching
router.get("/by-name/:serviceName", auth, async (req, res) => {
  try {
    const { serviceName } = req.params;

    console.log(`🔍 Looking up service frequency for: "${serviceName}"`);

    // Strategy 1: Try exact name match first
    let service = await Service.findOne({
      serviceName: { $regex: new RegExp(`^${serviceName.trim()}$`, "i") },
    });

    // Strategy 2: If not found, try partial match
    if (!service) {
      console.log(`❌ Exact match not found, trying partial match...`);
      service = await Service.findOne({
        serviceName: {
          $regex: new RegExp(
            serviceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          ),
        },
      });
    }

    // Strategy 3: If still not found, try keyword-based matching
    if (!service) {
      console.log(`❌ Partial match not found, trying keyword matching...`);

      // Extract keywords from service name
      const keywords = serviceName
        .toLowerCase()
        .split(/[\s-_]+/)
        .filter((word) => word.length > 2); // Only words longer than 2 chars

      if (keywords.length > 0) {
        // Create regex pattern with keywords
        const keywordPattern = keywords.join("|");
        service = await Service.findOne({
          serviceName: {
            $regex: new RegExp(keywordPattern, "i"),
          },
        });

        if (service) {
          console.log(
            `✅ Found service by keyword matching: ${service.serviceName}`
          );
        }
      }
    }

    // Strategy 4: If still not found, try common service patterns
    if (!service) {
      console.log(`❌ Keyword match not found, trying pattern matching...`);

      const patterns = [
        // GST-related patterns
        { pattern: /(gstr|gst|return)/i, fallback: "Monthly" },
        // TDS patterns
        { pattern: /(tds|tax.*deduct)/i, fallback: "Quarterly" },
        // Audit patterns
        { pattern: /(audit|review)/i, fallback: "Yearly" },
        // ROC patterns
        { pattern: /(roc|registrar|filing)/i, fallback: "Yearly" },
        // Income Tax patterns
        { pattern: /(income.*tax|itr)/i, fallback: "Yearly" },
      ];

      for (const { pattern, fallback } of patterns) {
        if (pattern.test(serviceName)) {
          console.log(
            `🎯 Pattern matched: ${pattern}, suggesting frequency: ${fallback}`
          );
          return res.json({
            serviceCode: "AUTO_DETECTED",
            serviceName: serviceName,
            frequency: fallback,
            serviceGroup: "Auto-detected",
            sacCode: "998314",
            isAutoDetected: true,
            confidence: "pattern-based",
          });
        }
      }
    }

    if (!service) {
      console.log(`❌ Service "${serviceName}" not found in any strategy`);

      // Return a default monthly frequency as fallback
      return res.json({
        serviceCode: "UNKNOWN",
        serviceName: serviceName,
        frequency: "Monthly", // Default fallback
        serviceGroup: "Unknown",
        sacCode: "998314",
        isAutoDetected: true,
        confidence: "fallback",
      });
    }

    console.log(
      `✅ Found service: ${service.serviceName} with frequency: ${service.frequency}`
    );

    res.json({
      serviceCode: service.serviceCode,
      serviceName: service.serviceName,
      frequency: service.frequency,
      serviceGroup: service.serviceGroup,
      sacCode: service.sacCode,
      isAutoDetected: false,
      confidence: "exact-match",
    });
  } catch (err) {
    console.error("Error fetching service by name:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get service by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(service);
  } catch (err) {
    console.error("Error fetching service:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create new service
router.post("/", auth, async (req, res) => {
  try {
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
      remarks,
      priority,
    } = req.body;

    // Validate required fields
    if (!serviceCode || !serviceName || !frequency) {
      return res.status(400).json({
        message: "Service code, service name, and frequency are required",
      });
    }

    // Check if service code already exists
    const existingService = await Service.findOne({ serviceCode });
    if (existingService) {
      return res.status(400).json({
        message: "Service code already exists",
      });
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
      remarks,
      priority,
    });

    await service.save();

    res.status(201).json({
      message: "Service created successfully",
      service,
    });
  } catch (err) {
    console.error("Error creating service:", err);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

// Update service
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      serviceName,
      sacCode,
      serviceGroup,
      frequency,
      assignmentDates,
      dueDate,
      shiftNextPeriod,
      repetitive,
      remarks,
      priority,
    } = req.body;

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Update allowed fields (serviceCode is typically not updatable)
    if (serviceName !== undefined) service.serviceName = serviceName;
    if (sacCode !== undefined) service.sacCode = sacCode;
    if (serviceGroup !== undefined) service.serviceGroup = serviceGroup;
    if (frequency !== undefined) service.frequency = frequency;
    if (assignmentDates !== undefined)
      service.assignmentDates = assignmentDates;
    if (dueDate !== undefined) service.dueDate = dueDate;
    if (shiftNextPeriod !== undefined)
      service.shiftNextPeriod = shiftNextPeriod;
    if (repetitive !== undefined) service.repetitive = repetitive;
    if (remarks !== undefined) service.remarks = remarks;
    if (priority !== undefined) service.priority = priority;

    await service.save();

    res.json({
      message: "Service updated successfully",
      service,
    });
  } catch (err) {
    console.error("Error updating service:", err);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
});

// Delete service
router.delete("/:id", auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    await Service.findByIdAndDelete(req.params.id);

    res.json({
      message: "Service deleted successfully",
      serviceCode: service.serviceCode,
    });
  } catch (err) {
    console.error("Error deleting service:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get unique frequencies
router.get("/meta/frequencies", auth, async (req, res) => {
  try {
    const frequencies = await Service.distinct("frequency");
    res.json(frequencies.sort());
  } catch (err) {
    console.error("Error fetching frequencies:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get unique service groups
router.get("/meta/groups", auth, async (req, res) => {
  try {
    const groups = await Service.distinct("serviceGroup");
    res.json(groups.filter((group) => group).sort());
  } catch (err) {
    console.error("Error fetching service groups:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
