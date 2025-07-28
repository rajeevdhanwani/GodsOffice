const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  serviceCode: { type: String, required: true, unique: true },
  serviceName: { type: String, required: true },
  sacCode: { type: String },
  serviceGroup: { type: String },
  frequency: {
    type: String,
    required: true,
    enum: ["Yearly", "Quarterly", "Monthly", "Weekly", "On Demand"],
  },
  assignmentDates: [{ type: String }],
  dueDate: { type: String },
  shiftNextPeriod: { type: Boolean, default: true }, // Default to true
  repetitive: { type: Boolean, default: false }, // Made optional with default
  remarks: { type: String },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },
});

module.exports = mongoose.model("Service", serviceSchema);