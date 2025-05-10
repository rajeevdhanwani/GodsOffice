const mongoose = require('mongoose');

const clientServiceSchema = new mongoose.Schema({
  clientCode: { type: String, required: true },
  serviceCode: { type: String, required: true },
  teamMemberId: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  financialYear: { type: String, required: true },
});

clientServiceSchema.index({ 'clientCode': 1, 'serviceCode': 1, 'financialYear': 1 }, { unique: true });

module.exports = mongoose.model('ClientService', clientServiceSchema);