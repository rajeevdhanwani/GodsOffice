const mongoose = require("mongoose");

const gstConfigSchema = new mongoose.Schema({
  // Company Information
  companyName: { type: String, required: true },
  companyGSTIN: { type: String, required: true },
  companyAddress: { type: String, required: true },
  companyState: { type: String, required: true },
  companyPAN: { type: String },
  companyPhone: { type: String },
  companyEmail: { type: String },
  companyWebsite: { type: String },
  
  // Logo
  logoPath: { type: String }, // Path to company logo
  
  // GST Rates Configuration
  defaultGSTRate: { type: Number, default: 18 }, // Default GST %
  serviceWiseGST: [{
    serviceCode: String,
    gstRate: Number
  }],
  
  // State-wise GST Logic
  homeState: { type: String, required: true }, // Company's state
  
  // Invoice Configuration
  invoicePrefix: {
    sun: { type: String, default: "INV" },
    moon: { type: String, default: "INT" }
  },
  
  // Terms and Conditions
  invoiceTerms: { type: String, default: "Payment due within 30 days from date of invoice." },
  paymentTerms: { type: String, default: "Payment due within 30 days" },
  
  // Bank Details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    branchName: String
  },
  
  // Additional Settings
  isActive: { type: Boolean, default: true },
  
}, { 
  timestamps: true 
});

// Ensure only one active configuration exists
gstConfigSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

// Static method to get active configuration
gstConfigSchema.statics.getActiveConfig = async function() {
  let config = await this.findOne({ isActive: true });
  
  // If no config exists, create default one
  if (!config) {
    config = new this({
      companyName: "Your Company Name",
      companyGSTIN: "00AAAAA0000A0ZZ",
      companyAddress: "Your Company Address",
      companyState: "Your State",
      homeState: "Your State",
      isActive: true
    });
    await config.save();
  }
  
  return config;
};

module.exports = mongoose.model("GSTConfig", gstConfigSchema);
