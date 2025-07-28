import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
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
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  styled,
  Tooltip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Skeleton,
  Fade,
  Card,
  CardContent,
} from "@mui/material";
import {
  Add,
  Home,
  Refresh,
  Visibility,
  Edit,
  GetApp,
  Payment,
  Receipt,
  AccountBalance,
  TrendingUp,
  FilterList,
  Dashboard,
  Assessment,
  Timeline,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import {
  formatIndianCurrency,
  // formatIndianDateTime,
  getUserFromToken,
  formatInvoiceForDisplay,
} from "../utils/invoiceUtils";
import ClientSearchBar from "../components/ClientSearchBar";
import PendingRequestsSection from "../components/PendingRequestsSection";
import { designSystem } from "../theme/designSystem";
import "../styles/animations.css";
import API_BASE_URL from "../config"; // adjust path based on file depth


ChartJS.register(ArcElement, ChartTooltip, Legend);

// Enhanced Styled Components with Design System
const ModernStatsCard = styled(Card)(({ gradientcolor }) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: designSystem.borderRadius.lg,
  background: `linear-gradient(135deg, ${gradientcolor}15 0%, ${gradientcolor}25 100%)`,
  border: `2px solid ${gradientcolor}30`,
  boxShadow: designSystem.shadows.md,
  transition: designSystem.transitions.normal,
  "&:hover": {
    transform: "translateY(-8px) scale(1.02)",
    boxShadow: designSystem.shadows.xl,
    "& .stats-icon": {
      transform: "scale(1.15) rotate(5deg)",
    },
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    background: `linear-gradient(90deg, ${gradientcolor}, ${gradientcolor}90)`,
  },
}));

const StatsIconContainer = styled(Box)(({ iconcolor }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "64px",
  height: "64px",
  borderRadius: designSystem.borderRadius.md,
  background: `linear-gradient(135deg, ${iconcolor}, ${iconcolor}90)`,
  marginBottom: "16px",
  transition: designSystem.transitions.normal,
  boxShadow: designSystem.shadows.sm,
}));

const ModernFilterCard = styled(Card)(() => ({
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  borderRadius: designSystem.borderRadius.lg,
  padding: "24px",
  boxShadow: designSystem.shadows.md,
  border: `1px solid ${designSystem.colors.primary[100]}`,
  marginBottom: "24px",
}));

const GradientHeader = styled(Box)(() => ({
  background: `linear-gradient(135deg, ${designSystem.colors.primary[600]} 0%, ${designSystem.colors.primary[800]} 50%, ${designSystem.colors.secondary[600]} 100%)`,
  borderRadius: designSystem.borderRadius.lg,
  padding: "32px",
  marginBottom: "32px",
  color: "white",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%)",
    backgroundSize: "20px 20px",
    opacity: 0.3,
  },
}));

const ModernButton = styled(Button)(() => ({
  borderRadius: designSystem.borderRadius.md,
  textTransform: "none",
  fontWeight: 600,
  padding: "12px 24px",
  boxShadow: "none",
  transition: designSystem.transitions.normal,
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: designSystem.shadows.md,
  },
}));

const EnhancedTableContainer = styled(TableContainer)(() => ({
  borderRadius: designSystem.borderRadius.lg,
  overflow: "hidden",
  boxShadow: designSystem.shadows.lg,
  background: "white",
  border: `1px solid ${designSystem.colors.grey[200]}`,
}));

const StyledTableHead = styled(TableHead)(() => ({
  background: `linear-gradient(135deg, ${designSystem.colors.primary[700]} 0%, ${designSystem.colors.primary[900]} 100%)`,
  "& .MuiTableCell-head": {
    color: "white",
    fontWeight: 700,
    fontSize: "0.875rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "16px",
    borderBottom: "none",
  },
}));

const AnimatedTableRow = styled(TableRow)(() => ({
  transition: designSystem.transitions.fast,
  cursor: "pointer",
  "&:hover": {
    background: `linear-gradient(135deg, ${designSystem.colors.primary[50]} 0%, ${designSystem.colors.blue[50]} 100%)`,
    transform: "scale(1.01)",
    boxShadow: `inset 0 0 0 2px ${designSystem.colors.primary[200]}`,
  },
  "&:nth-of-type(even)": {
    backgroundColor: designSystem.colors.grey[50],
  },
}));

const StatusChip = styled(Chip)(({ status }) => {
  const statusColors = {
    paid: designSystem.status.paid,
    unpaid: designSystem.status.unpaid,
    partial: designSystem.status.partial,
    overdue: designSystem.status.overdue,
    cancelled: designSystem.status.cancelled,
  };

  const colorConfig = statusColors[status] || statusColors.unpaid;

  return {
    background: colorConfig.background,
    color: colorConfig.color,
    fontWeight: 700,
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderRadius: designSystem.borderRadius.xl,
    minWidth: "90px",
    height: "28px",
    boxShadow: designSystem.shadows.sm,
    "&:hover": {
      transform: "scale(1.05)",
      boxShadow: designSystem.shadows.md,
    },
  };
});

const LoadingSkeleton = ({
  variant = "rectangular",
  width = "100%",
  height = 40,
}) => (
  <Skeleton
    variant={variant}
    width={width}
    height={height}
    animation="wave"
    sx={{
      borderRadius: designSystem.borderRadius.sm,
      bgcolor: designSystem.colors.grey[200],
    }}
  />
);

const AnimatedCountUp = ({ value, duration = 800 }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    // For better performance, show value immediately if it's large
    if (value > 20) {
      setDisplayValue(value);
      return;
    }

    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setDisplayValue(Math.floor(progress * value));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return displayValue;
};

const InvoiceManagementPage = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    biller1: {
      total: 0,
      unpaid: 0,
      partiallyPaid: 0,
      fullyPaid: 0,
      totalAmount: 0,
    },
    biller2: {
      total: 0,
      unpaid: 0,
      partiallyPaid: 0,
      fullyPaid: 0,
      totalAmount: 0,
    },
    totalAmount: 0,
  });
  const [clients, setClients] = useState([]);
  const [settings, setSettings] = useState({
    biller1Terminology: "Biller-1",
    biller2Terminology: "Biller-2",
  });
  const [filters, setFilters] = useState({
    clientCode: "",
    isBiller2: "",
    paymentStatus: "",
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    mode: "Cash",
    remarks: "",
    referenceNumber: "",
    bankName: "",
  });
  const [modifiedChanges, setModifiedChanges] = useState({});
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token || token === "null" || token === "undefined") {
          navigate("/login");
          return;
        }

        const queryParams = new URLSearchParams({
          page: filters.page,
          limit: filters.limit,
          ...(filters.clientCode && { clientCode: filters.clientCode }),
          ...(filters.isBiller2 !== "" && { isBiller2: filters.isBiller2 }),
          ...(filters.paymentStatus && {
            paymentStatus: filters.paymentStatus,
          }),
        });

        const statsQuery = new URLSearchParams();
        if (filters.clientCode)
          statsQuery.append("clientCode", filters.clientCode);

        const [invoicesRes, statsRes, clientsRes, settingsRes] =
          await Promise.all([
            fetch(
              `${API_BASE_URL}/api/invoices?${queryParams.toString()}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            ),
            fetch(
              `${API_BASE_URL}/api/invoices/stats?${statsQuery.toString()}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            ),
            fetch("${API_BASE_URL}/api/clients", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("${API_BASE_URL}/api/settings/invoice", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

        const [invoicesData, statsData, clientsData, settingsData] =
          await Promise.all([
            invoicesRes.json(),
            statsRes.json(),
            clientsRes.json(),
            settingsRes.json(),
          ]);

        const newErrors = [];
        if (!invoicesRes.ok)
          newErrors.push(invoicesData.message || "Failed to fetch invoices");
        if (!statsRes.ok)
          newErrors.push(statsData.message || "Failed to fetch stats");
        if (!clientsRes.ok)
          newErrors.push(clientsData.message || "Failed to fetch clients");
        if (!settingsRes.ok)
          newErrors.push(settingsData.message || "Failed to fetch settings");

        if (newErrors.length > 0) {
          setErrors(newErrors);
        } else {
          setInvoices(
            (invoicesData.invoices || []).map(formatInvoiceForDisplay)
          );
          setPagination({
            currentPage: invoicesData.currentPage || 1,
            totalPages: invoicesData.totalPages || 1,
            total: invoicesData.total || 0,
          });
          setStats(statsData);
          setClients(Array.isArray(clientsData) ? clientsData : []);
          setSettings({
            biller1Terminology: settingsData.biller1Terminology || "Biller-1",
            biller2Terminology: settingsData.biller2Terminology || "Biller-2",
          });
        }
      } catch (err) {
        setErrors([err.message || "Failed to load data"]);
        setInvoices([]);
        setStats({
          total: 0,
          biller1: {
            total: 0,
            unpaid: 0,
            partiallyPaid: 0,
            fullyPaid: 0,
            totalAmount: 0,
          },
          biller2: {
            total: 0,
            unpaid: 0,
            partiallyPaid: 0,
            fullyPaid: 0,
            totalAmount: 0,
          },
          totalAmount: 0,
        });
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, navigate]);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    if (field !== "page") {
      newFilters.page = 1;
    }
    setFilters(newFilters);
    setErrors([]);
  };

  const handleClientFilterChange = (client) => {
    const clientCode = client?.clientCode || "";
    handleFilterChange("clientCode", clientCode);
  };

  const handlePageChange = (event, newPage) => {
    handleFilterChange("page", newPage);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const resetFilters = () => {
    setFilters({
      clientCode: "",
      isBiller2: "",
      paymentStatus: "",
      page: 1,
      limit: 10,
    });
    setErrors([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Fully Paid":
      case "Paid":
        return "paid";
      case "Partially Paid":
        return "partial";
      case "Unpaid":
        return "unpaid";
      case "Overdue":
        return "overdue";
      case "Cancelled":
        return "cancelled";
      default:
        return "unpaid";
    }
  };

  const getUserInitial = (username) => {
    return username ? username.charAt(0).toUpperCase() : "?";
  };

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/invoices/${invoiceId}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `Invoice-${invoiceNumber.replace("#", "")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Show success message
        setErrors([`✅ PDF downloaded successfully for ${invoiceNumber}`]);
      } else {
        let errorMessage = "Failed to download PDF";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If can't parse JSON, use status text
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }

        if (response.status === 500) {
          errorMessage =
            "⚠️ PDF generation service is currently unavailable. Please try again later or contact support.";
        }

        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error("PDF Download Error:", err);
      setErrors([
        err.message || "❌ Failed to download PDF. Please try again.",
      ]);
    }
  };

  const formatChanges = (changes, originalInvoice) => {
    if (!changes || !originalInvoice) {
      return [
        { field: "N/A", oldValue: "N/A", newValue: "No changes specified" },
      ];
    }

    const formatted = [];
    if (
      changes.totalAmount &&
      changes.totalAmount !== originalInvoice.totalAmount
    ) {
      formatted.push({
        field: "Total Amount",
        oldValue: formatIndianCurrency(originalInvoice.totalAmount || 0),
        newValue: formatIndianCurrency(changes.totalAmount || 0),
      });
    }
    if (changes.services && Array.isArray(changes.services)) {
      changes.services.forEach((service, index) => {
        const originalService = originalInvoice.services[index] || {};
        if (service.serviceName !== originalService.serviceName) {
          formatted.push({
            field: `Service ${index + 1}: Name`,
            oldValue: originalService.serviceName || "N/A",
            newValue: service.serviceName || "N/A",
          });
        }
        if (service.amount !== originalService.amount) {
          formatted.push({
            field: `Service ${index + 1}: Amount`,
            oldValue: formatIndianCurrency(originalService.amount || 0),
            newValue: formatIndianCurrency(service.amount || 0),
          });
        }
      });
    }
    return formatted.length > 0
      ? formatted
      : [
          {
            field: "N/A",
            oldValue: "N/A",
            newValue: "No specific changes detailed",
          },
        ];
  };

  const handleRequestAction = async (invoiceId, requestId, type, approve) => {
    try {
      if (!invoiceId || !requestId) {
        throw new Error("Invalid invoice ID or request ID");
      }

      const token = localStorage.getItem("token");
      const endpoint =
        type === "edit"
          ? `/api/invoices/${invoiceId}/approve-edit`
          : `/api/invoices/${invoiceId}/approve-delete`;

      const body = {
        [type === "edit" ? "editRequestId" : "deleteRequestId"]: requestId,
        approve,
      };

      if (type === "edit" && approve && modifiedChanges) {
        body.modifiedChanges = modifiedChanges;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to ${approve ? "approve" : "reject"} ${type} request`
        );
      }

      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice._id === invoiceId
            ? {
                ...formatInvoiceForDisplay(data.invoice || invoice),
                editRequests:
                  invoice.editRequests?.map((req) =>
                    req._id === requestId
                      ? {
                          ...req,
                          status: approve ? "Approved" : "Rejected",
                          processedBy: getUserFromToken()?.id,
                          processedAt: new Date(),
                        }
                      : req
                  ) || [],
                deleteRequests:
                  invoice.deleteRequests?.map((req) =>
                    req._id === requestId
                      ? {
                          ...req,
                          status: approve ? "Approved" : "Rejected",
                          processedBy: getUserFromToken()?.id,
                          processedAt: new Date(),
                        }
                      : req
                  ) || [],
                status:
                  type === "delete" && approve ? "Cancelled" : invoice.status,
              }
            : invoice
        )
      );

      setDialogOpen(false);
      setModifiedChanges({});
      setErrors([
        `${type.charAt(0).toUpperCase() + type.slice(1)} request ${
          approve ? "approved" : "rejected"
        } successfully`,
      ]);
    } catch (err) {
      setErrors([
        err.message ||
          `Failed to ${approve ? "approve" : "reject"} ${type} request`,
      ]);
    }
  };

  const handleOpenDialog = (invoiceId, requestId, type, approve, changes) => {
    if (!invoiceId || !requestId || !type) {
      setErrors(["Invalid request data provided"]);
      return;
    }

    const invoice = invoices.find((i) => i._id === invoiceId);
    setSelectedRequest({
      invoiceId,
      requestId,
      type,
      approve,
      changes,
      invoiceNumber: invoice?.invoiceNumber || "Unknown",
      formattedChanges: formatChanges(changes, invoice),
      originalInvoice: invoice,
    });
    setModifiedChanges(changes || {});
    setDialogOpen(true);
  };

  const handleOpenPaymentDialog = (invoice) => {
    const remainingAmount =
      (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
    setSelectedInvoice({
      ...invoice,
      remainingAmount: Math.max(0, remainingAmount),
    });
    setPaymentForm({
      amount: remainingAmount > 0 ? remainingAmount.toString() : "",
      date: new Date().toISOString().split("T")[0],
      mode: "Cash",
      remarks: "",
      referenceNumber: "",
      bankName: "",
    });
    setPaymentDialogOpen(true);
  };

  const handlePaymentChange = (field, value) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitPayment = async () => {
    const paymentAmount = parseFloat(paymentForm.amount);
    const remainingAmount = selectedInvoice?.remainingAmount || 0;

    if (!paymentForm.amount || paymentAmount <= 0) {
      setErrors(["❌ Please enter a valid payment amount"]);
      return;
    }

    if (paymentAmount > remainingAmount) {
      setErrors([
        `❌ Payment amount cannot exceed remaining balance of ${formatIndianCurrency(
          remainingAmount
        )}`,
      ]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/invoices/${selectedInvoice._id}/payments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(paymentForm),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to log payment");
      }

      setInvoices((prev) =>
        prev.map((inv) =>
          inv._id === selectedInvoice._id
            ? formatInvoiceForDisplay(data.invoice)
            : inv
        )
      );
      setPaymentDialogOpen(false);
      setErrors([
        `✅ Payment of ${formatIndianCurrency(
          paymentAmount
        )} logged successfully for ${selectedInvoice.invoiceNumber}`,
      ]);

      // Refresh stats to update dashboard
      window.location.reload();
    } catch (err) {
      setErrors([err.message || "❌ Failed to log payment"]);
    }
  };

  const biller1ChartData = {
    labels: ["Unpaid", "Partially Paid", "Fully Paid"],
    datasets: [
      {
        data: [
          stats.biller1?.unpaid || 0,
          stats.biller1?.partiallyPaid || 0,
          stats.biller1?.fullyPaid || 0,
        ],
        backgroundColor: [
          designSystem.colors.error.main,
          designSystem.colors.warning.main,
          designSystem.colors.success.main,
        ],
        borderWidth: 3,
        borderColor: "#ffffff",
        hoverBorderWidth: 4,
      },
    ],
  };

  const biller2ChartData = {
    labels: ["Unpaid", "Partially Paid", "Fully Paid"],
    datasets: [
      {
        data: [
          stats.biller2?.unpaid || 0,
          stats.biller2?.partiallyPaid || 0,
          stats.biller2?.fullyPaid || 0,
        ],
        backgroundColor: [
          designSystem.colors.error.main,
          designSystem.colors.warning.main,
          designSystem.colors.success.main,
        ],
        borderWidth: 3,
        borderColor: "#ffffff",
        hoverBorderWidth: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: "600",
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: designSystem.colors.primary.main,
        borderWidth: 1,
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed} invoices`,
        },
      },
    },
    cutout: "60%",
    elements: {
      arc: {
        borderWidth: 2,
        hoverBorderWidth: 4,
      },
    },
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, minHeight: "100vh" }}>
      {/* Enhanced Header */}
      <GradientHeader className="animate-fade-in-down">
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
              >
                <Dashboard sx={{ fontSize: 48 }} />
                <Box>
                  <Typography
                    variant="h3"
                    component="h1"
                    sx={{ fontWeight: 800, mb: 1 }}
                  >
                    📋 Invoice Management
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Comprehensive invoice tracking and management system
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  justifyContent: { xs: "center", md: "flex-end" },
                }}
              >
                <ModernButton
                  component={Link}
                  to="/invoices/new"
                  variant="contained"
                  startIcon={<Add />}
                  size="large"
                  sx={{
                    background: designSystem.colors.background.successGradient,
                    color: "white",
                  }}
                >
                  Create Invoice
                </ModernButton>
                <ModernButton
                  component={Link}
                  to="/dashboard"
                  variant="outlined"
                  startIcon={<Home />}
                  sx={{
                    color: "white",
                    borderColor: "white",
                    "&:hover": { borderColor: "white" },
                  }}
                >
                  Dashboard
                </ModernButton>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </GradientHeader>

      {/* Error Alerts */}
      {errors.length > 0 && (
        <Box sx={{ mb: 4 }}>
          {errors.map((error, index) => (
            <Fade in={true} key={index}>
              <Alert
                severity={error.includes("successfully") ? "success" : "error"}
                sx={{
                  mb: 2,
                  borderRadius: designSystem.borderRadius.md,
                  fontWeight: 600,
                  boxShadow: designSystem.shadows.sm,
                }}
                onClose={() => setErrors(errors.filter((_, i) => i !== index))}
              >
                {error}
              </Alert>
            </Fade>
          ))}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress
              size={60}
              sx={{ color: designSystem.colors.primary.main, mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary">
              Loading invoice data...
            </Typography>
          </Box>
        </Box>
      ) : (
        <>
          {/* Tabs Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                "& .MuiTab-root": {
                  fontWeight: 600,
                  fontSize: "1rem",
                  textTransform: "none",
                  minHeight: 64,
                  px: 3,
                },
                "& .Mui-selected": {
                  background: `linear-gradient(135deg, ${designSystem.colors.primary[50]}, ${designSystem.colors.blue[50]})`,
                },
              }}
            >
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Assessment />
                    Invoice Dashboard & List
                  </Box>
                }
              />
              {getUserFromToken()?.isAdmin && (
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Timeline />
                      Pending Requests
                    </Box>
                  }
                />
              )}
            </Tabs>
          </Box>

          {/* Main Dashboard & List Tab */}
          <Box hidden={activeTab !== 0}>
            {/* Statistics Cards */}
            <Grid
              container
              spacing={3}
              sx={{ mb: 4 }}
              className="stagger-children"
            >
              <Grid item xs={12} sm={6} md={2.4}>
                <ModernStatsCard
                  gradientcolor={designSystem.colors.primary.main}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <StatsIconContainer
                      iconcolor={designSystem.colors.primary.main}
                      className="stats-icon"
                    >
                      <Receipt sx={{ fontSize: 32, color: "white" }} />
                    </StatsIconContainer>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        mb: 1,
                        color: designSystem.colors.primary.main,
                      }}
                    >
                      <AnimatedCountUp value={stats.total} />
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      Total Invoices
                    </Typography>
                  </CardContent>
                </ModernStatsCard>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <ModernStatsCard
                  gradientcolor={designSystem.colors.success.main}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <StatsIconContainer
                      iconcolor={designSystem.colors.success.main}
                      className="stats-icon"
                    >
                      <AccountBalance sx={{ fontSize: 32, color: "white" }} />
                    </StatsIconContainer>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        mb: 1,
                        color: designSystem.colors.success.main,
                      }}
                    >
                      {formatIndianCurrency(stats.totalAmount)}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      Total Amount
                    </Typography>
                  </CardContent>
                </ModernStatsCard>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <ModernStatsCard
                  gradientcolor={designSystem.colors.warning.main}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <StatsIconContainer
                      iconcolor={designSystem.colors.warning.main}
                      className="stats-icon"
                    >
                      <TrendingUp sx={{ fontSize: 32, color: "white" }} />
                    </StatsIconContainer>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        mb: 1,
                        color: designSystem.colors.warning.main,
                      }}
                    >
                      <AnimatedCountUp value={stats.biller1.total} />
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      {settings.biller1Terminology}
                    </Typography>
                  </CardContent>
                </ModernStatsCard>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <ModernStatsCard
                  gradientcolor={designSystem.colors.secondary.main}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <StatsIconContainer
                      iconcolor={designSystem.colors.secondary.main}
                      className="stats-icon"
                    >
                      <Timeline sx={{ fontSize: 32, color: "white" }} />
                    </StatsIconContainer>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        mb: 1,
                        color: designSystem.colors.secondary.main,
                      }}
                    >
                      <AnimatedCountUp value={stats.biller2.total} />
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      {settings.biller2Terminology}
                    </Typography>
                  </CardContent>
                </ModernStatsCard>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <ModernStatsCard gradientcolor={designSystem.colors.info.main}>
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <StatsIconContainer
                      iconcolor={designSystem.colors.info.main}
                      className="stats-icon"
                    >
                      <Assessment sx={{ fontSize: 32, color: "white" }} />
                    </StatsIconContainer>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        mb: 1,
                        color: designSystem.colors.info.main,
                      }}
                    >
                      <AnimatedCountUp value={pagination.totalPages} />
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      Total Pages
                    </Typography>
                  </CardContent>
                </ModernStatsCard>
              </Grid>
            </Grid>

            {/* Charts Section */}
            {(stats.biller1?.total > 0 || stats.biller2?.total > 0) && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {stats.biller1?.total > 0 && (
                  <Grid item xs={12} md={stats.biller2?.total > 0 ? 6 : 12}>
                    <Card
                      sx={{
                        borderRadius: designSystem.borderRadius.lg,
                        height: "300px",
                        p: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, fontWeight: 700, textAlign: "center" }}
                      >
                        {settings.biller1Terminology} Distribution
                      </Typography>
                      <Box sx={{ height: "240px" }}>
                        <Doughnut
                          data={biller1ChartData}
                          options={chartOptions}
                        />
                      </Box>
                    </Card>
                  </Grid>
                )}
                {stats.biller2?.total > 0 && (
                  <Grid item xs={12} md={stats.biller1?.total > 0 ? 6 : 12}>
                    <Card
                      sx={{
                        borderRadius: designSystem.borderRadius.lg,
                        height: "300px",
                        p: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, fontWeight: 700, textAlign: "center" }}
                      >
                        {settings.biller2Terminology} Distribution
                      </Typography>
                      <Box sx={{ height: "240px" }}>
                        <Doughnut
                          data={biller2ChartData}
                          options={chartOptions}
                        />
                      </Box>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Filters Section */}
            <ModernFilterCard>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <FilterList sx={{ color: designSystem.colors.primary.main }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: designSystem.colors.primary.main,
                  }}
                >
                  Filter & Search
                </Typography>
              </Box>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={4}>
                  <ClientSearchBar
                    clients={clients}
                    onSelect={handleClientFilterChange}
                    value={
                      clients.find(
                        (c) => c.clientCode === filters.clientCode
                      ) || null
                    }
                    placeholder="Filter by client..."
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Biller Type</InputLabel>
                    <Select
                      value={filters.isBiller2}
                      onChange={(e) =>
                        handleFilterChange("isBiller2", e.target.value)
                      }
                      label="Biller Type"
                      sx={{
                        borderRadius: designSystem.borderRadius.md,
                        minWidth: "180px",
                      }}
                    >
                      <MenuItem value="">All Billers</MenuItem>
                      <MenuItem value="false">
                        {settings.biller1Terminology}
                      </MenuItem>
                      <MenuItem value="true">
                        {settings.biller2Terminology}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      value={filters.paymentStatus}
                      onChange={(e) =>
                        handleFilterChange("paymentStatus", e.target.value)
                      }
                      label="Payment Status"
                      sx={{
                        borderRadius: designSystem.borderRadius.md,
                        minWidth: "180px",
                      }}
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="Unpaid">Unpaid</MenuItem>
                      <MenuItem value="Partially Paid">Partially Paid</MenuItem>
                      <MenuItem value="Paid">Paid</MenuItem>
                      <MenuItem value="Overdue">Overdue</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <ModernButton
                      variant="outlined"
                      onClick={resetFilters}
                      startIcon={<Refresh />}
                      fullWidth
                    >
                      Reset
                    </ModernButton>
                  </Box>
                </Grid>
              </Grid>
            </ModernFilterCard>

            {/* Invoices Table */}
            <EnhancedTableContainer>
              <Table>
                <StyledTableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Biller</TableCell>
                    <TableCell>Generated By</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </StyledTableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 8 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <LoadingSkeleton height={30} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        sx={{ textAlign: "center", py: 8 }}
                      >
                        <Typography variant="h6" color="text.secondary">
                          📄 No invoices found
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          Try adjusting your filters or create a new invoice
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice, index) => (
                      <AnimatedTableRow
                        key={invoice._id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: designSystem.colors.primary.main,
                            }}
                          >
                            {invoice.invoiceNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: designSystem.colors.primary.main,
                                fontSize: "0.875rem",
                              }}
                            >
                              {getUserInitial(invoice.clientName)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                              >
                                {invoice.clientName}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {invoice.clientCode}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {invoice.displayInvoiceDate}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Due: {invoice.displayDueDate}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: designSystem.colors.success.main,
                            }}
                          >
                            {formatIndianCurrency(invoice.totalAmount)}
                          </Typography>
                          {invoice.paidAmount > 0 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Paid: {formatIndianCurrency(invoice.paidAmount)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            label={invoice.paymentStatus}
                            status={getStatusColor(invoice.paymentStatus)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              invoice.isBiller2
                                ? settings.biller2Terminology
                                : settings.biller1Terminology
                            }
                            variant="outlined"
                            size="small"
                            color={invoice.isBiller2 ? "secondary" : "primary"}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                fontSize: "0.75rem",
                              }}
                            >
                              {getUserInitial(invoice.generatedBy)}
                            </Avatar>
                            <Typography variant="caption">
                              {invoice.generatedBy}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              gap: 0.5,
                              justifyContent: "center",
                            }}
                          >
                            <Tooltip title="View Details">
                              <IconButton
                                component={Link}
                                to={`/invoices/${invoice._id}`}
                                size="small"
                                sx={{
                                  bgcolor: designSystem.colors.primary[50],
                                  "&:hover": {
                                    bgcolor: designSystem.colors.primary[100],
                                  },
                                }}
                              >
                                <Visibility sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Invoice">
                              <IconButton
                                component={Link}
                                to={`/invoices/${invoice._id}/edit`}
                                size="small"
                                sx={{
                                  bgcolor: designSystem.colors.warning[50],
                                  "&:hover": {
                                    bgcolor: designSystem.colors.warning[100],
                                  },
                                }}
                              >
                                <Edit sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download PDF">
                              <IconButton
                                onClick={() =>
                                  handleDownloadPDF(
                                    invoice._id,
                                    invoice.invoiceNumber
                                  )
                                }
                                size="small"
                                sx={{
                                  bgcolor: designSystem.colors.success[50],
                                  "&:hover": {
                                    bgcolor: designSystem.colors.success[100],
                                  },
                                }}
                              >
                                <GetApp sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            {(invoice.paymentStatus === "Unpaid" ||
                              invoice.paymentStatus === "Partially Paid" ||
                              invoice.paymentStatus === "Partial" ||
                              invoice.totalAmount > invoice.paidAmount) && (
                              <Tooltip title="Log Payment">
                                <IconButton
                                  onClick={() =>
                                    handleOpenPaymentDialog(invoice)
                                  }
                                  size="small"
                                  sx={{
                                    bgcolor: designSystem.colors.info[50],
                                    "&:hover": {
                                      bgcolor: designSystem.colors.info[100],
                                    },
                                  }}
                                >
                                  <Payment sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </AnimatedTableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </EnhancedTableContainer>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    "& .MuiPaginationItem-root": {
                      borderRadius: designSystem.borderRadius.sm,
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Pending Requests Tab */}
          {getUserFromToken()?.isAdmin && (
            <Box hidden={activeTab !== 1}>
              <PendingRequestsSection
                invoices={invoices}
                handleOpenDialog={handleOpenDialog}
                currentUser={getUserFromToken()}
              />
            </Box>
          )}
        </>
      )}

      {/* Request Approval Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: designSystem.borderRadius.lg,
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {selectedRequest?.approve ? "✅ Approve" : "❌ Reject"}{" "}
            {selectedRequest?.type} Request
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Invoice: {selectedRequest?.invoiceNumber}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedRequest?.formattedChanges && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Proposed Changes:
              </Typography>
              <Grid container spacing={2}>
                {selectedRequest.formattedChanges.map((change, index) => (
                  <Grid item xs={12} key={index}>
                    <Box
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: designSystem.borderRadius.sm,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {change.field}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        From: {change.oldValue} → To: {change.newValue}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: designSystem.borderRadius.md }}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              handleRequestAction(
                selectedRequest?.invoiceId,
                selectedRequest?.requestId,
                selectedRequest?.type,
                selectedRequest?.approve
              )
            }
            variant="contained"
            color={selectedRequest?.approve ? "success" : "error"}
            sx={{ borderRadius: designSystem.borderRadius.md }}
          >
            {selectedRequest?.approve ? "Approve" : "Reject"} Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: designSystem.borderRadius.lg,
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            💰 Log Payment
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Invoice: {selectedInvoice?.invoiceNumber}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Payment Amount"
                type="number"
                value={paymentForm.amount}
                onChange={(e) => handlePaymentChange("amount", e.target.value)}
                fullWidth
                inputProps={{
                  min: 0,
                  step: 0.01,
                  max:
                    selectedInvoice?.remainingAmount ||
                    selectedInvoice?.totalAmount,
                }}
                helperText={`Remaining: ${formatIndianCurrency(
                  selectedInvoice?.remainingAmount || 0
                )}`}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: designSystem.borderRadius.md,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Payment Date"
                type="date"
                value={paymentForm.date}
                onChange={(e) => handlePaymentChange("date", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: designSystem.borderRadius.md,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentForm.mode}
                  onChange={(e) => handlePaymentChange("mode", e.target.value)}
                  label="Payment Method"
                  sx={{ borderRadius: designSystem.borderRadius.md }}
                >
                  <MenuItem value="Cash">💵 Cash</MenuItem>
                  <MenuItem value="Cheque">📋 Cheque</MenuItem>
                  <MenuItem value="Bank Transfer">🏦 Bank Transfer</MenuItem>
                  <MenuItem value="UPI">📱 UPI</MenuItem>
                  <MenuItem value="Card">💳 Card</MenuItem>
                  <MenuItem value="Other">❓ Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Reference Number (Optional)"
                value={paymentForm.referenceNumber}
                onChange={(e) =>
                  handlePaymentChange("referenceNumber", e.target.value)
                }
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: designSystem.borderRadius.md,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Remarks (Optional)"
                value={paymentForm.remarks}
                onChange={(e) => handlePaymentChange("remarks", e.target.value)}
                fullWidth
                multiline
                rows={3}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: designSystem.borderRadius.md,
                  },
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setPaymentDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: designSystem.borderRadius.md }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitPayment}
            variant="contained"
            color="success"
            sx={{ borderRadius: designSystem.borderRadius.md }}
          >
            💰 Log Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvoiceManagementPage;
