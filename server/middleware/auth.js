// server/middleware/auth.js - Basic Authentication Middleware
const jwt = require("jsonwebtoken");

// Basic authentication middleware
const auth = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    // Use your JWT secret - make sure to set this in your environment variables
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Set admin status based on role
    req.isAdmin = decoded.role === "admin" || decoded.isAdmin === true;

    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(400).json({ message: "Invalid token." });
  }
};

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  if (!req.isAdmin && req.user?.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Admin privileges required." });
  }
  next();
};

// Alternative function names for compatibility
const authenticateToken = auth;
const verifyToken = auth;
const verifyAdmin = adminAuth;
const requireAdmin = adminAuth;

module.exports = {
  auth,
  adminAuth,
  authenticateToken,
  verifyToken,
  verifyAdmin,
  requireAdmin,
};
