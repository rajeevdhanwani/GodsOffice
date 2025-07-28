const express = require("express");
const Team = require("../models/Team");
const router = express.Router();

// Note: Authentication middleware is applied at the route level in index.js
// No need for local auth middleware since it's already applied

// Get all team members
router.get("/", async (req, res) => {
  try {
    const teamMembers = await Team.find().select(
      "_id teamMemberId name designation contact role"
    );
    res.json({ data: teamMembers });
  } catch (err) {
    console.error("Error fetching team members:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get team member by ID
router.get("/:id", async (req, res) => {
  try {
    const teamMember = await Team.findById(req.params.id);
    if (!teamMember) {
      return res.status(404).json({ message: "Team member not found" });
    }
    res.json(teamMember);
  } catch (err) {
    console.error("Error fetching team member:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new team member (Admin only)
router.post("/", async (req, res) => {
  // Check if user is admin
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const { teamMemberId, name, designation, contact, role } = req.body;

    // Validate required fields
    if (!teamMemberId || !name) {
      return res.status(400).json({
        message: "Team member ID and name are required",
      });
    }

    // Check if team member already exists
    const existingMember = await Team.findOne({ teamMemberId });
    if (existingMember) {
      return res.status(400).json({
        message: "Team member with this ID already exists",
      });
    }

    const newTeamMember = new Team({
      teamMemberId,
      name,
      designation: designation || "",
      contact: contact || "",
      role: role || "Member",
    });

    await newTeamMember.save();
    res.status(201).json({
      message: "Team member created successfully",
      teamMember: newTeamMember,
    });
  } catch (err) {
    console.error("Error creating team member:", err);
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Team member with this ID already exists",
      });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Update team member (Admin only)
router.put("/:id", async (req, res) => {
  // Check if user is admin
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const { name, designation, contact, role } = req.body;

    const updatedTeamMember = await Team.findByIdAndUpdate(
      req.params.id,
      { name, designation, contact, role },
      { new: true, runValidators: true }
    );

    if (!updatedTeamMember) {
      return res.status(404).json({ message: "Team member not found" });
    }

    res.json({
      message: "Team member updated successfully",
      teamMember: updatedTeamMember,
    });
  } catch (err) {
    console.error("Error updating team member:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete team member (Admin only)
router.delete("/:id", async (req, res) => {
  // Check if user is admin
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const deletedTeamMember = await Team.findByIdAndDelete(req.params.id);

    if (!deletedTeamMember) {
      return res.status(404).json({ message: "Team member not found" });
    }

    res.json({ message: "Team member deleted successfully" });
  } catch (err) {
    console.error("Error deleting team member:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
