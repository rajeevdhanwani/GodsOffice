const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  
  // Payment Details
  paymentAmount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  paymentMethod: { 
    type: String, 
    enum: ["cash", "cheque", "neft", "rtgs", "upi", "card", "other"], 
    required: true 
  },
  
  // Reference Details
  referenceNumber: { type: String }, // Cheque/Transaction number
  bankName: { type: String },
  
  // User Tracking
  receivedBy: { type: String, required: true }, // User ID
  
  // Status
  status: { 
    type: String, 
    enum: ["pending", "cleared", "bounced"], 
    default: "cleared" 
  },
  
  // Notes
  remarks: { type: String },
  
}, { 
  timestamps: true 
});

// Static method to calculate total payments for an invoice
paymentSchema.statics.getTotalPaid = async function(invoiceId) {
  const result = await this.aggregate([
    { $match: { invoiceId: mongoose.Types.ObjectId(invoiceId), status: 'cleared' } },
    { $group: { _id: null, totalPaid: { $sum: '$paymentAmount' } } }
  ]);
  
  return result.length > 0 ? result[0].totalPaid : 0;
};

// Update invoice payment status after payment save
paymentSchema.post('save', async function() {
  const Invoice = require('./Invoice');
  const totalPaid = await this.constructor.getTotalPaid(this.invoiceId);
  
  await Invoice.findByIdAndUpdate(this.invoiceId, {
    totalPaid: totalPaid
  });
  
  // Update invoice status
  const invoice = await Invoice.findById(this.invoiceId);
  if (invoice) {
    invoice.updateStatus();
    await invoice.save();
  }
});

module.exports = mongoose.model("Payment", paymentSchema);
