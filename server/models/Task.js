const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  clientCode: { type: String, required: true },
  serviceCode: { type: String, required: true },
  serviceName: { type: String, required: true },
  teamMemberId: { type: String, required: true },
  assignedAt: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, required: true, enum: ['Pending', 'Overdue', 'Pending-Client', 'In Progress', 'Completed', 'Deleted'] },
  completedAt: { type: Date },
  financialYear: { type: String, required: true },
  relatedFinancialYear: { type: String, required: true },
  servicePeriod: { type: String, required: true },
  overdue: { type: Boolean, default: false },
  remarks: [{ action: String, remark: String, timestamp: { type: Date, default: Date.now } }],
});

module.exports = mongoose.model('Task', taskSchema);