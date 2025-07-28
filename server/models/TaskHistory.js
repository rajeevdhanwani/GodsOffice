const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TaskHistorySchema = new Schema({
  taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
  type: { type: String, required: true }, // e.g., "status_change", "reassignment"
  value: { type: String, required: true }, // e.g., new status, new teamMemberId
  remark: { type: String, default: "" }, // User-entered remark
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // User who performed the action
  completedAt: { type: Date },
  pendingApproval: { type: Boolean, default: false },
  pendingAction: { type: String }, // e.g., "delete", "complete"
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model(
  "TaskHistory",
  TaskHistorySchema,
  "taskhistories"
);
