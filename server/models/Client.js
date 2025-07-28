const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  clientCode: { type: String, required: true, unique: true },
  groupCode: { type: String },
  clientName: { type: String, required: true },
  firmName: { type: String, required: true },
  address: { type: String, required: true },
  gstin: {
    type: String,
    validate: {
      validator: function (v) {
        if (!v) return true; // Allow empty GSTIN
        return /^[A-Z0-9]{15}$/.test(v);
      },
      message: 'GSTIN should be a 15-character alphanumeric string',
    },
  },
  contact: { type: String },
  email: { type: String },
  withUsSince: { type: Date },
});

module.exports = mongoose.model('Client', clientSchema);