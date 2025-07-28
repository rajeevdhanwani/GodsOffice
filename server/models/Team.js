const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  teamMemberId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String },
});

module.exports = mongoose.model("Team", teamSchema);
