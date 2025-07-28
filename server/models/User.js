const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  role: {
    type: String,
    required: true,
    enum: ["Manager", "Executive", "Admin", "Staff"],
  },
  teamMemberId: { type: String, required: false },
}, {
  timestamps: true // This adds createdAt and updatedAt fields automatically
});

module.exports = mongoose.model("User", userSchema);
