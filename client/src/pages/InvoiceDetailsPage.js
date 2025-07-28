// client/src/pages/InvoiceDetailsPage.js - ENHANCED WITH COMPREHENSIVE PAYMENT SYSTEM
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Fade,
  Slide,
  FormControl,
  InputLabel,
  Select,
  Card,
  List,
  ListItem,
  ListItemText as MuiListItemText,
} from "@mui/material";
import {
  Receipt,
  Download,
  Edit,
  Payment,
  MoreVert,
  Print,
  Share,
  CheckCircle,
  PendingActions,
  Warning,
  Info,
  Business,
  AttachMoney,
  Description,
  ArrowBack,
  Visibility,
  GetApp,
  Add,
  Delete,
  AccountBalance,
  CreditCard,
  Money,
} from "@mui/icons-material";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import {
  formatIndianCurrency,
  formatInvoiceForDisplay,
  formatIndianDate,
} from "../utils/invoiceUtils";

const InvoiceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Core state
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [showSinglePaymentDialog, setShowSinglePaymentDialog] = useState(false);
  const [showMultiplePaymentsDialog, setShowMultiplePaymentsDialog] =
    useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Payment state
  const [singlePaymentData, setSinglePaymentData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    method: "Bank Transfer",
    reference: "",
    notes: "",
  });

  const [multiplePayments, setMultiplePayments] = useState([
    {
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      method: "Cash",
      reference: "",
      notes: "",
    },
  ]);

  const paymentMethods = [
    {
      value: "Bank Transfer",
      label: "Bank Transfer",
      icon: <AccountBalance />,
    },
    { value: "Cash", label: "Cash", icon: <Money /> },
    { value: "Cheque", label: "Cheque", icon: <Receipt /> },
    { value: "Credit Card", label: "Credit Card", icon: <CreditCard /> },
    { value: "Debit Card", label: "Debit Card", icon: <CreditCard /> },
    { value: "UPI", label: "UPI", icon: <Payment /> },
    { value: "Online Payment", label: "Online Payment", icon: <Payment /> },
    { value: "NEFT", label: "NEFT", icon: <AccountBalance /> },
    { value: "RTGS", label: "RTGS", icon: <AccountBalance /> },
    { value: "IMPS", label: "IMPS", icon: <AccountBalance /> },
    { value: "Other", label: "Other", icon: <Payment /> },
  ];

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        if (!token || token === "null" || token === "undefined") {
          setError("Authentication required. Please login again.");
          navigate("/login");
          return;
        }

        const response = await fetch(
          `http://localhost:5000/api/invoices/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch invoice`);
        }

        const data = await response.json();
        const formattedInvoice = formatInvoiceForDisplay(data);
        setInvoice(formattedInvoice);

        // Set default payment amount to remaining balance
        const remainingBalance =
          (formattedInvoice.totalAmount || 0) -
          (formattedInvoice.paidAmount || 0);
        setSinglePaymentData((prev) => ({
          ...prev,
          amount: remainingBalance.toString(),
        }));
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError(err.message || "Failed to load invoice details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    }
  }, [id, navigate]);

  // Memoized calculations
  const invoiceStats = useMemo(() => {
    if (!invoice?.services)
      return { taskServices: 0, customServices: 0, totalServices: 0 };
    const taskServices = invoice.services.filter((s) => !s.isCustom).length;
    const customServices = invoice.services.filter((s) => s.isCustom).length;
    return {
      taskServices,
      customServices,
      totalServices: invoice.services.length,
    };
  }, [invoice?.services]);

  const invoiceStatus = useMemo(() => {
    if (!invoice) return { status: "unknown", color: "default", icon: Info };
    if (invoice.isPaid || invoice.paymentStatus === "Fully Paid") {
      return { status: "Paid", color: "success", icon: CheckCircle };
    } else if (invoice.isOverdue) {
      return { status: "Overdue", color: "error", icon: Warning };
    } else if (invoice.paymentStatus === "Partially Paid") {
      return {
        status: "Partially Paid",
        color: "warning",
        icon: PendingActions,
      };
    } else {
      return { status: "Pending", color: "warning", icon: PendingActions };
    }
  }, [invoice]);

  const remainingBalance = useMemo(() => {
    if (!invoice) return 0;
    return (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
  }, [invoice]);

  const totalMultiplePayments = useMemo(() => {
    return multiplePayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0
    );
  }, [multiplePayments]);

  // Generate unique keys for services
  const serviceRows = useMemo(() => {
    if (!invoice?.services) return [];
    return invoice.services.map((service, index) => {
      const uniqueKey = service._id
        ? `service-${service._id}`
        : `service-${index}-${service.serviceName || "unknown"}-${
            service.amount || 0
          }-${service.isCustom ? "custom" : "task"}-${
            service.serviceCode || "no-code"
          }`;
      return {
        ...service,
        uniqueKey,
        index,
      };
    });
  }, [invoice?.services]);

  // Event handlers
  const handleActionMenuOpen = useCallback((event) => {
    setActionMenuAnchor(event.currentTarget);
  }, []);

  const handleActionMenuClose = useCallback(() => {
    setActionMenuAnchor(null);
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!invoice) return;
    setDownloadingPdf(true);
    handleActionMenuClose();
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/invoices/${id}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanInvoiceNumber =
        invoice.invoiceNumber?.replace("#", "") || "invoice";
      link.download = `invoice-${cleanInvoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      setError("Failed to download PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  }, [invoice, id]);

  // Handle single payment
  const handleLogSinglePayment = useCallback(async () => {
    if (
      !singlePaymentData.amount ||
      parseFloat(singlePaymentData.amount) <= 0
    ) {
      setError("Please enter a valid payment amount");
      return;
    }

    if (!singlePaymentData.method) {
      setError("Please select a payment method");
      return;
    }

    setPaymentLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/invoices/${id}/payments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: parseFloat(singlePaymentData.amount),
            paymentDate: singlePaymentData.paymentDate,
            method: singlePaymentData.method,
            reference: singlePaymentData.reference,
            notes: singlePaymentData.notes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to log payment");
      }

      const updatedInvoice = await response.json();
      setInvoice(
        formatInvoiceForDisplay(updatedInvoice.invoice || updatedInvoice)
      );
      setShowSinglePaymentDialog(false);

      // Reset form
      setSinglePaymentData({
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        method: "Bank Transfer",
        reference: "",
        notes: "",
      });

      setError("");
    } catch (err) {
      console.error("Error logging payment:", err);
      setError(err.message || "Failed to log payment. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  }, [singlePaymentData, id]);

  // Handle multiple payments
  const handleLogMultiplePayments = useCallback(async () => {
    // Validate all payments
    const validPayments = multiplePayments.filter(
      (p) => p.amount && parseFloat(p.amount) > 0 && p.method
    );

    if (validPayments.length === 0) {
      setError("Please add at least one valid payment");
      return;
    }

    setPaymentLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      // Log each payment individually
      for (const payment of validPayments) {
        const response = await fetch(
          `http://localhost:5000/api/invoices/${id}/payments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              amount: parseFloat(payment.amount),
              paymentDate: payment.paymentDate,
              method: payment.method,
              reference: payment.reference,
              notes: payment.notes,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to log payment");
        }
      }

      // Refresh invoice data
      const invoiceResponse = await fetch(
        `http://localhost:5000/api/invoices/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (invoiceResponse.ok) {
        const updatedInvoice = await invoiceResponse.json();
        setInvoice(formatInvoiceForDisplay(updatedInvoice));
      }

      setShowMultiplePaymentsDialog(false);

      // Reset form
      setMultiplePayments([
        {
          amount: "",
          paymentDate: new Date().toISOString().split("T")[0],
          method: "Cash",
          reference: "",
          notes: "",
        },
      ]);

      setError("");
    } catch (err) {
      console.error("Error logging multiple payments:", err);
      setError(err.message || "Failed to log payments. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  }, [multiplePayments, id]);

  // Payment management functions
  const addPaymentRow = () => {
    setMultiplePayments([
      ...multiplePayments,
      {
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        method: "Cash",
        reference: "",
        notes: "",
      },
    ]);
  };

  const removePaymentRow = (index) => {
    if (multiplePayments.length > 1) {
      setMultiplePayments(multiplePayments.filter((_, i) => i !== index));
    }
  };

  const updatePaymentRow = (index, field, value) => {
    setMultiplePayments((prev) =>
      prev.map((payment, i) =>
        i === index ? { ...payment, [field]: value } : payment
      )
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <Paper
          elevation={8}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: 4,
            borderRadius: 3,
            background: "white",
          }}
        >
          <CircularProgress size={60} sx={{ color: "#1976d2", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading invoice details...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error && !invoice) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          variant="filled"
          sx={{ borderRadius: 2, mb: 3 }}
        >
          {error}
        </Alert>
        <Button
          component={Link}
          to="/invoices"
          variant="outlined"
          startIcon={<ArrowBack />}
          sx={{ borderRadius: 2 }}
        >
          Back to Invoices
        </Button>
      </Container>
    );
  }

  if (!invoice) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" variant="filled" sx={{ borderRadius: 2 }}>
          Invoice not found
        </Alert>
      </Container>
    );
  }

  const StatusIcon = invoiceStatus.icon;

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        py: 3,
      }}
    >
      <Container maxWidth="xl">
        {/* Success Message */}
        {location.state?.message && (
          <Fade in={true}>
            <Alert
              severity="success"
              variant="filled"
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => navigate(location.pathname, { replace: true })}
            >
              {location.state.message}
            </Alert>
          </Fade>
        )}

        {/* Error Alert */}
        {error && (
          <Fade in={true}>
            <Alert
              severity="error"
              variant="filled"
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {/* Header Section */}
        <Paper
          elevation={6}
          sx={{ borderRadius: 3, overflow: "hidden", mb: 3 }}
        >
          <Box
            sx={{
              background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
              color: "white",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
                animation: "shimmer 3s ease-in-out infinite",
              },
              "@keyframes shimmer": {
                "0%": { transform: "translateX(-100%)" },
                "100%": { transform: "translateX(100%)" },
              },
            }}
          >
            <Box sx={{ position: "relative", zIndex: 1, p: 4 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Receipt sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{ fontWeight: 700, mb: 0.5 }}
                      >
                        Invoice{" "}
                        {invoice.invoiceNumber?.replace("#", "") || "Details"}
                      </Typography>
                      <Typography
                        variant="h6"
                        component="h2"
                        sx={{ opacity: 0.9, fontWeight: 400 }}
                      >
                        {invoice.clientName} • {invoice.displayInvoiceDate}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Chip
                      icon={<StatusIcon />}
                      label={invoiceStatus.status}
                      color={invoiceStatus.color}
                      variant="filled"
                      sx={{
                        color: "white",
                        fontWeight: 600,
                        "& .MuiChip-icon": { color: "white" },
                      }}
                    />
                    <Chip
                      label={`${invoiceStats.totalServices} Services`}
                      variant="outlined"
                      sx={{
                        borderColor: "white",
                        color: "white",
                        "& .MuiChip-label": { color: "white" },
                      }}
                    />
                    <Chip
                      label={formatIndianCurrency(invoice.totalAmount || 0)}
                      variant="outlined"
                      sx={{
                        borderColor: "white",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        "& .MuiChip-label": { color: "white" },
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      justifyContent: { xs: "center", md: "flex-end" },
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      component={Link}
                      to="/invoices"
                      variant="outlined"
                      startIcon={<ArrowBack />}
                      sx={{
                        borderColor: "white",
                        color: "white",
                        borderRadius: 2,
                        "&:hover": {
                          borderColor: "white",
                          background: "rgba(255,255,255,0.1)",
                        },
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      component={Link}
                      to={`/invoices/${id}/edit`}
                      variant="contained"
                      startIcon={<Edit />}
                      sx={{
                        background: "white",
                        color: "#1976d2",
                        borderRadius: 2,
                        "&:hover": {
                          background: "rgba(255,255,255,0.9)",
                        },
                      }}
                    >
                      Edit
                    </Button>
                    <IconButton
                      onClick={handleActionMenuOpen}
                      sx={{
                        color: "white",
                        border: "1px solid white",
                        borderRadius: 2,
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {/* Client Information */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={4}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                height: "fit-content",
              }}
            >
              <Box
                sx={{
                  background:
                    "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
                  color: "white",
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Business />
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: 600 }}
                >
                  Client Information
                </Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Client Name
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      {invoice.salutation} {invoice.clientName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Client Code
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {invoice.clientCode || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      GSTIN
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {invoice.gstin || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Address
                    </Typography>
                    <Typography variant="body1">
                      {invoice.address || "No address provided"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Place of Supply
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {invoice.placeOfSupply || "N/A"}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Paper>
          </Grid>

          {/* Payment & Amount Summary */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={4}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                height: "fit-content",
              }}
            >
              <Box
                sx={{
                  background:
                    "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                  color: "white",
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <AttachMoney />
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: 600 }}
                >
                  Payment Summary
                </Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography>Subtotal:</Typography>
                      <Typography>
                        {formatIndianCurrency(
                          invoice.taxDetails?.taxableAmount ||
                            invoice.totalAmount
                        )}
                      </Typography>
                    </Box>

                    {invoice.taxDetails && invoice.taxDetails.gstRate > 0 && (
                      <>
                        {invoice.taxDetails.cgst > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <Typography>
                              CGST ({invoice.taxDetails.gstRate / 2}%):
                            </Typography>
                            <Typography>
                              {formatIndianCurrency(invoice.taxDetails.cgst)}
                            </Typography>
                          </Box>
                        )}
                        {invoice.taxDetails.sgst > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <Typography>
                              SGST ({invoice.taxDetails.gstRate / 2}%):
                            </Typography>
                            <Typography>
                              {formatIndianCurrency(invoice.taxDetails.sgst)}
                            </Typography>
                          </Box>
                        )}
                        {invoice.taxDetails.igst > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <Typography>
                              IGST ({invoice.taxDetails.gstRate}%):
                            </Typography>
                            <Typography>
                              {formatIndianCurrency(invoice.taxDetails.igst)}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6">Total Amount:</Typography>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 700, color: "#1976d2" }}
                      >
                        {formatIndianCurrency(invoice.totalAmount)}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography>Paid Amount:</Typography>
                      <Typography sx={{ color: "#4caf50" }}>
                        {formatIndianCurrency(invoice.paidAmount || 0)}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Typography sx={{ fontWeight: 600 }}>
                        Balance Due:
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          color: remainingBalance > 0 ? "#f44336" : "#4caf50",
                        }}
                      >
                        {formatIndianCurrency(remainingBalance)}
                      </Typography>
                    </Box>

                    {/* Payment Buttons */}
                    {remainingBalance > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          mt: 3,
                        }}
                      >
                        <Button
                          variant="contained"
                          startIcon={<Payment />}
                          onClick={() => setShowSinglePaymentDialog(true)}
                          fullWidth
                          sx={{
                            backgroundColor: "#4caf50",
                            "&:hover": { backgroundColor: "#388e3c" },
                          }}
                        >
                          Log Single Payment
                        </Button>

                        <Button
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={() => setShowMultiplePaymentsDialog(true)}
                          fullWidth
                        >
                          Log Multiple Payments
                        </Button>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Paper>
          </Grid>

          {/* Services Section */}
          <Grid item xs={12}>
            <Paper elevation={4} sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box
                sx={{
                  background:
                    "linear-gradient(135deg, #9c27b0 0%, #8e24aa 100%)",
                  color: "white",
                  p: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Description />
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{ fontWeight: 600 }}
                    >
                      Services & Line Items
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      label={`${invoiceStats.taskServices} Task Services`}
                      variant="outlined"
                      size="small"
                      sx={{
                        borderColor: "white",
                        color: "white",
                        "& .MuiChip-label": { color: "white" },
                      }}
                    />
                    <Chip
                      label={`${invoiceStats.customServices} Custom Services`}
                      variant="outlined"
                      size="small"
                      sx={{
                        borderColor: "white",
                        color: "white",
                        "& .MuiChip-label": { color: "white" },
                      }}
                    />
                  </Box>
                </Box>
              </Box>
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{ fontWeight: 700, background: "#f5f5f5" }}
                      >
                        Type
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, background: "#f5f5f5" }}
                      >
                        Service Name
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, background: "#f5f5f5" }}
                      >
                        Period
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, background: "#f5f5f5" }}
                      >
                        HSN/SAC
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, background: "#f5f5f5" }}
                      >
                        Amount
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {serviceRows.map((service) => (
                      <TableRow
                        key={service.uniqueKey}
                        sx={{
                          "&:hover": {
                            background: "rgba(156, 39, 176, 0.04)",
                          },
                          transition: "background-color 0.2s ease",
                        }}
                      >
                        <TableCell>
                          <Chip
                            label={service.isCustom ? "Custom" : "Task"}
                            color={service.isCustom ? "secondary" : "primary"}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              {service.serviceName || "Unknown Service"}
                            </Typography>
                            {service.description && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {service.description}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {service.servicePeriod || "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: "monospace" }}
                          >
                            {service.sacCode || "998314"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              color: "#4caf50",
                              fontFamily: "monospace",
                            }}
                          >
                            {formatIndianCurrency(service.amount || 0)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Total Section */}
              <Box
                sx={{
                  p: 3,
                  background:
                    "linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)",
                  borderTop: "2px solid #e0e0e0",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Total Amount:
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      color: "#4caf50",
                      fontFamily: "monospace",
                    }}
                  >
                    {formatIndianCurrency(invoice.totalAmount || 0)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Payment History */}
          {(invoice.payments || []).length > 0 && (
            <Grid item xs={12}>
              <Paper elevation={4} sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box
                  sx={{
                    background:
                      "linear-gradient(135deg, #607d8b 0%, #546e7a 100%)",
                    color: "white",
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Payment />
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ fontWeight: 600 }}
                  >
                    Payment History
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <List>
                    {(invoice.payments || []).map((payment, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <MuiListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography variant="body1">
                                {formatIndianCurrency(payment.amount)}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {formatIndianDate(payment.paymentDate)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                Method: {payment.method}
                              </Typography>
                              {payment.reference && (
                                <Typography variant="body2">
                                  Ref: {payment.reference}
                                </Typography>
                              )}
                              {payment.notes && (
                                <Typography variant="body2">
                                  Notes: {payment.notes}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Paper>
            </Grid>
          )}

          {/* Notes Section */}
          {(invoice.notes || invoice.customerNotes) && (
            <Grid item xs={12}>
              <Paper elevation={4} sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box
                  sx={{
                    background:
                      "linear-gradient(135deg, #607d8b 0%, #546e7a 100%)",
                    color: "white",
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Info />
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ fontWeight: 600 }}
                  >
                    Additional Information
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    {invoice.customerNotes && (
                      <Grid item xs={12} md={6}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Customer Notes
                        </Typography>
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, background: "#f9f9f9", borderRadius: 2 }}
                        >
                          <Typography
                            variant="body1"
                            sx={{ whiteSpace: "pre-wrap" }}
                          >
                            {invoice.customerNotes}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {invoice.notes && (
                      <Grid item xs={12} md={6}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Internal Notes
                        </Typography>
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, background: "#fff3e0", borderRadius: 2 }}
                        >
                          <Typography
                            variant="body1"
                            sx={{ whiteSpace: "pre-wrap" }}
                          >
                            {invoice.notes}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Paper>
            </Grid>
          )}

          {/* Action Panel */}
          <Grid item xs={12}>
            <Paper elevation={6} sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box
                sx={{
                  background:
                    "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
                  color: "white",
                  p: 3,
                }}
              >
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  Actions
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Button
                    variant="contained"
                    startIcon={
                      downloadingPdf ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <Download />
                      )
                    }
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    sx={{
                      background: "white",
                      color: "#2196f3",
                      "&:hover": { background: "rgba(255,255,255,0.9)" },
                      borderRadius: 2,
                    }}
                  >
                    {downloadingPdf ? "Generating PDF..." : "Download PDF"}
                  </Button>
                  {remainingBalance > 0 && (
                    <Button
                      variant="contained"
                      startIcon={<Payment />}
                      onClick={() => setShowSinglePaymentDialog(true)}
                      sx={{
                        background: "#4caf50",
                        "&:hover": { background: "#45a049" },
                        borderRadius: 2,
                      }}
                    >
                      Log Payment
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    startIcon={<Visibility />}
                    onClick={() =>
                      window.open(`/invoices/${id}/preview`, "_blank")
                    }
                    sx={{
                      background: "#ff9800",
                      "&:hover": { background: "#f57c00" },
                      borderRadius: 2,
                    }}
                  >
                    Preview
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Action Menu */}
        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={handleActionMenuClose}
          TransitionComponent={Fade}
          PaperProps={{
            elevation: 8,
            sx: { borderRadius: 2, minWidth: 180 },
          }}
        >
          <MenuItem onClick={handleDownloadPdf} disabled={downloadingPdf}>
            <ListItemIcon>
              {downloadingPdf ? <CircularProgress size={20} /> : <GetApp />}
            </ListItemIcon>
            <ListItemText>Download PDF</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => window.print()}>
            <ListItemIcon>
              <Print />
            </ListItemIcon>
            <ListItemText>Print</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              navigator.share?.({
                title: `Invoice ${invoice.invoiceNumber?.replace("#", "")}`,
                text: `Invoice for ${invoice.clientName}`,
                url: window.location.href,
              });
              handleActionMenuClose();
            }}
          >
            <ListItemIcon>
              <Share />
            </ListItemIcon>
            <ListItemText>Share</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            component={Link}
            to={`/invoices/${id}/edit`}
            onClick={handleActionMenuClose}
          >
            <ListItemIcon>
              <Edit />
            </ListItemIcon>
            <ListItemText>Edit Invoice</ListItemText>
          </MenuItem>
        </Menu>

        {/* Single Payment Dialog */}
        <Dialog
          open={showSinglePaymentDialog}
          onClose={() => setShowSinglePaymentDialog(false)}
          maxWidth="sm"
          fullWidth
          TransitionComponent={Slide}
          TransitionProps={{ direction: "up" }}
          PaperProps={{
            sx: { borderRadius: 3 },
          }}
        >
          <DialogTitle
            sx={{
              background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Payment />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Log Payment
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 3, mt: 2 }}>
            {/* Balance Info */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>
                  Balance Due: {formatIndianCurrency(remainingBalance)}
                </strong>
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Payment Amount"
                  type="number"
                  value={singlePaymentData.amount}
                  onChange={(e) =>
                    setSinglePaymentData((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  fullWidth
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText={`Remaining balance: ${formatIndianCurrency(
                    remainingBalance
                  )}`}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Payment Date"
                  type="date"
                  value={singlePaymentData.paymentDate}
                  onChange={(e) =>
                    setSinglePaymentData((prev) => ({
                      ...prev,
                      paymentDate: e.target.value,
                    }))
                  }
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={singlePaymentData.method}
                    onChange={(e) =>
                      setSinglePaymentData((prev) => ({
                        ...prev,
                        method: e.target.value,
                      }))
                    }
                    label="Payment Method"
                  >
                    {paymentMethods.map((method) => (
                      <MenuItem key={method.value} value={method.value}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {method.icon}
                          {method.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Reference Number"
                  value={singlePaymentData.reference}
                  onChange={(e) =>
                    setSinglePaymentData((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
                  }
                  fullWidth
                  placeholder="Transaction ID, Cheque number, etc."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  value={singlePaymentData.notes}
                  onChange={(e) =>
                    setSinglePaymentData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Additional payment details..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setShowSinglePaymentDialog(false)}
              disabled={paymentLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogSinglePayment}
              variant="contained"
              disabled={paymentLoading}
              sx={{
                backgroundColor: "#4caf50",
                "&:hover": { backgroundColor: "#388e3c" },
              }}
            >
              {paymentLoading ? "Logging..." : "Log Payment"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Multiple Payments Dialog */}
        <Dialog
          open={showMultiplePaymentsDialog}
          onClose={() => setShowMultiplePaymentsDialog(false)}
          maxWidth="md"
          fullWidth
          TransitionComponent={Slide}
          TransitionProps={{ direction: "up" }}
          PaperProps={{
            sx: { borderRadius: 3 },
          }}
        >
          <DialogTitle
            sx={{
              background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Add />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Log Multiple Payments
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 3, mt: 2 }}>
            {/* Balance Info */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>
                  Balance Due: {formatIndianCurrency(remainingBalance)}
                </strong>
                <br />
                Total payments entered:{" "}
                {formatIndianCurrency(totalMultiplePayments)}
                <br />
                Remaining:{" "}
                {formatIndianCurrency(remainingBalance - totalMultiplePayments)}
              </Typography>
            </Alert>

            {multiplePayments.map((payment, index) => (
              <Card key={index} sx={{ mb: 2, border: "1px solid #e0e0e0" }}>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6">Payment #{index + 1}</Typography>
                    {multiplePayments.length > 1 && (
                      <IconButton
                        onClick={() => removePaymentRow(index)}
                        color="error"
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Amount"
                        type="number"
                        value={payment.amount}
                        onChange={(e) =>
                          updatePaymentRow(index, "amount", e.target.value)
                        }
                        fullWidth
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Date"
                        type="date"
                        value={payment.paymentDate}
                        onChange={(e) =>
                          updatePaymentRow(index, "paymentDate", e.target.value)
                        }
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Method</InputLabel>
                        <Select
                          value={payment.method}
                          onChange={(e) =>
                            updatePaymentRow(index, "method", e.target.value)
                          }
                          label="Method"
                        >
                          {paymentMethods.map((method) => (
                            <MenuItem key={method.value} value={method.value}>
                              {method.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Reference"
                        value={payment.reference}
                        onChange={(e) =>
                          updatePaymentRow(index, "reference", e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        label="Notes"
                        value={payment.notes}
                        onChange={(e) =>
                          updatePaymentRow(index, "notes", e.target.value)
                        }
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <Button
              onClick={addPaymentRow}
              startIcon={<Add />}
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
            >
              Add Another Payment
            </Button>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setShowMultiplePaymentsDialog(false)}
              disabled={paymentLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogMultiplePayments}
              variant="contained"
              disabled={paymentLoading}
              sx={{
                backgroundColor: "#1976d2",
                "&:hover": { backgroundColor: "#1565c0" },
              }}
            >
              {paymentLoading
                ? "Logging..."
                : `Log ${
                    multiplePayments.filter(
                      (p) => p.amount && parseFloat(p.amount) > 0
                    ).length
                  } Payment(s)`}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default InvoiceDetailsPage;
