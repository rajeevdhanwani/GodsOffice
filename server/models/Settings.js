// server/models/Settings.js
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      enum: ["invoice"],
    },
    invoiceSettings: {
      biller1Terminology: {
        type: String,
        default: "Biller-1",
        trim: true,
      },
      biller2Terminology: {
        type: String,
        default: "Biller-2",
        trim: true,
      },
      biller1FirmName: {
        type: String,
        required: true,
        trim: true,
      },
      biller2FirmName: {
        type: String,
        required: true,
        trim: true,
      },
      biller1InvoicePrefix: {
        type: String,
        default: "INV-FY",
        trim: true,
      },
      biller2InvoicePrefix: {
        type: String,
        default: "BILL",
        trim: true,
      },
      invoiceNumberFormat: {
        type: String,
        default: "YYYY-SEQ",
        enum: ["YYYY-SEQ", "SEQ", "YYYYMM-SEQ"],
      },
      biller1Address: {
        type: String,
        trim: true,
        default: "",
      },
      biller2Address: {
        type: String,
        trim: true,
        default: "",
      },
      biller1Contact: {
        type: String,
        trim: true,
        default: "",
      },
      biller2Contact: {
        type: String,
        trim: true,
        default: "",
      },
      biller1Gstin: {
        type: String,
        trim: true,
        default: "",
      },
      biller2Gstin: {
        type: String,
        trim: true,
        default: "",
      },
      biller1Email: {
        type: String,
        trim: true,
        default: "",
      },
      biller2Email: {
        type: String,
        trim: true,
        default: "",
      },
      biller1Terms: {
        type: String,
        trim: true,
        default:
          "1. Payment due within 7 days.\n2. Late payment charges may apply.\n3. Disputes subject to local jurisdiction.",
      },
      biller2Terms: {
        type: String,
        trim: true,
        default:
          "1. Payment due within 7 days.\n2. Late payment charges may apply.\n3. Disputes subject to local jurisdiction.",
      },
      biller1BankDetails: {
        type: String,
        trim: true,
        default: "",
      },
      biller2BankDetails: {
        type: String,
        trim: true,
        default: "",
      },
      isBiller1GSTApplicable: {
        type: Boolean,
        default: true,
      },
      isBiller2GSTApplicable: {
        type: Boolean,
        default: false,
      },
      biller1State: {
        type: String,
        default: "Chhattisgarh",
        trim: true,
      },
      biller2State: {
        type: String,
        default: "Chhattisgarh",
        trim: true,
      },
      defaultPaymentTerms: {
        type: Number,
        default: 7,
        min: 1,
      },
      latePaymentCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      taxSettings: {
        gstRate: {
          type: Number,
          default: 18,
          min: 0,
          max: 100,
        },
        tdsApplicable: {
          type: Boolean,
          default: false,
        },
        tdsRate: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
settingsSchema.index({ type: 1 });

// Virtual to get flattened settings for easier access
settingsSchema.virtual("flatSettings").get(function () {
  return {
    ...this.invoiceSettings,
    type: this.type,
  };
});

// Method to get biller info based on type
settingsSchema.methods.getBillerInfo = function (isBiller2 = false) {
  const settings = this.invoiceSettings;
  return {
    terminology: isBiller2
      ? settings.biller2Terminology
      : settings.biller1Terminology,
    firmName: isBiller2 ? settings.biller2FirmName : settings.biller1FirmName,
    address: isBiller2 ? settings.biller2Address : settings.biller1Address,
    contact: isBiller2 ? settings.biller2Contact : settings.biller1Contact,
    gstin: isBiller2 ? settings.biller2Gstin : settings.biller1Gstin,
    email: isBiller2 ? settings.biller2Email : settings.biller1Email,
    terms: isBiller2 ? settings.biller2Terms : settings.biller1Terms,
    bankDetails: isBiller2
      ? settings.biller2BankDetails
      : settings.biller1BankDetails,
    state: isBiller2 ? settings.biller2State : settings.biller1State,
    gstApplicable: isBiller2
      ? settings.isBiller2GSTApplicable
      : settings.isBiller1GSTApplicable,
    invoicePrefix: isBiller2
      ? settings.biller2InvoicePrefix
      : settings.biller1InvoicePrefix,
  };
};

// Static method to get or create default settings
settingsSchema.statics.getOrCreateDefault = async function () {
  let settings = await this.findOne({ type: "invoice" });

  if (!settings) {
    settings = new this({
      type: "invoice",
      invoiceSettings: {
        biller1FirmName: "Default Firm",
        biller2FirmName: "Default Firm",
      },
    });
    await settings.save();
  }

  return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);
