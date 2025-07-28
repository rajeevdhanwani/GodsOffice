import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Autocomplete,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  FormGroup,
} from "@mui/material";
import {
  Add,
  Delete,
  ArrowBack,
  ExpandMore,
  Warning,
  Info,
  AutoAwesome,
  Keyboard,
  Mouse,
  Edit,
  History,
  Send,
  Cancel,
  Pending,
  CheckCircle,
  Error as ErrorIcon,
  Settings,
} from "@mui/icons-material";
import Timeline from "@mui/icons-material/Timeline";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import ClientSearchBar from "../components/ClientSearchBar";
import { formatIndianCurrency } from "../utils/invoiceUtils";
import API_BASE_URL from "../config"; // adjust path based on file depth


const theme = {
  primary: "#1976d2",
  secondary: "#dc004e",
  success: "#4caf50",
  warning: "#ff9800",
  error: "#f44336",
  info: "#2196f3",
  gradients: {
    primary: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
    success: "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
    warning: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
    error: "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
  },
};

const SALUTATIONS = [
  "Mr.",
  "Ms.",
  "Mrs.",
  "Dr.",
  "Prof.",
  "Sir",
  "Madam",
  "M/s",
];

const STATES = [
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
  "Delhi",
  "Puducherry",
];

const SERVICE_TYPES = [
  { value: "consulting", label: "Consulting Services" },
  { value: "development", label: "Development Services" },
  { value: "design", label: "Design Services" },
  { value: "maintenance", label: "Maintenance Services" },
  { value: "support", label: "Support Services" },
  { value: "training", label: "Training Services" },
  { value: "other", label: "Other Services" },
];

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 50000];

const TASK_STATUSES = [
  { value: "Completed", label: "✅ Completed", color: "#4caf50" },
  { value: "In Progress", label: "🔄 In Progress", color: "#ff9800" },
  { value: "Pending", label: "⏳ Pending", color: "#2196f3" },
  { value: "Pending-Overdue", label: "⚠️ Pending-Overdue", color: "#d32f2f" },
  { value: "On Hold", label: "⏸️ On Hold", color: "#9e9e9e" },
];

const EditInvoicePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Core data
  const [invoice, setInvoice] = useState(null);
  const [clients, setClients] = useState([]);
  const [billableTasks, setBillableTasks] = useState([]);
  const [settings, setSettings] = useState({
    biller1Terminology: "Biller-1",
    biller2Terminology: "Biller-2",
    biller1FirmName: "",
    biller2FirmName: "",
    biller1State: "",
    biller2State: "",
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [keyboardMode, setKeyboardMode] = useState(true);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showTaskFilter, setShowTaskFilter] = useState(false);

  // Task management
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [taskAmounts, setTaskAmounts] = useState({});
  const [taskStatusFilter, setTaskStatusFilter] = useState([
    "Pending",
    "Completed",
    "Upcoming",
    "Pending-Overdue",
  ]);

  // Form data
  const [formData, setFormData] = useState({
    selectedClient: null,
    clientCode: "",
    clientName: "",
    salutation: "M/s",
    address: "",
    gstin: "",
    placeOfSupply: "",
    isBiller2: false,
    invoiceDate: new Date(),
    dueDate: new Date(),
    services: [],
    notes: "",
    customerNotes: "",
  });

  // Service form for adding new services
  const [serviceForm, setServiceForm] = useState({
    serviceName: "",
    description: "",
    amount: "",
    serviceType: "consulting",
    sacCode: "998314",
    servicePeriod: "",
    isCustom: true,
    customServiceType: "OTHER",
    serviceCode: "CUSTOM",
  });

  // Computed values
  const totalAmount = useMemo(() => {
    const taskTotal = selectedTasks.reduce(
      (sum, task) => sum + (parseFloat(task.amount) || 0),
      0
    );
    const customTotal = formData.services
      .filter((s) => s.isCustom)
      .reduce((sum, service) => sum + (parseFloat(service.amount) || 0), 0);
    return taskTotal + customTotal;
  }, [selectedTasks, formData.services]);

  const hasUnsavedChanges = useMemo(() => {
    if (!invoice) return false;

    const originalTaskIds =
      invoice.services?.filter((s) => !s.isCustom).map((s) => s.taskId) || [];
    const currentTaskIds = selectedTasks.map((t) => t.taskId);

    const originalCustomServices =
      invoice.services?.filter((s) => s.isCustom) || [];
    const currentCustomServices = formData.services.filter((s) => s.isCustom);

    return (
      JSON.stringify(originalTaskIds.sort()) !==
        JSON.stringify(currentTaskIds.sort()) ||
      JSON.stringify(originalCustomServices) !==
        JSON.stringify(currentCustomServices) ||
      formData.clientCode !== invoice.clientCode ||
      formData.placeOfSupply !== invoice.placeOfSupply ||
      formData.notes !== (invoice.notes || "") ||
      formData.customerNotes !== (invoice.customerNotes || "")
    );
  }, [formData, invoice, selectedTasks]);

  // Load invoice data
  useEffect(() => {
    const fetchInvoiceData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication required");
          navigate("/login");
          return;
        }

        const [invoiceRes, clientsRes, settingsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/invoices/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("${API_BASE_URL}/api/clients", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("${API_BASE_URL}/api/settings/invoice", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!invoiceRes.ok) {
          throw new Error("Failed to load invoice");
        }

        const invoiceData = await invoiceRes.json();
        setInvoice(invoiceData);

        setFormData({
          selectedClient: null,
          clientCode: invoiceData.clientCode,
          clientName: invoiceData.clientName,
          salutation: invoiceData.salutation || "M/s",
          address: invoiceData.address || "",
          gstin: invoiceData.gstin || "",
          placeOfSupply: invoiceData.placeOfSupply || "",
          isBiller2: invoiceData.isBiller2 || false,
          invoiceDate: new Date(invoiceData.invoiceDate),
          dueDate: new Date(invoiceData.dueDate),
          services: invoiceData.services?.filter((s) => s.isCustom) || [],
          notes: invoiceData.notes || "",
          customerNotes: invoiceData.customerNotes || "",
        });

        const taskServices =
          invoiceData.services?.filter((s) => !s.isCustom) || [];
        setSelectedTasks(
          taskServices.map((s) => ({
            taskId: s.taskId,
            serviceCode: s.serviceCode,
            serviceName: s.serviceName,
            sacCode: s.sacCode,
            amount: s.amount,
            servicePeriod: s.servicePeriod,
            isCustom: false,
          }))
        );

        const amounts = {};
        taskServices.forEach((s) => {
          if (s.taskId) amounts[s.taskId] = s.amount;
        });
        setTaskAmounts(amounts);

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(Array.isArray(clientsData) ? clientsData : []);
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings({
            biller1Terminology: settingsData.biller1Terminology || "Biller-1",
            biller2Terminology: settingsData.biller2Terminology || "Biller-2",
            biller1FirmName: settingsData.biller1FirmName || "Company 1",
            biller2FirmName: settingsData.biller2FirmName || "Company 2",
            biller1State: settingsData.biller1State || "Maharashtra",
            biller2State: settingsData.biller2State || "Delhi",
          });
        }
      } catch (err) {
        setError(err.message || "Failed to load invoice data");
        console.error("Error loading invoice data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoiceData();
    }
  }, [id, navigate]);

  // Update form when clients data is loaded
  useEffect(() => {
    if (invoice && clients.length > 0) {
      const selectedClient = clients.find(
        (c) => c.clientCode === invoice.clientCode
      );
      if (selectedClient) {
        setFormData((prev) => ({ ...prev, selectedClient }));
      }
    }
  }, [clients, invoice]);

  // Load billable tasks when client changes and in edit mode
  useEffect(() => {
    const fetchBillableTasks = async () => {
      if (!formData.clientCode || !editMode) {
        setBillableTasks([]);
        return;
      }

      setTasksLoading(true);
      try {
        const token = localStorage.getItem("token");
        const statusParam = taskStatusFilter.join(",");
        const response = await fetch(
          `${API_BASE_URL}/api/tasks?clientCode=${formData.clientCode}&status=${statusParam}&limit=1000`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const tasksData = await response.json();

        if (response.ok) {
          setBillableTasks(
            Array.isArray(tasksData.tasks) ? tasksData.tasks : []
          );
        } else {
          setBillableTasks([]);
          console.warn("Failed to fetch tasks, using custom services only");
        }
      } catch (err) {
        console.warn("Error loading billable tasks:", err);
        setBillableTasks([]);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchBillableTasks();
  }, [formData.clientCode, taskStatusFilter, editMode]);

  // Form handlers
  const handleFormChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [validationErrors]
  );

  const handleClientSelect = useCallback(
    (client) => {
      if (client) {
        handleFormChange("selectedClient", client);
        handleFormChange("clientCode", client.clientCode);
        handleFormChange("clientName", client.clientName);
        handleFormChange("address", client.address || "");
        handleFormChange("gstin", client.gstin || "");
        handleFormChange(
          "placeOfSupply",
          client.placeOfSupply || client.address.split(", ").pop() || ""
        );
      }
    },
    [handleFormChange]
  );

  // Task management
  const handleTaskAmountChange = useCallback(
    (taskId, amount) => {
      const numericAmount = parseFloat(amount) || 0;
      setTaskAmounts((prev) => ({
        ...prev,
        [taskId]: numericAmount,
      }));

      const isSelected = selectedTasks.some((t) => t.taskId === taskId);
      if (isSelected && numericAmount >= 0) {
        const task = billableTasks.find((t) => t._id === taskId);
        const updatedTasks = selectedTasks.map((t) =>
          t.taskId === taskId
            ? {
                ...t,
                amount: numericAmount,
                servicePeriod: task?.servicePeriod || "N/A",
              }
            : t
        );
        setSelectedTasks(updatedTasks);
      }
    },
    [billableTasks, selectedTasks]
  );

  const handleTaskSelection = useCallback(
    (taskId, isChecked) => {
      if (isChecked) {
        const amount = parseFloat(taskAmounts[taskId]) || 0;
        if (amount <= 0) {
          setError("Please enter a valid amount for the selected task");
          return;
        }

        const task = billableTasks.find((t) => t._id === taskId);
        const newTask = {
          taskId,
          amount,
          servicePeriod: task?.servicePeriod || "N/A",
          serviceCode: task?.serviceCode || "TASK",
          serviceName: task?.serviceName || "Task Service",
          sacCode: task?.sacCode || "998314",
          isCustom: false,
        };

        setSelectedTasks((prev) => [...prev, newTask]);
        setError("");
      } else {
        setSelectedTasks((prev) => prev.filter((t) => t.taskId !== taskId));
      }
    },
    [billableTasks, taskAmounts]
  );

  const handleStatusFilterChange = useCallback(
    (status) => {
      const newFilter = taskStatusFilter.includes(status)
        ? taskStatusFilter.filter((s) => s !== status)
        : [...taskStatusFilter, status];

      if (newFilter.length > 0) {
        setTaskStatusFilter(newFilter);
      }
    },
    [taskStatusFilter]
  );

  // Service management
  const addCustomService = useCallback(() => {
    if (!serviceForm.serviceName || !serviceForm.amount) {
      setError("Service name and amount are required");
      return;
    }

    const newService = {
      serviceName: serviceForm.serviceName,
      description: serviceForm.description,
      amount: parseFloat(serviceForm.amount),
      serviceType: serviceForm.serviceType,
      sacCode: serviceForm.sacCode || "998314",
      servicePeriod: serviceForm.servicePeriod || "N/A",
      isCustom: true,
      customServiceType: serviceForm.customServiceType || "OTHER",
      serviceCode: serviceForm.serviceCode || "CUSTOM",
      id: Date.now().toString(),
    };

    setFormData((prev) => ({
      ...prev,
      services: [...prev.services, newService],
    }));

    setServiceForm({
      serviceName: "",
      description: "",
      amount: "",
      serviceType: "consulting",
      sacCode: "998314",
      servicePeriod: "",
      isCustom: true,
      customServiceType: "OTHER",
      serviceCode: "CUSTOM",
    });

    setSuccess("Service added successfully");
  }, [serviceForm]);

  const removeService = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  }, []);

  const updateService = useCallback((index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.map((service, i) =>
        i === index ? { ...service, [field]: value } : service
      ),
    }));
  }, []);

  // Quick actions
  const handleQuickAmount = useCallback((amount) => {
    setServiceForm((prev) => ({ ...prev, amount: amount.toString() }));
  }, []);

  const autoFillFromTemplate = useCallback(() => {
    const commonServices = [
      { name: "Consulting Services", amount: 10000, type: "consulting" },
      { name: "Development Services", amount: 25000, type: "development" },
      { name: "Design Services", amount: 15000, type: "design" },
    ];

    const randomService =
      commonServices[Math.floor(Math.random() * commonServices.length)];
    setServiceForm((prev) => ({
      ...prev,
      serviceName: randomService.name,
      amount: randomService.amount.toString(),
      serviceType: randomService.type,
    }));
  }, []);

  // Form submission
  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const firmName = formData.isBiller2
        ? settings.biller2FirmName
        : settings.biller1FirmName;
      const billerState = formData.isBiller2
        ? settings.biller2State
        : settings.biller1State;

      const allServices = [
        ...selectedTasks.map((task) => ({
          serviceName: task.serviceName,
          serviceCode: task.serviceCode,
          sacCode: task.sacCode,
          amount: parseFloat(task.amount),
          servicePeriod: task.servicePeriod,
          isCustom: false,
          taskId: task.taskId,
        })),
        ...formData.services
          .filter((s) => s.isCustom)
          .map((service) => ({
            serviceName: service.serviceName,
            serviceCode: service.serviceCode || "CUSTOM",
            sacCode: service.sacCode || "998314",
            amount: parseFloat(service.amount),
            servicePeriod: service.servicePeriod || "N/A",
            isCustom: true,
            description: service.description || "",
            customServiceType: service.customServiceType || "OTHER",
          })),
      ];

      const editData = {
        clientCode: formData.clientCode,
        clientName: formData.clientName,
        salutation: formData.salutation,
        address: formData.address,
        gstin: formData.gstin,
        placeOfSupply: formData.placeOfSupply,
        isBiller2: formData.isBiller2,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        services: allServices,
        notes: formData.notes,
        customerNotes: formData.customerNotes,
        firmName: firmName,
        billerState: billerState,
        tasks: selectedTasks.map((task) => ({
          taskId: task.taskId,
          amount: task.amount,
          servicePeriod: task.servicePeriod,
        })),
      };

      console.log("Sending edit request data:", editData);

      const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit edit request");
      }

      await response.json();

      setSuccess("Edit request submitted for admin approval successfully!");
      setEditMode(false);

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to submit edit request");
      console.error("Error updating invoice:", err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!keyboardMode || !editMode) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (serviceForm.serviceName && serviceForm.amount) {
          addCustomService();
        }
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setEditMode(false);
      }
    };

    if (keyboardMode && editMode) {
      window.addEventListener("keydown", handleKeyPress);
      return () => window.removeEventListener("keydown", handleKeyPress);
    }
  }, [keyboardMode, editMode, handleSubmit, addCustomService, serviceForm]);

  // Status helpers
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return theme.warning;
      case "approved":
        return theme.success;
      case "rejected":
        return theme.error;
      default:
        return theme.info;
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return <Pending />;
      case "approved":
        return <CheckCircle />;
      case "rejected":
        return <ErrorIcon />;
      default:
        return <Info />;
    }
  };

  if (loading && !invoice) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Invoice not found or you do not have permission to view it.
        </Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{ background: theme.gradients.primary, minHeight: "100vh", py: 3 }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Paper
            elevation={6}
            sx={{ borderRadius: 3, overflow: "hidden", mb: 3 }}
          >
            <Box
              sx={{ background: theme.gradients.primary, color: "white", p: 3 }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Edit sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Edit Invoice #{invoice.invoiceNumber}
                      </Typography>
                      <Typography variant="h6" sx={{ opacity: 0.9 }}>
                        {editMode
                          ? "Making changes with tasks and services"
                          : "View and edit invoice details"}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Chip
                      icon={getStatusIcon(invoice.status)}
                      label={`Status: ${invoice.status || "Draft"}`}
                      variant="outlined"
                      sx={{ borderColor: "white", color: "white" }}
                    />
                    {editMode && (
                      <Chip
                        icon={keyboardMode ? <Keyboard /> : <Mouse />}
                        label={keyboardMode ? "Keyboard Mode ON" : "Mouse Mode"}
                        variant="outlined"
                        sx={{ borderColor: "white", color: "white" }}
                        onClick={() => setKeyboardMode(!keyboardMode)}
                      />
                    )}
                    {hasUnsavedChanges && editMode && (
                      <Chip
                        icon={<Warning />}
                        label="Unsaved Changes"
                        variant="outlined"
                        sx={{ borderColor: "#ff9800", color: "#ff9800" }}
                      />
                    )}
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
                        "&:hover": {
                          borderColor: "white",
                          background: "rgba(255,255,255,0.1)",
                        },
                      }}
                    >
                      Back to Invoices
                    </Button>

                    {!editMode && (
                      <Button
                        variant="contained"
                        startIcon={<Edit />}
                        onClick={() => setEditMode(true)}
                        sx={{
                          background: theme.gradients.warning,
                          "&:hover": { background: theme.gradients.warning },
                        }}
                      >
                        Edit Invoice
                      </Button>
                    )}

                    <Button
                      variant="outlined"
                      startIcon={<History />}
                      onClick={() => setShowEditHistory(true)}
                      sx={{
                        borderColor: "white",
                        color: "white",
                        "&:hover": {
                          borderColor: "white",
                          background: "rgba(255,255,255,0.1)",
                        },
                      }}
                    >
                      <Badge
                        badgeContent={invoice.editRequests?.length || 0}
                        color="error"
                      >
                        History
                      </Badge>
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Keyboard Shortcuts Info */}
          {keyboardMode && editMode && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Keyboard Shortcuts:</strong> Ctrl+Enter (Submit Changes)
                • Ctrl+S (Add Service) • Escape (Cancel Edit)
              </Typography>
            </Alert>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{ mb: 3 }}
              onClose={() => setSuccess("")}
            >
              {success}
            </Alert>
          )}

          {/* Main Content */}
          <Grid container spacing={3}>
            {/* Invoice Details */}
            <Grid item xs={12} lg={8}>
              <Paper elevation={4} sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box
                  sx={{
                    background: theme.gradients.success,
                    color: "white",
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Invoice Details
                  </Typography>
                </Box>

                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    {/* Client Information */}
                    <Grid item xs={12}>
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, color: theme.primary }}
                      >
                        Client Information
                      </Typography>

                      {editMode ? (
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <ClientSearchBar
                              clients={clients}
                              onSelect={handleClientSelect}
                              value={formData.selectedClient}
                              placeholder="Search and select client..."
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>Salutation</InputLabel>
                              <Select
                                value={formData.salutation}
                                onChange={(e) =>
                                  handleFormChange("salutation", e.target.value)
                                }
                                label="Salutation"
                              >
                                {SALUTATIONS.map((sal) => (
                                  <MenuItem key={sal} value={sal}>
                                    {sal}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Client Name"
                              value={formData.clientName}
                              onChange={(e) =>
                                handleFormChange("clientName", e.target.value)
                              }
                              fullWidth
                              required
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <TextField
                              label="Address"
                              value={formData.address}
                              onChange={(e) =>
                                handleFormChange("address", e.target.value)
                              }
                              fullWidth
                              multiline
                              rows={2}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="GSTIN"
                              value={formData.gstin}
                              onChange={(e) =>
                                handleFormChange("gstin", e.target.value)
                              }
                              fullWidth
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Autocomplete
                              freeSolo
                              options={STATES}
                              value={formData.placeOfSupply}
                              onChange={(event, newValue) =>
                                handleFormChange("placeOfSupply", newValue)
                              }
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Place of Supply"
                                  fullWidth
                                  required
                                />
                              )}
                            />
                          </Grid>
                        </Grid>
                      ) : (
                        <Card variant="outlined">
                          <CardContent>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Client Name
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {invoice.salutation} {invoice.clientName}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Client Code
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {invoice.clientCode}
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Address
                                </Typography>
                                <Typography variant="body1">
                                  {invoice.address || "No address provided"}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  GSTIN
                                </Typography>
                                <Typography variant="body1">
                                  {invoice.gstin || "N/A"}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Place of Supply
                                </Typography>
                                <Typography variant="body1">
                                  {invoice.placeOfSupply || "N/A"}
                                </Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      )}
                    </Grid>

                    {/* Invoice Details */}
                    <Grid item xs={12}>
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, color: theme.primary }}
                      >
                        Invoice Information
                      </Typography>

                      {editMode ? (
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>Invoice Type</InputLabel>
                              <Select
                                value={formData.isBiller2}
                                onChange={(e) =>
                                  handleFormChange("isBiller2", e.target.value)
                                }
                                label="Invoice Type"
                              >
                                <MenuItem value={false}>
                                  ☀️ {settings.biller1Terminology}
                                </MenuItem>
                                <MenuItem value={true}>
                                  🌙 {settings.biller2Terminology}
                                </MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Invoice Number"
                              value={invoice.invoiceNumber}
                              fullWidth
                              disabled
                              helperText="Invoice number cannot be changed"
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <DatePicker
                              label="Invoice Date"
                              value={formData.invoiceDate}
                              onChange={(date) =>
                                handleFormChange("invoiceDate", date)
                              }
                              renderInput={(params) => (
                                <TextField {...params} fullWidth required />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <DatePicker
                              label="Due Date"
                              value={formData.dueDate}
                              onChange={(date) =>
                                handleFormChange("dueDate", date)
                              }
                              renderInput={(params) => (
                                <TextField {...params} fullWidth required />
                              )}
                            />
                          </Grid>
                        </Grid>
                      ) : (
                        <Card variant="outlined">
                          <CardContent>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Invoice Number
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {invoice.invoiceNumber}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Invoice Type
                                </Typography>
                                <Typography variant="body1">
                                  {invoice.isBiller2
                                    ? settings.biller2Terminology
                                    : settings.biller1Terminology}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Invoice Date
                                </Typography>
                                <Typography variant="body1">
                                  {new Date(
                                    invoice.invoiceDate
                                  ).toLocaleDateString()}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Due Date
                                </Typography>
                                <Typography variant="body1">
                                  {new Date(
                                    invoice.dueDate
                                  ).toLocaleDateString()}
                                </Typography>
                              </Grid>
                            </Grid>{" "}
                            {/* ✅ CLOSE THE Grid CONTAINER */}
                          </CardContent>
                        </Card>
                      )}
                    </Grid>

                    {/* Services Section */}
                    <Grid item xs={12}>
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, color: theme.primary }}
                      >
                        Services & Tasks (
                        {editMode
                          ? selectedTasks.length +
                            formData.services.filter((s) => s.isCustom).length
                          : invoice.services?.length || 0}
                        )
                      </Typography>

                      {/* Task Selection - Only show in edit mode */}
                      {editMode && formData.clientCode && (
                        <Box sx={{ mb: 3 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              mb: 2,
                            }}
                          >
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              📋 Available Tasks
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<Settings />}
                              onClick={() => setShowTaskFilter(!showTaskFilter)}
                              variant="outlined"
                            >
                              Filter by Status
                            </Button>
                          </Box>

                          {showTaskFilter && (
                            <Card sx={{ mb: 3 }}>
                              <CardContent>
                                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                  Select task statuses to include:
                                </Typography>
                                <FormGroup row>
                                  {TASK_STATUSES.map((status) => (
                                    <FormControlLabel
                                      key={status.value}
                                      control={
                                        <Checkbox
                                          checked={taskStatusFilter.includes(
                                            status.value
                                          )}
                                          onChange={() =>
                                            handleStatusFilterChange(
                                              status.value
                                            )
                                          }
                                          disabled={loading || tasksLoading}
                                        />
                                      }
                                      label={status.label}
                                    />
                                  ))}
                                </FormGroup>
                              </CardContent>
                            </Card>
                          )}

                          {tasksLoading ? (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                py: 4,
                              }}
                            >
                              <CircularProgress />
                              <Typography sx={{ ml: 2 }}>
                                Loading billable tasks...
                              </Typography>
                            </Box>
                          ) : billableTasks.length > 0 ? (
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ mb: 2, color: "text.secondary" }}
                              >
                                Found {billableTasks.length} billable task(s)
                              </Typography>

                              {billableTasks.map((task) => (
                                <Card
                                  key={task._id}
                                  sx={{
                                    mb: 2,
                                    border: selectedTasks.some(
                                      (t) => t.taskId === task._id
                                    )
                                      ? "2px solid #4caf50"
                                      : "1px solid #e0e0e0",
                                    backgroundColor: selectedTasks.some(
                                      (t) => t.taskId === task._id
                                    )
                                      ? "#f8f9ff"
                                      : "white",
                                  }}
                                >
                                  <CardContent>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                      }}
                                    >
                                      <FormControlLabel
                                        control={
                                          <Checkbox
                                            checked={selectedTasks.some(
                                              (t) => t.taskId === task._id
                                            )}
                                            onChange={(e) =>
                                              handleTaskSelection(
                                                task._id,
                                                e.target.checked
                                              )
                                            }
                                            disabled={loading}
                                          />
                                        }
                                        label=""
                                      />
                                      <Box sx={{ flexGrow: 1 }}>
                                        <Typography
                                          variant="h6"
                                          sx={{ fontWeight: 600, mb: 1 }}
                                        >
                                          {task.serviceName}
                                        </Typography>
                                        <Box sx={{ mb: 1 }}>
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            component="span"
                                          >
                                            📅 Period: {task.servicePeriod}
                                          </Typography>
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            component="span"
                                            sx={{ ml: 2 }}
                                          >
                                            🏢 Service Code: {task.serviceCode}
                                          </Typography>
                                        </Box>
                                        <Chip
                                          label={task.status}
                                          size="small"
                                          sx={{
                                            backgroundColor:
                                              TASK_STATUSES.find(
                                                (s) => s.value === task.status
                                              )?.color || "#gray",
                                            color: "white",
                                            fontSize: "0.75rem",
                                          }}
                                        />
                                      </Box>
                                      <TextField
                                        label="Amount (₹)"
                                        type="number"
                                        size="small"
                                        value={taskAmounts[task._id] || ""}
                                        onChange={(e) =>
                                          handleTaskAmountChange(
                                            task._id,
                                            e.target.value
                                          )
                                        }
                                        disabled={loading}
                                        sx={{ width: "150px" }}
                                        inputProps={{ min: 0, step: 0.01 }}
                                        placeholder="0.00"
                                      />
                                    </Box>
                                  </CardContent>
                                </Card>
                              ))}
                            </Box>
                          ) : (
                            <Alert severity="info">
                              No billable tasks found for this client. You can
                              add custom services below.
                            </Alert>
                          )}
                        </Box>
                      )}

                      {/* Add Custom Service - Only in edit mode */}
                      {editMode && (
                        <Accordion sx={{ mb: 2 }}>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              Add Custom Service
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  label="Service Name"
                                  value={serviceForm.serviceName}
                                  onChange={(e) =>
                                    setServiceForm((prev) => ({
                                      ...prev,
                                      serviceName: e.target.value,
                                    }))
                                  }
                                  fullWidth
                                  required
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        <Tooltip title="Auto-fill from template">
                                          <IconButton
                                            onClick={autoFillFromTemplate}
                                            size="small"
                                          >
                                            <AutoAwesome />
                                          </IconButton>
                                        </Tooltip>
                                      </InputAdornment>
                                    ),
                                  }}
                                />
                              </Grid>

                              <Grid item xs={12} sm={6}>
                                <TextField
                                  label="Amount"
                                  type="number"
                                  value={serviceForm.amount}
                                  onChange={(e) =>
                                    setServiceForm((prev) => ({
                                      ...prev,
                                      amount: e.target.value,
                                    }))
                                  }
                                  fullWidth
                                  required
                                  inputProps={{ min: 0, step: 0.01 }}
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        ₹
                                      </InputAdornment>
                                    ),
                                  }}
                                />
                              </Grid>

                              <Grid item xs={12}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  gutterBottom
                                >
                                  Quick Amounts:
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {QUICK_AMOUNTS.map((amount) => (
                                    <Chip
                                      key={amount}
                                      label={formatIndianCurrency(amount)}
                                      onClick={() => handleQuickAmount(amount)}
                                      variant="outlined"
                                      size="small"
                                      sx={{ cursor: "pointer" }}
                                    />
                                  ))}
                                </Box>
                              </Grid>

                              <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                  <InputLabel>Service Type</InputLabel>
                                  <Select
                                    value={serviceForm.serviceType}
                                    onChange={(e) =>
                                      setServiceForm((prev) => ({
                                        ...prev,
                                        serviceType: e.target.value,
                                      }))
                                    }
                                    label="Service Type"
                                  >
                                    {SERVICE_TYPES.map((type) => (
                                      <MenuItem
                                        key={type.value}
                                        value={type.value}
                                      >
                                        {type.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>

                              <Grid item xs={12} sm={6}>
                                <TextField
                                  label="SAC Code"
                                  value={serviceForm.sacCode}
                                  onChange={(e) =>
                                    setServiceForm((prev) => ({
                                      ...prev,
                                      sacCode: e.target.value,
                                    }))
                                  }
                                  fullWidth
                                />
                              </Grid>

                              <Grid item xs={12}>
                                <TextField
                                  label="Description"
                                  value={serviceForm.description}
                                  onChange={(e) =>
                                    setServiceForm((prev) => ({
                                      ...prev,
                                      description: e.target.value,
                                    }))
                                  }
                                  fullWidth
                                  multiline
                                  rows={2}
                                />
                              </Grid>

                              <Grid item xs={12}>
                                <Button
                                  variant="contained"
                                  onClick={addCustomService}
                                  startIcon={<Add />}
                                  disabled={
                                    !serviceForm.serviceName ||
                                    !serviceForm.amount
                                  }
                                  sx={{ background: theme.gradients.success }}
                                >
                                  Add Custom Service{" "}
                                  {keyboardMode && "(Ctrl+S)"}
                                </Button>
                              </Grid>
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      )}

                      {/* Services Table */}
                      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                        <TableContainer>
                          <Table>
                            <TableHead>
                              <TableRow sx={{ background: "#f5f5f5" }}>
                                <TableCell>Service Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                {editMode && (
                                  <TableCell align="center">Actions</TableCell>
                                )}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {editMode ? (
                                <>
                                  {selectedTasks.map((task, index) => (
                                    <TableRow key={`task-${index}`}>
                                      <TableCell>
                                        <Box>
                                          <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600 }}
                                          >
                                            {task.serviceName}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            Period: {task.servicePeriod}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label="Task-based"
                                          color="primary"
                                          size="small"
                                        />
                                      </TableCell>
                                      <TableCell align="right">
                                        <Typography
                                          variant="body2"
                                          sx={{ fontWeight: 600 }}
                                        >
                                          {formatIndianCurrency(task.amount)}
                                        </Typography>
                                      </TableCell>
                                      <TableCell align="center">
                                        <IconButton
                                          onClick={() =>
                                            handleTaskSelection(
                                              task.taskId,
                                              false
                                            )
                                          }
                                          color="error"
                                          size="small"
                                        >
                                          <Delete />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  {formData.services
                                    .filter((s) => s.isCustom)
                                    .map((service, index) => (
                                      <TableRow key={`custom-${index}`}>
                                        <TableCell>
                                          <Box>
                                            <Typography
                                              variant="body2"
                                              sx={{ fontWeight: 600 }}
                                            >
                                              {service.serviceName}
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
                                          <Chip
                                            label="Custom"
                                            color="secondary"
                                            size="small"
                                          />
                                        </TableCell>
                                        <TableCell align="right">
                                          <TextField
                                            type="number"
                                            value={service.amount}
                                            onChange={(e) =>
                                              updateService(
                                                index,
                                                "amount",
                                                parseFloat(e.target.value) || 0
                                              )
                                            }
                                            size="small"
                                            inputProps={{ min: 0, step: 0.01 }}
                                            InputProps={{
                                              startAdornment: (
                                                <InputAdornment position="start">
                                                  ₹
                                                </InputAdornment>
                                              ),
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell align="center">
                                          <IconButton
                                            onClick={() => removeService(index)}
                                            color="error"
                                            size="small"
                                          >
                                            <Delete />
                                          </IconButton>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </>
                              ) : (
                                invoice.services?.map((service, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      <Box>
                                        <Typography
                                          variant="body2"
                                          sx={{ fontWeight: 600 }}
                                        >
                                          {service.serviceName}
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
                                      <Chip
                                        label={
                                          service.isCustom
                                            ? "Custom"
                                            : "Task-based"
                                        }
                                        color={
                                          service.isCustom
                                            ? "secondary"
                                            : "primary"
                                        }
                                        size="small"
                                      />
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600 }}
                                      >
                                        {formatIndianCurrency(service.amount)}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        <Box
                          sx={{
                            p: 2,
                            background: "#f5f5f5",
                            borderTop: "1px solid #ddd",
                          }}
                        >
                          <Typography
                            variant="h6"
                            align="right"
                            sx={{ fontWeight: 700 }}
                          >
                            Total:{" "}
                            {formatIndianCurrency(
                              editMode ? totalAmount : invoice.totalAmount
                            )}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Notes Section */}
                    {editMode && (
                      <Grid item xs={12}>
                        <Typography
                          variant="h6"
                          sx={{ mb: 2, color: theme.primary }}
                        >
                          Notes
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Internal Notes"
                              value={formData.notes}
                              onChange={(e) =>
                                handleFormChange("notes", e.target.value)
                              }
                              fullWidth
                              multiline
                              rows={4}
                              placeholder="Internal notes (not visible to client)..."
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Customer Notes"
                              value={formData.customerNotes}
                              onChange={(e) =>
                                handleFormChange(
                                  "customerNotes",
                                  e.target.value
                                )
                              }
                              fullWidth
                              multiline
                              rows={4}
                              placeholder="Notes visible to customer..."
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    )}
                  </Grid>
                </Box>

                {/* Action Buttons */}
                {editMode && (
                  <Box
                    sx={{
                      p: 3,
                      background: "#f8f9fa",
                      borderTop: "1px solid #ddd",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Button
                        onClick={() => setEditMode(false)}
                        startIcon={<Cancel />}
                        disabled={loading}
                      >
                        Cancel {keyboardMode && "(Escape)"}
                      </Button>

                      <Box sx={{ display: "flex", gap: 2 }}>
                        <Button
                          variant="contained"
                          onClick={handleSubmit}
                          disabled={loading || !hasUnsavedChanges}
                          startIcon={
                            loading ? <CircularProgress size={20} /> : <Send />
                          }
                          sx={{
                            background: theme.gradients.success,
                            minWidth: 200,
                          }}
                        >
                          {loading
                            ? "Submitting..."
                            : `Submit for Approval ${
                                keyboardMode ? "(Ctrl+Enter)" : ""
                              }`}
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} lg={4}>
              {/* Invoice Summary */}
              <Paper
                elevation={4}
                sx={{ borderRadius: 3, overflow: "hidden", mb: 3 }}
              >
                <Box
                  sx={{
                    background: theme.gradients.info,
                    color: "white",
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Invoice Summary
                  </Typography>
                </Box>

                <Box sx={{ p: 2 }}>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Invoice Number"
                        secondary={invoice.invoiceNumber}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Client"
                        secondary={`${invoice.salutation} ${invoice.clientName}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Tasks"
                        secondary={`${selectedTasks.length} selected`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Custom Services"
                        secondary={`${
                          formData.services.filter((s) => s.isCustom).length
                        } added`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Total Amount"
                        secondary={
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 700, color: theme.success }}
                          >
                            {formatIndianCurrency(
                              editMode ? totalAmount : invoice.totalAmount
                            )}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Status"
                        secondary={
                          <Chip
                            icon={getStatusIcon(invoice.status)}
                            label={invoice.status || "Draft"}
                            color={
                              invoice.status === "Approved"
                                ? "success"
                                : invoice.status === "Rejected"
                                ? "error"
                                : "warning"
                            }
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                  </List>
                </Box>
              </Paper>

              {/* Edit Requests History */}
              {invoice.editRequests && invoice.editRequests.length > 0 && (
                <Paper
                  elevation={4}
                  sx={{ borderRadius: 3, overflow: "hidden" }}
                >
                  <Box
                    sx={{
                      background: theme.gradients.warning,
                      color: "white",
                      p: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Edit Requests History
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2 }}>
                    <List dense>
                      {invoice.editRequests
                        .slice(-3)
                        .reverse()
                        .map((request, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemAvatar>
                              <Avatar
                                sx={{
                                  background: getStatusColor(request.status),
                                  width: 32,
                                  height: 32,
                                }}
                              >
                                {getStatusIcon(request.status)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600 }}
                                >
                                  Edit Request {request.status}
                                </Typography>
                              }
                              secondary={
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Requested:{" "}
                                    {new Date(
                                      request.requestedAt
                                    ).toLocaleDateString()}
                                  </Typography>
                                  {request.reviewedAt && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: "block" }}
                                    >
                                      Reviewed:{" "}
                                      {new Date(
                                        request.reviewedAt
                                      ).toLocaleDateString()}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                    </List>

                    {invoice.editRequests.length > 3 && (
                      <Button
                        size="small"
                        onClick={() => setShowEditHistory(true)}
                        sx={{ mt: 1 }}
                      >
                        View All ({invoice.editRequests.length})
                      </Button>
                    )}
                  </Box>
                </Paper>
              )}
            </Grid>
          </Grid>

          {/* Edit History Dialog */}
          <Dialog
            open={showEditHistory}
            onClose={() => setShowEditHistory(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Timeline />
                Complete Edit History
              </Box>
            </DialogTitle>
            <DialogContent>
              {invoice.editRequests && invoice.editRequests.length > 0 ? (
                <List>
                  {invoice.editRequests.reverse().map((request, index) => (
                    <ListItem key={index} divider>
                      <ListItemAvatar>
                        <Avatar
                          sx={{ background: getStatusColor(request.status) }}
                        >
                          {getStatusIcon(request.status)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Edit Request #{invoice.editRequests.length - index}
                          </Typography>
                        }
                        secondary={
                          <Box component="div">
                            <Typography variant="body2" component="div">
                              Status: <strong>{request.status}</strong>
                            </Typography>
                            <Typography variant="body2" component="div">
                              Requested:{" "}
                              {new Date(request.requestedAt).toLocaleString()}
                            </Typography>
                            {request.reviewedAt && (
                              <Typography variant="body2" component="div">
                                Reviewed:{" "}
                                {new Date(request.reviewedAt).toLocaleString()}
                              </Typography>
                            )}
                            {request.changes && (
                              <Typography
                                variant="body2"
                                component="div"
                                sx={{ mt: 1 }}
                              >
                                Changes: Client:{" "}
                                {request.changes.clientName || "N/A"}, Services:{" "}
                                {request.changes.services?.length || 0}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography component="div">No edit requests found.</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowEditHistory(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </LocalizationProvider>
  );
};

export default EditInvoicePage;
