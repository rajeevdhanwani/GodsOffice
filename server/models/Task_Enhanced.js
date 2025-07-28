const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const TaskSchema = new Schema({
  clientCode: { type: String, required: true },
  serviceCode: { type: String, required: true },
  serviceName: { type: String, required: true },
  teamMemberId: { type: String, required: true },
  assignedAt: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, required: true, default: "Pending" }, // Removed enum for flexibility
  completedAt: { type: Date },
  financialYear: { type: String, required: true },
  relatedFinancialYear: { type: String, required: true },
  servicePeriod: { type: String, required: true },
  overdue: { type: Boolean, default: false },
  remarks: [
    {
      action: String,
      remark: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  
  // ✅ NEW BILLING FIELDS FOR INVOICE INTEGRATION
  billingStatus: { 
    type: String, 
    enum: ["not_billable", "billable", "billed"], 
    default: "not_billable" 
  },
  billingRate: { type: Number, default: 0 }, // Rate for this specific task
  billedInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }, // Track which invoice this was billed in
  billedAmount: { type: Number }, // Amount actually billed for this task
  billedDate: { type: Date }, // When this task was billed
  
  // Additional fields for better task management
  estimatedHours: { type: Number }, // Estimated hours for this task
  actualHours: { type: Number }, // Actual hours spent
  priority: { 
    type: String, 
    enum: ["Low", "Medium", "High"], 
    default: "Medium" 
  },
  
  // Task completion details
  completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  deliverables: [{ 
    name: String, 
    description: String, 
    completed: { type: Boolean, default: false },
    completedAt: Date 
  }]
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// ✅ INDEXES FOR BETTER PERFORMANCE
TaskSchema.index({ clientCode: 1, billingStatus: 1 });
TaskSchema.index({ status: 1, billingStatus: 1 });
TaskSchema.index({ billedInvoiceId: 1 });
TaskSchema.index({ dueDate: 1, status: 1 });

// ✅ VIRTUAL FIELDS
// Check if task is billable (completed and not yet billed)
TaskSchema.virtual('isBillable').get(function() {
  return ['Completed', 'Closed'].includes(this.status) && 
         this.billingStatus !== 'billed';
});

// Calculate billing amount based on rate and hours
TaskSchema.virtual('calculatedBillingAmount').get(function() {
  if (this.billingRate && this.actualHours) {
    return this.billingRate * this.actualHours;
  }
  return this.billingRate || 0;
});

// ✅ INSTANCE METHODS
// Mark task as billable
TaskSchema.methods.markAsBillable = function(rate = null) {
  this.billingStatus = 'billable';
  if (rate !== null) {
    this.billingRate = rate;
  }
  return this.save();
};

// Mark task as billed
TaskSchema.methods.markAsBilled = function(invoiceId, amount = null) {
  this.billingStatus = 'billed';
  this.billedInvoiceId = invoiceId;
  this.billedDate = new Date();
  if (amount !== null) {
    this.billedAmount = amount;
  }
  return this.save();
};

// Unmark from billing (if invoice is cancelled)
TaskSchema.methods.unmarkFromBilling = function() {
  this.billingStatus = this.status === 'Completed' || this.status === 'Closed' ? 'billable' : 'not_billable';
  this.billedInvoiceId = undefined;
  this.billedDate = undefined;
  this.billedAmount = undefined;
  return this.save();
};

// ✅ STATIC METHODS
// Get all billable tasks for a client
TaskSchema.statics.getBillableTasksForClient = function(clientCode) {
  return this.find({
    clientCode: clientCode,
    status: { $in: ['Completed', 'Closed'] },
    billingStatus: { $in: ['billable', 'not_billable'] }
  }).sort({ completedAt: -1, dueDate: -1 });
};

// Get billing summary for a client
TaskSchema.statics.getBillingSummaryForClient = async function(clientCode) {
  const result = await this.aggregate([
    { $match: { clientCode: clientCode } },
    {
      $group: {
        _id: '$billingStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: { $ifNull: ['$billedAmount', 0] } }
      }
    }
  ]);
  
  const summary = {
    total: 0,
    billable: 0,
    billed: 0,
    not_billable: 0,
    totalBilledAmount: 0
  };
  
  result.forEach(item => {
    summary[item._id] = item.count;
    summary.total += item.count;
    if (item._id === 'billed') {
      summary.totalBilledAmount = item.totalAmount;
    }
  });
  
  return summary;
};

// ✅ MIDDLEWARE
// Pre-save middleware to auto-update billing status based on task status
TaskSchema.pre('save', function(next) {
  // If task is completed and billingStatus is not_billable, make it billable
  if (['Completed', 'Closed'].includes(this.status) && this.billingStatus === 'not_billable') {
    this.billingStatus = 'billable';
  }
  
  // If task is not completed and was billable, reset to not_billable (unless already billed)
  if (!['Completed', 'Closed'].includes(this.status) && this.billingStatus === 'billable') {
    this.billingStatus = 'not_billable';
  }
  
  // Update completion percentage based on deliverables
  if (this.deliverables && this.deliverables.length > 0) {
    const completedDeliverables = this.deliverables.filter(d => d.completed).length;
    this.completionPercentage = Math.round((completedDeliverables / this.deliverables.length) * 100);
  }
  
  next();
});

// Post-save middleware for logging
TaskSchema.post('save', function(doc) {
  if (doc.billingStatus === 'billed') {
    console.log(`Task ${doc._id} marked as billed for invoice ${doc.billedInvoiceId}`);
  }
});

module.exports = mongoose.model("Task", TaskSchema);
