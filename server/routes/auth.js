// routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      {
        id: user._id,
        userId: user._id.toString(),
        username: user.username,
        isAdmin: user.isAdmin,
        role: user.role,
        teamMemberId: user.teamMemberId || null,
      },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1h" }
    );
    res.json({
      token,
      user: {
        id: user._id,
        userId: user._id.toString(),
        username: user.username,
        isAdmin: user.isAdmin,
        role: user.role,
        teamMemberId: user.teamMemberId || null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Register route
router.post("/register", async (req, res) => {
  const {
    username,
    password,
    role,
    isAdmin = false,
    teamMemberId = null,
  } = req.body;

  // Validate required fields
  if (!username || !password || !role) {
    return res
      .status(400)
      .json({ message: "Username, password, and role are required" });
  }

  // Validate role
  if (!["Admin", "TeamMember", "Manager", "Executive"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      username,
      password: hashedPassword,
      isAdmin,
      role,
      teamMemberId,
    });

    // Save user to database
    await user.save();

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        role: user.role,
        teamMemberId: user.teamMemberId || null,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user details
router.get("/user", (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
    res.json({
      id: decoded.id,
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      isAdmin: decoded.isAdmin || false,
      role: decoded.role || "TeamMember",
      teamMemberId: decoded.teamMemberId || null,
    });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ message: "Invalid token" });
  }
});

// 🔧 ADDED: Get user profile (alias for /user route)
router.get("/profile", (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
    res.json({
      id: decoded.id,
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      isAdmin: decoded.isAdmin || false,
      role: decoded.role || "TeamMember",
      teamMemberId: decoded.teamMemberId || null,
    });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
