// server/routes/records.js
const express = require("express");
const Record = require("../models/Record");
const Client = require("../models/Client");
const Team = require("../models/Team");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const router = express.Router();

// Middleware to check admin status
const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Helper function to log audit actions
const logAuditAction = async (clientCode, clientName, action, userId) => {
  try {
    const auditLog = new AuditLog({
      clientCode: clientCode || "N/A",
      clientName: clientName || "N/A",
      actionPerformed: action,
      userId: userId,
      timestamp: new Date(),
    });
    await auditLog.save();
  } catch (error) {
    console.error("Error logging audit action:", error);
  }
};

// Helper function to check if date is backdated (more than 1 day ago)
const isBackdated = (dateString) => {
  const recordDate = new Date(dateString);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return recordDate < oneDayAgo;
};

// Create a record (Inward or Outward)
router.post("/", async (req, res) => {
  const {
    clientType,
    clientCode,
    clientName,
    broughtBy,
    receiverId,
    receiver,
    recordType,
    mode,
    storageLocation,
    remarks,
    returnable,
    direction,
    giverId,
    linkedInwardId,
    status,
    timestamp,
  } = req.body;

  try {
    // Validate client
    if (clientType === "Client") {
      const client = await Client.findOne({ clientCode });
      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }
    }

    // Validate team members
    if (direction === "Inward") {
      if (!receiverId) {
        return res
          .status(400)
          .json({ message: "Executive-I ID is required for Inward records" });
      }
      const receiverTeamMember = await Team.findOne({
        teamMemberId: receiverId,
      });
      if (!receiverTeamMember) {
        return res
          .status(400)
          .json({ message: "Executive-I not found in team" });
      }
    } else if (direction === "Outward") {
      if (!giverId) {
        return res
          .status(400)
          .json({ message: "Executive-O ID is required for Outward records" });
      }
      const giverTeamMember = await Team.findOne({ teamMemberId: giverId });
      if (!giverTeamMember) {
        return res
          .status(400)
          .json({ message: "Executive-O not found in team" });
      }
      if (!receiver) {
        return res
          .status(400)
          .json({ message: "Receiver name is required for Outward records" });
      }
    }

    // Validate linked inward record for Outward
    if (direction === "Outward" && linkedInwardId) {
      const linkedRecord = await Record.findById(linkedInwardId);
      if (!linkedRecord) {
        return res
          .status(400)
          .json({ message: "Linked inward record not found" });
      }
      if (linkedRecord.direction !== "Inward") {
        return res
          .status(400)
          .json({ message: "Linked record must be an inward record" });
      }
    }

    // Check if the record date is backdated
    const needsApproval = isBackdated(timestamp);

    const record = new Record({
      clientType,
      clientCode: clientCode || "",
      clientName,
      broughtBy: broughtBy || "",
      receiverId: receiverId || "",
      receiver: receiver || "",
      recordType,
      mode,
      storageLocation: storageLocation || "",
      remarks,
      returnable: returnable || false,
      direction,
      giverId: giverId || "",
      linkedInwardId: linkedInwardId || null,
      status: status || "Active",
      timestamp: new Date(timestamp),
      actualTimestamp: new Date(), // Store actual entry time
      createdBy: req.user.userId || req.user.id,
      pendingAdminApproval: needsApproval,
    });

    await record.save();

    // If it's an outward record linked to an inward record, mark the inward record as returned
    if (direction === "Outward" && linkedInwardId) {
      await Record.findByIdAndUpdate(linkedInwardId, { isReturned: true });
    }

    // Log audit action
    await logAuditAction(
      clientCode,
      clientName,
      `Created ${direction} record`,
      req.user.userId
    );

    let message = `${direction} record created successfully`;
    if (needsApproval) {
      message += " (Pending admin approval for backdated entry)";
    }

    res.status(201).json({
      message,
      record,
      pendingAdminApproval: needsApproval,
    });
  } catch (error) {
    console.error("Error creating record:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all records with enhanced filtering
router.get("/", async (req, res) => {
  try {
    const {
      direction,
      page = 1,
      limit = 10,
      clientSearch,
      mode,
      returnable,
      pendingReturns,
    } = req.query;

    // Build filter object
    const filter = {};
    if (direction) filter.direction = direction;

    // Enhanced client search - support both client code and name
    if (clientSearch) {
      filter.$or = [
        { clientCode: { $regex: clientSearch, $options: "i" } },
        { clientName: { $regex: clientSearch, $options: "i" } },
      ];
    }

    if (mode) filter.mode = mode;
    if (returnable !== undefined) filter.returnable = returnable === "true";

    // Filter for pending returns only
    if (pendingReturns === "true") {
      filter.returnable = true;
      filter.isReturned = { $ne: true };
    }

    // Only get approved records (not pending admin approval)
    filter.pendingAdminApproval = { $ne: true };

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const records = await Record.find(filter)
      .sort({ timestamp: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalRecords = await Record.countDocuments(filter);

    res.json({
      records,
      totalRecords,
      currentPage: pageNum,
      totalPages: Math.ceil(totalRecords / limitNum),
    });
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get pending approval records with enhanced information
router.get("/pending", async (req, res) => {
  try {
    // For non-admin users, return empty result instead of 403 error
    if (!req.user.isAdmin) {
      return res.json({ records: [] });
    }

    const { direction } = req.query;
    const filter = { pendingAdminApproval: true };
    if (direction) filter.direction = direction;

    const pendingRecords = await Record.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Add enhanced information to each record
    const recordsWithEnhancedInfo = await Promise.all(
      pendingRecords.map(async (record) => {
        try {
          const creator = record.createdBy
            ? await User.findById(record.createdBy).lean()
            : null;

          // Determine approval type and create descriptive message
          let approvalType = "Unknown";
          let approvalMessage = "";

          if (record.direction === "DELETION_REQUEST") {
            approvalType = "Deletion Request";
            approvalMessage = `Request to delete ${record.recordType} record`;
          } else {
            approvalType = "Backdated Entry";
            const selectedDate = new Date(record.timestamp).toLocaleDateString(
              "en-GB",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            );
            const entryDate = new Date(
              record.actualTimestamp || record.createdAt
            ).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            approvalMessage = `On ${entryDate} backdated entry for ${selectedDate} was created`;
          }

          return {
            ...record,
            createdByName: creator ? creator.username : "Unknown User",
            approvalType,
            approvalMessage,
          };
        } catch (err) {
          console.error("Error fetching creator for record:", record._id, err);
          return {
            ...record,
            createdByName: "Unknown User",
            approvalType: "Unknown",
            approvalMessage: "Unable to determine approval details",
          };
        }
      })
    );

    res.json({
      records: recordsWithEnhancedInfo,
      totalRecords: recordsWithEnhancedInfo.length,
    });
  } catch (error) {
    console.error("Error fetching pending records:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve or reject pending records
router.post("/approve/:id", isAdmin, async (req, res) => {
  try {
    const { approve } = req.body;
    const recordId = req.params.id;

    const record = await Record.findById(recordId);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    if (!record.pendingAdminApproval) {
      return res
        .status(400)
        .json({ message: "Record is not pending approval" });
    }

    if (approve) {
      if (record.direction === "DELETION_REQUEST") {
        // Handle deletion request approval
        const originalRecordId = record.originalRecordId;
        if (originalRecordId) {
          // Find and delete the original record
          const originalRecord = await Record.findById(originalRecordId);
          if (originalRecord) {
            // Handle relationship cleanup
            if (
              originalRecord.direction === "Inward" &&
              originalRecord.returnable &&
              originalRecord.isReturned
            ) {
              await Record.updateMany(
                { linkedInwardId: originalRecord._id },
                { $unset: { linkedInwardId: 1 } }
              );
            }

            if (
              originalRecord.direction === "Outward" &&
              originalRecord.linkedInwardId
            ) {
              await Record.findByIdAndUpdate(originalRecord.linkedInwardId, {
                $unset: { isReturned: 1 },
              });
            }

            await Record.findByIdAndDelete(originalRecordId);
          }
        }

        // Delete the deletion request record
        await Record.findByIdAndDelete(recordId);
        res.json({
          message:
            "Deletion request approved - original record has been deleted",
        });
      } else {
        // Handle regular record approval
        record.pendingAdminApproval = false;
        record.approvedBy = req.user.userId;
        record.approvedAt = new Date();
        await record.save();

        // If it's an outward record linked to an inward record, mark the inward record as returned
        if (record.direction === "Outward" && record.linkedInwardId) {
          await Record.findByIdAndUpdate(record.linkedInwardId, {
            isReturned: true,
          });
        }

        res.json({ message: "Record approved successfully" });
      }
    } else {
      // Reject the request/record
      if (record.direction === "DELETION_REQUEST") {
        await Record.findByIdAndDelete(recordId);
        res.json({ message: "Deletion request rejected" });
      } else {
        await Record.findByIdAndDelete(recordId);
        res.json({ message: "Record rejected and deleted" });
      }
    }
  } catch (error) {
    console.error("Error processing record approval:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete record with admin approval requirement
router.delete("/:id", async (req, res) => {
  try {
    const recordId = req.params.id;

    const record = await Record.findById(recordId);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Check if user can delete this record
    const userId = req.user.userId || req.user.id;
    if (
      record.createdBy &&
      record.createdBy.toString() !== userId &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "You can only delete your own records" });
    }

    // ALL deletions now require admin approval (except if user is admin)
    if (!req.user.isAdmin) {
      // Create a deletion request that needs admin approval
      const deletionRecord = new Record({
        direction: "DELETION_REQUEST",
        clientType: "NonClient", // System-generated record, not an actual client
        clientName: `Deletion Request for: ${record.clientName}`,
        recordType: `Delete ${record.direction} Record`,
        mode: "System",
        remarks: `Request to delete ${record.direction.toLowerCase()} record for ${
          record.clientName
        } dated ${record.timestamp.toDateString()}. Original record type: ${
          record.recordType
        }`,
        timestamp: record.timestamp,
        actualTimestamp: new Date(),
        createdBy: req.user.userId || req.user.id,
        pendingAdminApproval: true,
        originalRecordId: record._id,
      });

      await deletionRecord.save();

      return res.json({
        message:
          "Deletion request submitted for admin approval. Admin will review your request before the record is permanently deleted.",
        requiresApproval: true,
      });
    } else {
      // Direct deletion for admin users

      // If this is a returnable inward record that was marked as returned, unmark the linked outward record
      if (
        record.direction === "Inward" &&
        record.returnable &&
        record.isReturned
      ) {
        await Record.updateMany(
          { linkedInwardId: record._id },
          { $unset: { linkedInwardId: 1 } }
        );
      }

      // If this is an outward record linked to an inward record, unmark the inward record as returned
      if (record.direction === "Outward" && record.linkedInwardId) {
        await Record.findByIdAndUpdate(record.linkedInwardId, {
          $unset: { isReturned: 1 },
        });
      }

      await Record.findByIdAndDelete(recordId);
      res.json({ message: "Record deleted successfully by admin" });
    }
  } catch (error) {
    console.error("Error deleting record:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Dashboard statistics
router.get("/dashboard/stats", async (req, res) => {
  try {
    const [inwardCount, outwardCount, pendingReturns, pendingApprovals] =
      await Promise.all([
        Record.countDocuments({
          direction: "Inward",
          pendingAdminApproval: { $ne: true },
        }),
        Record.countDocuments({
          direction: "Outward",
          pendingAdminApproval: { $ne: true },
        }),
        Record.countDocuments({
          direction: "Inward",
          returnable: true,
          isReturned: { $ne: true },
          pendingAdminApproval: { $ne: true },
        }),
        Record.countDocuments({
          pendingAdminApproval: true,
        }),
      ]);

    res.json({
      inwardCount,
      outwardCount,
      pendingReturns,
      pendingApprovals,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single record
router.get("/:id", async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(record);
  } catch (error) {
    console.error("Error fetching record:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update record
router.put("/:id", async (req, res) => {
  try {
    const recordId = req.params.id;
    const updates = req.body;

    const record = await Record.findById(recordId);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Check permissions
    const userId = req.user.userId || req.user.id;
    if (
      record.createdBy &&
      record.createdBy.toString() !== userId &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "You can only update your own records" });
    }

    const updatedRecord = await Record.findByIdAndUpdate(
      recordId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    // Log audit action
    await logAuditAction(
      updates.clientCode || record.clientCode,
      updates.clientName || record.clientName,
      `Updated ${record.direction} record`,
      req.user.userId
    );

    res.json({ message: "Record updated successfully", record: updatedRecord });
  } catch (error) {
    console.error("Error updating record:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
