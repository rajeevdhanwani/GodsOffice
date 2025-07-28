const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ActionStageSchema = new Schema({
  name: { type: String, required: true, unique: true },
  color: { type: String, default: "#757575" }, // Hex color for UI
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model(
  "ActionStage",
  ActionStageSchema,
  "actionstages"
);
