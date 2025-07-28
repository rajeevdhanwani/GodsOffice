import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Save, ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
// import API_BASE_URL from "../config"; // adjust path based on file depth


const states = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const InvoiceSettingsPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    biller1Terminology: "Biller-1",
    biller2Terminology: "Biller-2",
    biller1FirmName: "Default Firm",
    biller2FirmName: "Default Firm",
    biller1InvoicePrefix: "INV-FY",
    biller2InvoicePrefix: "BILL",
    invoiceNumberFormat: "YYYY-SEQ",
    biller1Address: "",
    biller2Address: "",
    biller1Contact: "",
    biller2Contact: "",
    biller1Gstin: "",
    biller2Gstin: "",
    biller1Email: "",
    biller2Email: "",
    biller1Terms:
      "1. Payment due within 7 days.\n2. Late payment charges may apply.\n3. Disputes subject to local jurisdiction.",
    biller2Terms:
      "1. Payment due within 7 days.\n2. Late payment charges may apply.\n3. Disputes subject to local jurisdiction.",
    biller1BankDetails: {
      accountName: "",
      accountNumber: "",
      bankName: "",
      ifsc: "",
      branch: "",
    },
    biller2BankDetails: {
      accountName: "",
      accountNumber: "",
      bankName: "",
      ifsc: "",
      branch: "",
    },
    isBiller1GSTApplicable: true,
    isBiller2GSTApplicable: false,
    biller1State: "",
    biller2State: "",
    startingSequence: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "${API_BASE_URL}/api/settings/invoice",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (response.ok) {
          setSettings({
            biller1Terminology: data.biller1Terminology || "Biller-1",
            biller2Terminology: data.biller2Terminology || "Biller-2",
            biller1FirmName: data.biller1FirmName || "Default Firm",
            biller2FirmName: data.biller2FirmName || "Default Firm",
            biller1InvoicePrefix: data.biller1InvoicePrefix || "INV-FY",
            biller2InvoicePrefix: data.biller2InvoicePrefix || "BILL",
            invoiceNumberFormat: data.invoiceNumberFormat || "YYYY-SEQ",
            biller1Address: data.biller1Address || "",
            biller2Address: data.biller2Address || "",
            biller1Contact: data.biller1Contact || "",
            biller2Contact: data.biller2Contact || "",
            biller1Gstin: data.biller1Gstin || "",
            biller2Gstin: data.biller2Gstin || "",
            biller1Email: data.biller1Email || "",
            biller2Email: data.biller2Email || "",
            biller1Terms:
              data.biller1Terms ||
              "1. Payment due within 7 days.\n2. Late payment charges may apply.\n3. Disputes subject to local jurisdiction.",
            biller2Terms:
              data.biller2Terms ||
              "1. Payment due within 7 days.\n2. Late payment charges may apply.\n3. Disputes subject to local jurisdiction.",
            biller1BankDetails: data.biller1BankDetails || {
              accountName: "",
              accountNumber: "",
              bankName: "",
              ifsc: "",
              branch: "",
            },
            biller2BankDetails: data.biller2BankDetails || {
              accountName: "",
              accountNumber: "",
              bankName: "",
              ifsc: "",
              branch: "",
            },
            isBiller1GSTApplicable:
              data.isBiller1GSTApplicable !== undefined
                ? data.isBiller1GSTApplicable
                : true,
            isBiller2GSTApplicable:
              data.isBiller2GSTApplicable !== undefined
                ? data.isBiller2GSTApplicable
                : false,
            biller1State: data.biller1State || "",
            biller2State: data.biller2State || "",
            startingSequence: data.startingSequence || 1,
          });
        } else {
          setErrors([data.message || "Failed to fetch settings"]);
        }
      } catch (err) {
        setErrors(["Failed to fetch settings"]);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleBankChange = (type, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrors([]);
    try {
      const newErrors = [];
      if (!settings.biller1FirmName.trim()) {
        newErrors.push("Biller-1 Firm Name is required");
      }
      if (!settings.biller2FirmName.trim()) {
        newErrors.push("Biller-2 Firm Name is required");
      }
      if (settings.isBiller1GSTApplicable && !settings.biller1Gstin.trim()) {
        newErrors.push("GSTIN is required for Biller-1 when GST is applicable");
      }
      if (settings.isBiller2GSTApplicable && !settings.biller2Gstin.trim()) {
        newErrors.push("GSTIN is required for Biller-2 when GST is applicable");
      }
      if (!settings.biller1State) {
        newErrors.push("Biller-1 State is required");
      }
      if (!settings.biller2State) {
        newErrors.push("Biller-2 State is required");
      }
      if (settings.startingSequence < 1) {
        newErrors.push("Starting sequence must be a positive number");
      }
      if (newErrors.length > 0) {
        setErrors(newErrors);
        setSaving(false);
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch(
        "${API_BASE_URL}/api/settings/invoice",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(settings),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save settings");
      }
      navigate("/admin");
    } catch (err) {
      setErrors([err.message || "Failed to save settings"]);
    } finally {
      setSaving(false);
    }
  };

  const getSampleInvoiceNumber = (prefix, format) => {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
    const seq = settings.startingSequence.toString().padStart(3, "0");
    if (format === "YYYYMM-SEQ") {
      return `${prefix}${year}${month}${seq}`;
    } else if (format === "YYYY-SEQ") {
      return `${prefix}${year % 100}${seq}`;
    }
    return `${prefix}${seq}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ mb: 4, textAlign: "center" }}>
        📋 Invoice Settings
      </Typography>

      {errors.length > 0 && (
        <Box sx={{ mb: 4 }}>
          {errors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ))}
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, borderRadius: "12px" }}>
            <Typography variant="h5" sx={{ mb: 3, color: "#4e73df" }}>
              Biller-1 Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Biller-1 Terminology"
                  value={settings.biller1Terminology}
                  onChange={(e) =>
                    handleChange("biller1Terminology", e.target.value)
                  }
                  fullWidth
                  helperText="e.g., Official, Primary Biller"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Firm Name"
                  value={settings.biller1FirmName}
                  onChange={(e) =>
                    handleChange("biller1FirmName", e.target.value)
                  }
                  fullWidth
                  required
                  helperText="Firm name for Biller-1 invoices"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>State</InputLabel>
                  <Select
                    value={settings.biller1State}
                    onChange={(e) =>
                      handleChange("biller1State", e.target.value)
                    }
                    label="State"
                  >
                    {states.map((state) => (
                      <MenuItem key={state} value={state}>
                        {state}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  value={settings.biller1Address}
                  onChange={(e) =>
                    handleChange("biller1Address", e.target.value)
                  }
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Biller-1 address"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contact Number"
                  value={settings.biller1Contact}
                  onChange={(e) =>
                    handleChange("biller1Contact", e.target.value)
                  }
                  fullWidth
                  helperText="e.g., +91-123-456-7890"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="GSTIN"
                  value={settings.biller1Gstin}
                  onChange={(e) => handleChange("biller1Gstin", e.target.value)}
                  fullWidth
                  helperText="GSTIN for Biller-1 (required if GST applicable)"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={settings.isBiller1GSTApplicable}
                      onChange={(e) =>
                        handleChange("isBiller1GSTApplicable", e.target.checked)
                      }
                    />
                  }
                  label="GST Applicable"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email"
                  value={settings.biller1Email}
                  onChange={(e) => handleChange("biller1Email", e.target.value)}
                  fullWidth
                  type="email"
                  helperText="Contact email for Biller-1"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Terms and Conditions"
                  value={settings.biller1Terms}
                  onChange={(e) => handleChange("biller1Terms", e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  helperText="Custom terms for Biller-1 invoices"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Bank Details
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Account Name"
                  value={settings.biller1BankDetails.accountName}
                  onChange={(e) =>
                    handleBankChange(
                      "biller1BankDetails",
                      "accountName",
                      e.target.value
                    )
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Account Number"
                  value={settings.biller1BankDetails.accountNumber}
                  onChange={(e) =>
                    handleBankChange(
                      "biller1BankDetails",
                      "accountNumber",
                      e.target.value
                    )
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Bank Name"
                  value={settings.biller1BankDetails.bankName}
                  onChange={(e) =>
                    handleBankChange(
                      "biller1BankDetails",
                      "bankName",
                      e.target.value
                    )
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="IFSC Code"
                  value={settings.biller1BankDetails.ifsc}
                  onChange={(e) =>
                    handleBankChange(
                      "biller1BankDetails",
                      "ifsc",
                      e.target.value
                    )
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Branch"
                  value={settings.biller1BankDetails.branch}
                  onChange={(e) =>
                    handleBankChange(
                      "biller1BankDetails",
                      "branch",
                      e.target.value
                    )
                  }
                  fullWidth
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, borderRadius: "12px" }}>
            <Typography variant="h5" sx={{ mb: 3, color: "#4e73df" }}>
              Biller-2 Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Biller-2 Terminology"
                  value={settings.biller2Terminology}
                  onChange={(e) =>
                    handleChange("biller2Terminology", e.target.value)
                  }
                  fullWidth
                  helperText="e.g., Secondary, Private Biller"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Firm Name"
                  value={settings.biller2FirmName}
                  onChange={(e) =>
                    handleChange("biller2FirmName", e.target.value)
                  }
                  fullWidth
                  required
                  helperText="Firm name for Biller-2 invoices"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>State</InputLabel>
                  <Select
                    value={settings.biller2State}
                    onChange={(e) =>
                      handleChange("biller2State", e.target.value)
                    }
                    label="State"
                  >
                    {states.map((state) => (
                      <MenuItem key={state} value={state}>
                        {state}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  value={settings.biller2Address}
                  onChange={(e) =>
                    handleChange("biller2Address", e.target.value)
                  }
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Biller-2 address"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contact Number"
                  value={settings.biller2Contact}
                  onChange={(e) =>
                    handleChange("biller2Contact", e.target.value)
                  }
                  fullWidth
                  helperText="e.g., +91-123-456-7890"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="GSTIN"
                  value={settings.biller2Gstin}
                  onChange={(e) => handleChange("biller2Gstin", e.target.value)}
                  fullWidth
                  helperText="GSTIN for Biller-2 (required if GST applicable)"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={settings.isBiller2GSTApplicable}
                      onChange={(e) =>
                        handleChange("isBiller2GSTApplicable", e.target.checked)
                      }
                    />
                  }
                  label="GST Applicable"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email"
                  value={settings.biller2Email}
                  onChange={(e) => handleChange("biller2Email", e.target.value)}
                  fullWidth
                  type="email"
                  helperText="Contact email for Biller-2"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Terms and Conditions"
                  value={settings.biller2Terms}
                  onChange={(e) => handleChange("biller2Terms", e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  helperText="Custom terms for Biller-2 invoices"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Bank Details
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Account Name"
                  value={settings.biller2BankDetails.accountName}
                  onChange={(e) =>
                    handleBankChange(
                      "biller2BankDetails",
                      "accountName",
                      e.target.value
                    )
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Account Number"
                  value={settings.biller2BankDetails.accountNumber}
                  onChange={(e) =>
                    handleBankChange(
                      "biller2BankDetails",
                      "accountNumber",
                      e.target.value
                    )
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Bank Name"
                  value={settings.biller2BankDetails.bankName}
                  onChange={(e) =>
                    handleBankChange(
                      "biller2BankDetails",
                      "bankName",
                      e.target.value
                    )
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="IFSC Code"
                  value={settings.biller2BankDetails.ifsc}
                  onChange={(e) =>
                    handleBankChange(
                      "biller2BankDetails",
                      "ifsc",
                      e.target.value
                    )
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Branch"
                  value={settings.biller2BankDetails.branch}
                  onChange={(e) =>
                    handleBankChange(
                      "biller2BankDetails",
                      "branch",
                      e.target.value
                    )
                  }
                  fullWidth
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 4, borderRadius: "12px" }}>
            <Typography variant="h5" sx={{ mb: 3, color: "#4e73df" }}>
              Invoice Numbering Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Biller-1 Invoice Prefix"
                  value={settings.biller1InvoicePrefix}
                  onChange={(e) =>
                    handleChange("biller1InvoicePrefix", e.target.value)
                  }
                  fullWidth
                  helperText={`Sample: ${getSampleInvoiceNumber(
                    settings.biller1InvoicePrefix,
                    settings.invoiceNumberFormat
                  )}`}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Biller-2 Invoice Prefix"
                  value={settings.biller2InvoicePrefix}
                  onChange={(e) =>
                    handleChange("biller2InvoicePrefix", e.target.value)
                  }
                  fullWidth
                  helperText={`Sample: ${getSampleInvoiceNumber(
                    settings.biller2InvoicePrefix,
                    settings.invoiceNumberFormat
                  )}`}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Invoice Number Format</InputLabel>
                  <Select
                    value={settings.invoiceNumberFormat}
                    onChange={(e) =>
                      handleChange("invoiceNumberFormat", e.target.value)
                    }
                    label="Invoice Number Format"
                  >
                    <MenuItem value="YYYY-SEQ">
                      Year-Sequence (e.g., INV-FY25001)
                    </MenuItem>
                    <MenuItem value="SEQ">
                      Sequence Only (e.g., INV-FY001)
                    </MenuItem>
                    <MenuItem value="YYYYMM-SEQ">
                      Year-Month-Sequence (e.g., INV-FY202501001)
                    </MenuItem>
                  </Select>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Choose how invoice numbers are formatted.
                  </Typography>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Starting Sequence"
                  type="number"
                  value={settings.startingSequence}
                  onChange={(e) =>
                    handleChange(
                      "startingSequence",
                      parseInt(e.target.value) || 1
                    )
                  }
                  fullWidth
                  inputProps={{ min: 1 }}
                  helperText="Set the starting sequence number for invoices (one-time setting)"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid
          item
          xs={12}
          sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 4 }}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate("/admin")}
            disabled={saving}
          >
            Back
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSubmit}
            disabled={saving}
            sx={{ backgroundColor: "#4e73df" }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default InvoiceSettingsPage;
