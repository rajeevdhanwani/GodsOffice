// server/index.js
require("dotenv").config(); 
const express = require("express");
const mongoose = require('mongoose');
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");
const os = require("os");





// Function to get local IP (for logging and CORS)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "0.0.0.0";
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enhanced CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  `http://${getLocalIP()}:3000`,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Security headers
app.use((req, res, next) => {
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("X-XSS-Protection", "1; mode=block");
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB with enhanced options
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/office_automation";

    await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully");

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Initialize database connection
connectDB();

// Auth middleware with enhanced error handling
const auth = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({
      message: "No authorization header provided. Access denied.",
    });
  }

  const token = authHeader.replace("Bearer ", "");

  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({
      message: "No token provided or invalid format. Access denied.",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
    req.user = decoded;
    req.isAdmin = decoded.isAdmin || false;
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token has expired. Please login again.",
      });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token format. Please login again.",
      });
    } else {
      return res.status(401).json({
        message: "Token verification failed. Access denied.",
      });
    }
  }
};

// Admin middleware
const adminAuth = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({
      message: "Admin access required for this operation",
    });
  }
  next();
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error("❌ Global error:", err);

  // Handle specific error types
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: "Validation Error",
      errors,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid resource ID format",
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      message: `Duplicate ${field}. This ${field} already exists.`,
    });
  }

  if (err.name === "MongoError" || err.name === "MongooseError") {
    return res.status(503).json({
      message: "Database service temporarily unavailable",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Token expired",
    });
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// API routes with enhanced middleware
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", auth, require("./routes/users"));
app.use("/api/clients", auth, require("./routes/clients"));
app.use("/api/tasks", auth, require("./routes/tasks"));
app.use("/api/teams", auth, require("./routes/teams"));
app.use("/api/records", auth, require("./routes/records"));
app.use("/api/services", auth, require("./routes/services"));
// app.use("/api/upload", auth, require("./routes/upload"));
app.use("/api/config", auth, require("./routes/imports"));
app.use("/api/imports", auth, require("./routes/imports"));
app.use("/api/invoices", auth, require("./routes/invoices"));
app.use("/api/taskbillings", auth, require("./routes/taskbillings"));
app.use("/api/settings", auth, require("./routes/settings")); // Added settings route
app.use("/api/reports", auth, require("./routes/reports")); // Uncomment when you add reports.js

// Cron job
require("./cron"); // Add this line to activate the cron job

const cron = require("node-cron");
cron.schedule("0 0 * * *", async () => {
  await Task.updateMany(
    {
      status: "Pending",
      dueDate: { $lt: new Date() },
      overdue: false,
    },
    { $set: { overdue: true } }
  );
  console.log("Updated overdue status for tasks");
});

// Direct action-stages route for admin compatibility
app.get("/api/action-stages", auth, async (req, res) => {
  try {
    const ActionStage = require("./models/ActionStage");
    const actionStages = await ActionStage.find().sort({ order: 1, name: 1 });
    res.json(actionStages);
  } catch (err) {
    console.error("Error fetching action stages:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/action-stages", auth, adminAuth, async (req, res) => {
  try {
    const ActionStage = require("./models/ActionStage");
    const actionStage = new ActionStage(req.body);
    await actionStage.save();
    res.status(201).json(actionStage);
  } catch (err) {
    console.error("Error creating action stage:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to create action stage" });
  }
});

app.put("/api/action-stages/:id", auth, adminAuth, async (req, res) => {
  try {
    const ActionStage = require("./models/ActionStage");
    const actionStage = await ActionStage.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!actionStage) {
      return res.status(404).json({ message: "Action stage not found" });
    }
    res.json(actionStage);
  } catch (err) {
    console.error("Error updating action stage:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to update action stage" });
  }
});

app.delete("/api/action-stages/:id", auth, adminAuth, async (req, res) => {
  try {
    const ActionStage = require("./models/ActionStage");
    const actionStage = await ActionStage.findByIdAndDelete(req.params.id);
    if (!actionStage) {
      return res.status(404).json({ message: "Action stage not found" });
    }
    res.json({ message: "Action stage deleted successfully" });
  } catch (err) {
    console.error("Error deleting action stage:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to delete action stage" });
  }
});

// Services endpoint for admin
app.get("/api/tasks/services", auth, async (req, res) => {
  try {
    const Service = require("./models/Service");
    const services = await Service.find().sort({ serviceCode: 1 });
    res.json(services);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Client Portfolio endpoint
app.get("/api/clients/:id/portfolio", auth, async (req, res) => {
  try {
    const Task = require("./models/Task");
    const Team = require("./models/Team");
    const Service = require("./models/Service");
    const Client = require("./models/Client");

    const clientId = req.params.id;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const tasks = await Task.find({
      clientCode: client.clientCode,
      status: { $in: ["Pending", "Completed", "Pending-Client", "Upcoming"] },
    }).sort({ assignedAt: -1 });

    const [teamMembers, services] = await Promise.all([
      Team.find({}),
      Service.find({}),
    ]);

    const portfolioMap = new Map();

    tasks.forEach((task) => {
      const key = `${task.serviceCode}-${task.serviceName}`;
      if (!portfolioMap.has(key)) {
        const teamMember = teamMembers.find(
          (t) => t.teamMemberId === task.teamMemberId
        );
        const service = services.find(
          (s) => s.serviceCode === task.serviceCode
        );

        portfolioMap.set(key, {
          serviceCode: task.serviceCode,
          serviceName: task.serviceName,
          teamMemberId: task.teamMemberId,
          teamMemberName: teamMember?.name || "Unknown",
          status: task.status,
          lastTaskDate: task.assignedAt,
          servicePeriod: task.servicePeriod,
          frequency: service?.frequency || "Unknown",
        });
      } else {
        const existing = portfolioMap.get(key);
        if (new Date(task.assignedAt) > new Date(existing.lastTaskDate)) {
          existing.status = task.status;
          existing.lastTaskDate = task.assignedAt;
          existing.servicePeriod = task.servicePeriod;
        }
      }
    });

    const portfolio = Array.from(portfolioMap.values()).sort((a, b) =>
      a.serviceName.localeCompare(b.serviceName)
    );

    res.json({
      client,
      portfolio,
    });
  } catch (err) {
    console.error("Error fetching client portfolio:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Static file serving for uploads (if exists)
const uploadsPath = path.join(__dirname, "Uploads");
if (require("fs").existsSync(uploadsPath)) {
  app.use("/uploads", express.static(uploadsPath));
}

// Enhanced API documentation endpoint
app.get("/api/docs", (req, res) => {
  if (req.query.format === "json") {
    res.json({
      version: "1.0.0",
      name: "Office Automation API",
      description: "Complete task management and client service automation API",
      baseUrl: `http://localhost:${PORT}/api`,
      authentication: "JWT Bearer Token",
      endpoints: {
        authentication: {
          "POST /api/auth/register": "Register new user",
          "POST /api/auth/login": "User login",
          "GET /api/auth/profile": "Get user profile",
          "PUT /api/auth/profile": "Update user profile",
        },
        users: {
          "GET /api/users": "Get all users (admin only)",
          "PUT /api/users/:id": "Update user (admin only)",
          "DELETE /api/users/:id": "Delete user (admin only)",
        },
        records: {
          "GET /api/records": "Get expense records with filtering",
          "POST /api/records": "Create new expense record",
          "PUT /api/records/:id": "Update expense record",
          "DELETE /api/records/:id": "Delete expense record",
          "POST /api/records/approve/:id": "Approve/reject record (admin)",
          "GET /api/records/dashboard/stats": "Get dashboard statistics",
        },
        clients: {
          "GET /api/clients": "Get all clients",
          "POST /api/clients": "Create new client",
          "PUT /api/clients/:id": "Update client",
          "DELETE /api/clients/:id": "Delete client",
        },
        tasks: {
          "GET /api/tasks": "Get tasks with filtering",
          "PUT /api/tasks/:id": "Update task",
          "POST /api/tasks/approve/:id": "Approve/reject task (admin)",
          "POST /api/tasks/task-history": "Log task history",
          "GET /api/tasks/task-history/:taskId": "Get task history",
          "GET /api/tasks/services/names": "Get service names",
          "GET /api/tasks/action-stages": "Get action stages",
          "POST /api/tasks/action-stages": "Create action stage",
          "PUT /api/tasks/action-stages/:id": "Update action stage",
          "DELETE /api/tasks/action-stages/:id": "Delete action stage",
        },
        teams: {
          "GET /api/teams": "Get team members",
          "POST /api/teams": "Create team member",
          "PUT /api/teams/:id": "Update team member",
          "DELETE /api/teams/:id": "Delete team member",
        },
        settings: {
          "GET /api/settings/invoice": "Get invoice settings",
          "POST /api/settings/invoice": "Update invoice settings (admin only)",
        },
      },
      features: {
        authentication: "JWT-based authentication",
        authorization: "Role-based access control",
        adminApproval: "Backdated entries require admin approval",
        auditTrail: "Complete audit logging",
        fileUploads: "Document attachment support",
        returnTracking: "Returnable item tracking",
      },
    });
  }
});

// Catch-all route for undefined API endpoints
app.use("/api/*", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found",
    availableEndpoints: "/api/docs",
  });
});

// Apply global error handler
app.use(errorHandler);

// Serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve React's index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("🔄 SIGTERM received. Shutting down gracefully...");
  mongoose.connection.close(() => {
    console.log("✅ MongoDB connection closed.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🔄 SIGINT received. Shutting down gracefully...");
  mongoose.connection.close(() => {
    console.log("✅ MongoDB connection closed.");
    process.exit(0);
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://${getLocalIP()}:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
});
