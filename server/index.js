const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const taskRoutes = require("./routes/tasks");
const authRoutes = require("./routes/auth");
const clientRoutes = require("./routes/clients");
const importRoutes = require("./routes/imports");

// Load models
require("./models/Client");
require("./models/Team");
require("./models/Service");
require("./models/Task");
require("./models/User");
require("./models/ClientService");

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api", taskRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api", importRoutes);

app.get("/", (req, res) => {
  res.send("GodsOffice Backend is Running!");
});

// Custom 404 handler
app.use((req, res) => {
  console.log(
    `[${new Date().toISOString()}] 404 Not Found: ${req.method} ${req.url}`
  );
  res.status(404).json({ message: "Not Found" });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.log("MongoDB connection error:", err));
