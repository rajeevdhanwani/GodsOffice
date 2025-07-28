const mongoose = require("mongoose");

const invoiceLineItemSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  
  // Task Integration
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // Optional for custom items
  serviceCode: { type: String }, // From Task or manual entry
  serviceName: { type: String, required: true },
  sacCode: { type: String }, // Service Accounting Code for GST
  
  // Line Item Details
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true }, // quantity * rate
  
  // Service Period (from Task)
  servicePeriod: { type: String },
  financialYear: { type: String },
  
}, { 
  timestamps: true 
});

// Auto-calculate amount
invoiceLineItemSchema.pre('save', function(next) {
  this.amount = this.quantity * this.rate;
  next();
});

// Static method to calculate invoice totals
invoiceLineItemSchema.statics.calculateInvoiceTotals = async function(invoiceId) {
  const lineItems = await this.find({ invoiceId });
  const subtotal = lineItems.reduce((total, item) => total + item.amount, 0);
  
  return {
    subtotal,
    lineItemsCount: lineItems.length
  };
};

module.exports = mongoose.model("InvoiceLineItem", invoiceLineItemSchema);
