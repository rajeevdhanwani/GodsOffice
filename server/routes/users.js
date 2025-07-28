// routes/users.js
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Team = require("../models/Team");

const router = express.Router();

// Note: Authentication middleware is applied at the route level in index.js
// No need for local auth middleware since it's already applied

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Exclude password from response
    
    // Populate team member information
    const usersWithTeamInfo = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        if (user.teamMemberId) {
          const teamMember = await Team.findOne({ teamMemberId: user.teamMemberId });
          if (teamMember) {
            userObj.teamMemberInfo = {
              name: teamMember.name,
              designation: teamMember.designation,
              contact: teamMember.contact,
              role: teamMember.role
            };
          }
        }
        return userObj;
      })
    );
    
    res.json({ data: usersWithTeamInfo });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get available team members for user assignment (excluding already assigned ones)
router.get("/team-members/available", async (req, res) => {
  try {
    const { editingUserId } = req.query; // Optional parameter for when editing a user
    
    // Get all team members
    const allTeamMembers = await Team.find().select(
      "_id teamMemberId name designation contact role"
    );
    
    // Build query to find assigned users
    let userQuery = { 
      teamMemberId: { $exists: true, $ne: null, $ne: "" } 
    };
    
    // If editing a user, exclude that user from the assigned list
    if (editingUserId) {
      userQuery._id = { $ne: editingUserId };
    }
    
    // Get all users with assigned team members (excluding the user being edited)
    const assignedUsers = await User.find(userQuery).select("teamMemberId");
    
    // Extract assigned team member IDs
    const assignedTeamMemberIds = assignedUsers.map(user => user.teamMemberId);
    
    // Filter out already assigned team members
    const availableTeamMembers = allTeamMembers.filter(
      member => !assignedTeamMemberIds.includes(member.teamMemberId)
    );
    
    res.json({ data: availableTeamMembers });
  } catch (err) {
    console.error("Error fetching available team members:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const userObj = user.toObject();
    
    // Populate team member information if teamMemberId exists
    if (user.teamMemberId) {
      const teamMember = await Team.findOne({ teamMemberId: user.teamMemberId });
      if (teamMember) {
        userObj.teamMemberInfo = {
          name: teamMember.name,
          designation: teamMember.designation,
          contact: teamMember.contact,
          role: teamMember.role
        };
      }
    }
    
    res.json({ data: userObj });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new user (Admin only)
router.post("/", async (req, res) => {
  // Check if user is admin
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
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
    if (!["Admin", "Manager", "Executive", "Staff"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

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

    // Return user without password
    const userResponse = {
      _id: user._id,
      username: user.username,
      isAdmin: user.isAdmin,
      role: user.role,
      teamMemberId: user.teamMemberId || null,
    };

    res.status(201).json({
      message: "User created successfully",
      data: userResponse,
    });
  } catch (err) {
    console.error("Create user error:", err);
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Update user (Admin only)
router.put("/:id", async (req, res) => {
  // Check if user is admin
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const { username, password, role, isAdmin, teamMemberId } = req.body;

    // Find the user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prepare update data
    const updateData = {};
    
    if (username) updateData.username = username;
    if (role) {
      if (!["Admin", "Manager", "Executive", "Staff"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      updateData.role = role;
    }
    if (typeof isAdmin === 'boolean') updateData.isAdmin = isAdmin;
    if (teamMemberId !== undefined) updateData.teamMemberId = teamMemberId;

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Check if username is being changed and already exists
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    console.error("Update user error:", err);
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Delete user (Admin only)
router.delete("/:id", async (req, res) => {
  // Check if user is admin
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    // Prevent admin from deleting themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({ 
        message: "Cannot delete your own account" 
      });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "User deleted successfully",
      data: { id: req.params.id }
    });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
