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
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  Add,
  Delete,
  ArrowBack,
  ExpandMore,
  AutoAwesome,
  Keyboard,
  Mouse,
  Send,
  List as ListIcon,
  Info,
  Person,
  Receipt,
  AddBusiness,
  TrendingUp,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import ClientSearchBar from "../components/ClientSearchBar";
import TaskSelectionDialog from "../components/TaskSelectionDialog";
// import { formatIndianCurrency } from "../utils/invoiceUtils";
import "../styles/NewInvoicePage.css";
import API_BASE_URL from "../config"; // adjust path based on file depth

// State code mapping for automatic place of supply determination
const STATE_CODE_MAPPING = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  10: "Bihar",
  11: "Sikkim",
  12: "Arunachal Pradesh",
  13: "Nagaland",
  14: "Manipur",
  15: "Mizoram",
  16: "Tripura",
  17: "Meghalaya",
  18: "Assam",
  19: "West Bengal",
  20: "Jharkhand",
  21: "Odisha",
  22: "Chhattisgarh",
  23: "Madhya Pradesh",
  24: "Gujarat",
  25: "Daman and Diu",
  26: "Dadra and Nagar Haveli",
  27: "Maharashtra",
  28: "Andhra Pradesh (before split)",
  29: "Karnataka",
  30: "Goa",
  31: "Lakshadweep",
  32: "Kerala",
  33: "Tamil Nadu",
  34: "Puducherry",
  35: "Andaman and Nicobar Islands",
  36: "Telangana",
  37: "Andhra Pradesh",
  38: "Ladakh",
};

// Utility functions for GST and place of supply
const getStateFromGSTIN = (gstin) => {
  if (!gstin || typeof gstin !== "string") return null;
  const cleanGSTIN = gstin.trim().toUpperCase();
  if (cleanGSTIN.length !== 15) return null;
  const stateCode = cleanGSTIN.substring(0, 2);
  return STATE_CODE_MAPPING[stateCode] || null;
};

const determinePlaceOfSupply = (clientData, supplierState) => {
  if (!clientData) {
    return {
      placeOfSupply: supplierState || "",
      determinedBy: "supplier_location",
      reason: "No client data provided",
      isRegistered: false,
    };
  }

  const gstin = clientData.gstin?.trim();

  if (gstin && gstin.length === 15) {
    const stateFromGST = getStateFromGSTIN(gstin);

    if (stateFromGST) {
      return {
        placeOfSupply: stateFromGST,
        determinedBy: "recipient_location",
        reason: "Recipient is GST registered",
        isRegistered: true,
        gstStateCode: gstin.substring(0, 2),
      };
    } else {
      return {
        placeOfSupply: supplierState || "",
        determinedBy: "supplier_location",
        reason: "Invalid GST number format",
        isRegistered: false,
      };
    }
  } else {
    return {
      placeOfSupply: supplierState || "",
      determinedBy: "supplier_location",
      reason: "Recipient is not GST registered",
      isRegistered: false,
    };
  }
};

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

const NewInvoicePage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [billedTaskIds, setBilledTaskIds] = useState(new Set());
  const [settings, setSettings] = useState({
    biller1Terminology: "Biller-1",
    biller2Terminology: "Biller-2",
    biller1FirmName: "",
    biller2FirmName: "",
    biller1State: "",
    biller2State: "",
    // GST application settings
    isBiller1GSTApplicable: true,
    isBiller2GSTApplicable: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [keyboardMode, setKeyboardMode] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [placeOfSupplyInfo, setPlaceOfSupplyInfo] = useState(null);

  const [formData, setFormData] = useState({
    // Client type for one-time services
    clientType: "Client", // "Client" or "NonClient"
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

  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Auto-determine place of supply based on GST registration status
  const updatePlaceOfSupply = useCallback((clientData, billerState) => {
    if (!clientData) {
      setPlaceOfSupplyInfo(null);
      return;
    }

    const result = determinePlaceOfSupply(clientData, billerState);
    setPlaceOfSupplyInfo(result);

    setFormData((prev) => ({
      ...prev,
      placeOfSupply: result.placeOfSupply,
    }));

    console.log("🎯 Place of supply determined:", result);
  }, []);

  // Calculate total with GST consideration and PERIOD BILLING support
  const { totalAmount, gstAmount, grandTotal } = useMemo(() => {
    // Calculate from selected tasks
    const taskTotal = selectedTaskIds.reduce(
      (sum, task) => sum + (parseFloat(task.amount) || 0),
      0
    );

    // Calculate from custom services (including period billing services)
    const customTotal = formData.services
      .filter((s) => s.isCustom)
      .reduce((sum, service) => sum + (parseFloat(service.amount) || 0), 0);

    const subtotal = taskTotal + customTotal;

    // Apply GST based on biller settings
    const isGSTApplicable = formData.isBiller2
      ? settings.isBiller2GSTApplicable
      : settings.isBiller1GSTApplicable;

    const gstAmount = isGSTApplicable ? subtotal * 0.18 : 0; // 18% GST
    const grandTotal = subtotal + gstAmount;

    return {
      totalAmount: subtotal,
      gstAmount,
      grandTotal,
    };
  }, [selectedTaskIds, formData.services, formData.isBiller2, settings]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication required");
          navigate("/login");
          return;
        }

        const [clientsRes, settingsRes] = await Promise.all([
          fetch("${API_BASE_URL}/api/clients", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("${API_BASE_URL}/api/settings/invoice", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!clientsRes.ok) {
          throw new Error("Failed to load clients");
        }
        if (!settingsRes.ok) {
          throw new Error("Failed to load settings");
        }

        const [clientsData, settingsData] = await Promise.all([
          clientsRes.json(),
          settingsRes.json(),
        ]);

        setClients(Array.isArray(clientsData) ? clientsData : []);
        setSettings({
          biller1Terminology: settingsData.biller1Terminology || "Biller-1",
          biller2Terminology: settingsData.biller2Terminology || "Biller-2",
          biller1FirmName: settingsData.biller1FirmName || "Company 1",
          biller2FirmName: settingsData.biller2FirmName || "Company 2",
          biller1State: settingsData.biller1State || "Maharashtra",
          biller2State: settingsData.biller2State || "Delhi",
          // Load GST settings
          isBiller1GSTApplicable:
            settingsData.isBiller1GSTApplicable !== undefined
              ? settingsData.isBiller1GSTApplicable
              : true,
          isBiller2GSTApplicable:
            settingsData.isBiller2GSTApplicable !== undefined
              ? settingsData.isBiller2GSTApplicable
              : false,
        });
      } catch (err) {
        setError(err.message || "Failed to load data");
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Fetch billed task IDs when client is selected
  useEffect(() => {
    const fetchBilledTaskIds = async () => {
      if (!formData.clientCode) {
        setBilledTaskIds(new Set());
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_BASE_URL}/api/taskbillings/billed-tasks/${formData.clientCode}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const billedTasks = await response.json();
          const billedIds = new Set(
            billedTasks.map((task) => task.taskId || task._id)
          );
          setBilledTaskIds(billedIds);
          console.log(
            `Loaded ${billedIds.size} billed task IDs for client ${formData.clientCode}`
          );
        }
      } catch (err) {
        console.warn("Error loading billed tasks:", err);
        setBilledTaskIds(new Set());
      }
    };

    fetchBilledTaskIds();
  }, [formData.clientCode]);

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

  // Handle client selection with support for one-time services
  const handleClientSelect = useCallback(
    (client) => {
      if (client) {
        const billerState = formData.isBiller2
          ? settings.biller2State
          : settings.biller1State;

        handleFormChange("selectedClient", client);
        handleFormChange("clientCode", client.clientCode);
        handleFormChange("clientName", client.clientName);
        handleFormChange("address", client.address || "");
        handleFormChange("gstin", client.gstin || "");

        updatePlaceOfSupply(client, billerState);
      }
    },
    [handleFormChange, formData.isBiller2, settings, updatePlaceOfSupply]
  );

  // Handle client type change
  const handleClientTypeChange = useCallback(
    (isExistingClient) => {
      const clientType = isExistingClient ? "Client" : "NonClient";
      handleFormChange("clientType", clientType);

      // Clear client-related fields when switching
      if (!isExistingClient) {
        handleFormChange("selectedClient", null);
        handleFormChange("clientCode", "");
        // Keep clientName for manual entry
      } else {
        handleFormChange("clientName", "");
        handleFormChange("address", "");
        handleFormChange("gstin", "");
        handleFormChange("placeOfSupply", "");
      }
    },
    [handleFormChange]
  );

  // Update place of supply when biller changes
  useEffect(() => {
    if (formData.selectedClient) {
      const billerState = formData.isBiller2
        ? settings.biller2State
        : settings.biller1State;
      updatePlaceOfSupply(formData.selectedClient, billerState);
    }
  }, [
    formData.isBiller2,
    formData.selectedClient,
    settings,
    updatePlaceOfSupply,
  ]);

  // Update place of supply when GSTIN changes
  useEffect(() => {
    if (formData.clientType === "NonClient" && formData.gstin) {
      const billerState = formData.isBiller2
        ? settings.biller2State
        : settings.biller1State;

      const pseudoClient = {
        clientName: formData.clientName,
        gstin: formData.gstin,
        address: formData.address,
      };

      updatePlaceOfSupply(pseudoClient, billerState);
    }
  }, [
    formData.gstin,
    formData.clientType,
    formData.isBiller2,
    settings,
    updatePlaceOfSupply,
    formData.clientName,
    formData.address,
  ]);

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

  // const updateService = useCallback((index, field, value) => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     services: prev.services.map((service, i) =>
  //       i === index ? { ...service, [field]: value } : service
  //     ),
  //   }));
  // }, []);

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

  // Handle task selection with PERIOD BILLING support
  const handleTasksSelected = useCallback((tasks) => {
    console.log(`📋 Tasks selected for billing:`, tasks);

    // Separate regular tasks and period billing services
    const regularTasks = tasks.filter((task) => !task.isPeriodBilling);
    const periodBillingServices = tasks.filter((task) => task.isPeriodBilling);

    // Set regular tasks
    setSelectedTaskIds(regularTasks);

    // Add period billing services to custom services
    if (periodBillingServices.length > 0) {
      setFormData((prev) => ({
        ...prev,
        services: [
          ...prev.services,
          ...periodBillingServices.map((periodService) => {
            // Create clean description without timezone
            let cleanDescription = `Period billing: ${periodService.servicePeriod}`;

            if (periodService.periodDetails) {
              const { tasksCount, rate } = periodService.periodDetails;
              if (tasksCount && rate) {
                cleanDescription += ` (${tasksCount} services at ₹${rate} each)`;
              }
            }

            // Include the service frequency if available
            if (
              periodService.periodDetails &&
              periodService.periodDetails.serviceFrequency
            ) {
              cleanDescription += ` [${periodService.periodDetails.serviceFrequency}]`;
            }

            return {
              serviceName: periodService.serviceName, // Just the service name
              description: cleanDescription, // Clean description with frequency info
              amount: parseFloat(periodService.amount),
              serviceType: "consulting",
              sacCode: "998314",
              servicePeriod: periodService.servicePeriod,
              isCustom: true,
              isPeriodBilling: true,
              periodDetails: periodService.periodDetails,
              customServiceType: "PERIOD_BILLING",
              serviceCode: "PERIOD",
              id: periodService.taskId || Date.now().toString(),
              serviceFrequency:
                periodService.periodDetails?.serviceFrequency || null,
            };
          }),
        ],
      }));

      console.log(
        `✅ Added ${periodBillingServices.length} period billing services to custom services`
      );
    }

    console.log(
      `📊 Summary: ${regularTasks.length} regular tasks + ${periodBillingServices.length} period billing services`
    );
  }, []);

  // Enhanced form validation for both client types
  const validateForm = useCallback(() => {
    const errors = [];

    // Client validation based on type
    if (formData.clientType === "Client") {
      if (!formData.clientCode || !formData.clientName) {
        errors.push("Please select a client");
      }
    } else {
      if (!formData.clientName || !formData.clientName.trim()) {
        errors.push("Client name is required for one-time services");
      }
    }

    // Place of supply validation
    if (!formData.placeOfSupply || !formData.placeOfSupply.trim()) {
      errors.push("Place of supply is required");
    }

    // Services validation - include period billing services
    const totalServices =
      selectedTaskIds.length +
      formData.services.filter((s) => s.isCustom).length;
    if (totalServices === 0) {
      errors.push("At least one service or task must be selected");
    }

    // Date validation
    if (!formData.invoiceDate) {
      errors.push("Invoice date is required");
    }
    if (!formData.dueDate) {
      errors.push("Due date is required");
    }

    return errors;
  }, [formData, selectedTaskIds]);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      // Enhanced validation
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join(", "));
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required");
        navigate("/login");
        return;
      }

      // Check for already billed tasks
      const availableSelectedTasks = selectedTaskIds.filter(
        (task) => !billedTaskIds.has(task.taskId)
      );

      if (selectedTaskIds.length > availableSelectedTasks.length) {
        const billedCount =
          selectedTaskIds.length - availableSelectedTasks.length;
        setError(
          `${billedCount} selected task(s) are already billed. Please refresh and try again.`
        );
        setLoading(false);
        return;
      }

      // Handle both regular tasks and period billing services
      const allServices = [
        ...availableSelectedTasks.map((task) => ({
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
            // Include period billing details
            isPeriodBilling: service.isPeriodBilling || false,
            periodDetails: service.periodDetails || null,
            serviceFrequency: service.serviceFrequency || null,
          })),
      ];

      // Calculate services count properly
      const regularTasksCount = availableSelectedTasks.length;
      const customServicesCount = formData.services.filter(
        (s) => s.isCustom
      ).length;
      const periodBillingServicesCount = formData.services.filter(
        (s) => s.isPeriodBilling
      ).length;
      const totalServicesCount = regularTasksCount + customServicesCount;

      // Determine firm info based on biller type
      const firmName = formData.isBiller2
        ? settings.biller2FirmName
        : settings.biller1FirmName;
      const billerState = formData.isBiller2
        ? settings.biller2State
        : settings.biller1State;

      // Invoice data with period billing support
      const invoiceData = {
        // Handle client data based on type
        clientCode: formData.clientType === "Client" ? formData.clientCode : "",
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
        firmName,
        billerState,
        // Add metadata with period billing info
        clientType: formData.clientType,
        placeOfSupplyDeterminedBy: placeOfSupplyInfo?.determinedBy || "manual",
        placeOfSupplyReason: placeOfSupplyInfo?.reason,
        isGSTApplicable: formData.isBiller2
          ? settings.isBiller2GSTApplicable
          : settings.isBiller1GSTApplicable,
        // Include all service counts properly
        servicesCount: totalServicesCount,
        regularTasksCount,
        customServicesCount,
        periodBillingServicesCount,
        totalTasksCoveredByPeriodBilling: formData.services
          .filter((s) => s.isPeriodBilling)
          .reduce((sum, s) => sum + (s.periodDetails?.tasksCount || 0), 0),
      };

      console.log("📝 Creating invoice with data:", {
        clientType: invoiceData.clientType,
        clientCode: invoiceData.clientCode,
        clientName: invoiceData.clientName,
        servicesCount: invoiceData.servicesCount,
        regularTasksCount: invoiceData.regularTasksCount,
        customServicesCount: invoiceData.customServicesCount,
        periodBillingServicesCount: invoiceData.periodBillingServicesCount,
      });

      console.log(
        "📝 Submitting invoice with enhanced period billing data:",
        invoiceData
      );

      const response = await fetch("${API_BASE_URL}/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create invoice");
      }

      const result = await response.json();
      console.log("✅ Invoice created successfully:", result);
      setSuccess("Invoice created successfully!");
      setTimeout(() => navigate("/invoices"), 2000);
    } catch (err) {
      setError(err.message || "Failed to create invoice");
      console.error("❌ Error creating invoice:", err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!keyboardMode) return;

      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardMode, handleSubmit]);

  // Auto-clear messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (loading && !clients.length) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          py: 3,
        }}
      >
        {/* Task Selection Dialog */}
        <TaskSelectionDialog
          open={taskDialogOpen}
          onClose={() => setTaskDialogOpen(false)}
          clientCode={formData.clientCode}
          billedTaskIds={billedTaskIds}
          onTasksSelected={handleTasksSelected}
          selectedTasks={selectedTaskIds}
        />

        {/* Main Content */}
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Button
                  component={Link}
                  to="/invoices"
                  startIcon={<ArrowBack />}
                  sx={{ mr: 2 }}
                >
                  Back
                </Button>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Create New Invoice
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Tooltip title="Keyboard Mode">
                  <IconButton
                    color={keyboardMode ? "primary" : "default"}
                    onClick={() => setKeyboardMode(true)}
                  >
                    <Keyboard />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Mouse Mode">
                  <IconButton
                    color={!keyboardMode ? "primary" : "default"}
                    onClick={() => setKeyboardMode(false)}
                  >
                    <Mouse />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3 }}
                onClose={() => setError("")}
              >
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

            <Grid container spacing={3}>
              {/* Left Panel */}
              <Grid item xs={12} md={8}>
                {/* Client Section */}
                <Card
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Person sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="h6" color="primary.main">
                        Client Information
                      </Typography>
                    </Box>

                    {/* Client Type Selection */}
                    <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
                      <Button
                        variant={
                          formData.clientType === "Client"
                            ? "contained"
                            : "outlined"
                        }
                        onClick={() => handleClientTypeChange(true)}
                        sx={{ flex: 1 }}
                        startIcon={<Person />}
                      >
                        Existing Client
                      </Button>
                      <Button
                        variant={
                          formData.clientType === "NonClient"
                            ? "contained"
                            : "outlined"
                        }
                        onClick={() => handleClientTypeChange(false)}
                        sx={{ flex: 1 }}
                        startIcon={<AddBusiness />}
                      >
                        One-time Client
                      </Button>
                    </Box>

                    {formData.clientType === "Client" ? (
                      /* Existing Client Selection */
                      <Box sx={{ mb: 3 }}>
                        <ClientSearchBar
                          clients={clients}
                          onClientSelect={handleClientSelect}
                          selectedClient={formData.selectedClient}
                          sx={{ width: "100%" }}
                          placeholder="Search for a client by name or code"
                        />
                      </Box>
                    ) : (
                      /* One-time Client Form */
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Salutation</InputLabel>
                            <Select
                              value={formData.salutation}
                              onChange={(e) =>
                                handleFormChange("salutation", e.target.value)
                              }
                              label="Salutation"
                            >
                              {SALUTATIONS.map((salutation) => (
                                <MenuItem key={salutation} value={salutation}>
                                  {salutation}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={8}>
                          <TextField
                            fullWidth
                            label="Client Name"
                            value={formData.clientName}
                            onChange={(e) =>
                              handleFormChange("clientName", e.target.value)
                            }
                            size="small"
                            error={!!validationErrors.clientName}
                            helperText={validationErrors.clientName}
                          />
                        </Grid>
                      </Grid>
                    )}

                    {/* Client Details */}
                    {(formData.clientType === "NonClient" ||
                      formData.selectedClient) && (
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Address"
                            value={formData.address}
                            onChange={(e) =>
                              handleFormChange("address", e.target.value)
                            }
                            multiline
                            rows={2}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="GSTIN"
                            value={formData.gstin}
                            onChange={(e) =>
                              handleFormChange("gstin", e.target.value)
                            }
                            size="small"
                            inputProps={{
                              style: { textTransform: "uppercase" },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Place of Supply</InputLabel>
                            <Select
                              value={formData.placeOfSupply}
                              onChange={(e) =>
                                handleFormChange(
                                  "placeOfSupply",
                                  e.target.value
                                )
                              }
                              label="Place of Supply"
                              error={!!validationErrors.placeOfSupply}
                            >
                              {STATES.map((state) => (
                                <MenuItem key={state} value={state}>
                                  {state}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {placeOfSupplyInfo && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block", mt: 0.5 }}
                            >
                              <Tooltip
                                title={`Determined by: ${placeOfSupplyInfo.reason}`}
                              >
                                <span>
                                  <Info
                                    fontSize="inherit"
                                    sx={{ verticalAlign: "middle", mr: 0.5 }}
                                  />
                                  Auto-determined based on{" "}
                                  {placeOfSupplyInfo.determinedBy ===
                                  "recipient_location"
                                    ? "client GSTIN"
                                    : "biller location"}
                                </span>
                              </Tooltip>
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>

                {/* Invoice Details Section */}
                <Card
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Receipt sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="h6" color="primary.main">
                        Invoice Details
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Biller</InputLabel>
                          <Select
                            value={formData.isBiller2}
                            onChange={(e) =>
                              handleFormChange("isBiller2", e.target.value)
                            }
                            label="Biller"
                          >
                            <MenuItem value={false}>
                              {settings.biller1Terminology} (
                              {settings.biller1FirmName})
                            </MenuItem>
                            <MenuItem value={true}>
                              {settings.biller2Terminology} (
                              {settings.biller2FirmName})
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={
                                formData.isBiller2
                                  ? settings.isBiller2GSTApplicable
                                  : settings.isBiller1GSTApplicable
                              }
                              disabled
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">
                                GST Applicable
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Set in global settings
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Invoice Date"
                            value={formData.invoiceDate}
                            onChange={(value) =>
                              handleFormChange("invoiceDate", value)
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                fullWidth
                                size="small"
                                error={!!validationErrors.invoiceDate}
                                helperText={validationErrors.invoiceDate}
                              />
                            )}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Due Date"
                            value={formData.dueDate}
                            onChange={(value) =>
                              handleFormChange("dueDate", value)
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                fullWidth
                                size="small"
                                error={!!validationErrors.dueDate}
                                helperText={validationErrors.dueDate}
                              />
                            )}
                          />
                        </LocalizationProvider>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Services Section */}
                <Card
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <TrendingUp sx={{ mr: 1, color: "primary.main" }} />
                        <Typography variant="h6" color="primary.main">
                          Services & Tasks
                        </Typography>
                      </Box>

                      {/* Task Selection Button */}
                      {formData.clientType === "Client" &&
                        formData.clientCode && (
                          <Button
                            variant="outlined"
                            startIcon={<ListIcon />}
                            onClick={() => setTaskDialogOpen(true)}
                          >
                            Select Tasks
                          </Button>
                        )}
                    </Box>

                    {/* Custom Service Entry Form */}
                    <Accordion
                      defaultExpanded
                      sx={{
                        mb: 3,
                        boxShadow: "none",
                        border: "1px solid #e0e0e0",
                        "&:before": { display: "none" },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        sx={{ bgcolor: "background.paper" }}
                      >
                        <Typography>Add Custom Service</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Service Name"
                              value={serviceForm.serviceName}
                              onChange={(e) =>
                                setServiceForm((prev) => ({
                                  ...prev,
                                  serviceName: e.target.value,
                                }))
                              }
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Amount"
                              type="number"
                              value={serviceForm.amount}
                              onChange={(e) =>
                                setServiceForm((prev) => ({
                                  ...prev,
                                  amount: e.target.value,
                                }))
                              }
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    ₹
                                  </InputAdornment>
                                ),
                              }}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
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
                                  <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="SAC Code"
                              value={serviceForm.sacCode}
                              onChange={(e) =>
                                setServiceForm((prev) => ({
                                  ...prev,
                                  sacCode: e.target.value,
                                }))
                              }
                              size="small"
                              placeholder="e.g., 998314"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Description"
                              value={serviceForm.description}
                              onChange={(e) =>
                                setServiceForm((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              multiline
                              rows={2}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 1,
                              }}
                            >
                              <Box sx={{ display: "flex", gap: 1 }}>
                                {QUICK_AMOUNTS.map((amount) => (
                                  <Chip
                                    key={amount}
                                    label={`₹${amount.toLocaleString()}`}
                                    onClick={() => handleQuickAmount(amount)}
                                    clickable
                                  />
                                ))}
                              </Box>
                              <Box sx={{ display: "flex", gap: 1 }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<AutoAwesome />}
                                  onClick={autoFillFromTemplate}
                                >
                                  Auto-fill
                                </Button>
                                <Button
                                  variant="contained"
                                  onClick={addCustomService}
                                  startIcon={<Add />}
                                  disabled={
                                    !serviceForm.serviceName ||
                                    !serviceForm.amount
                                  }
                                >
                                  Add Service
                                </Button>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>

                    {/* Selected Tasks Table */}
                    {selectedTaskIds.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          Selected Tasks ({selectedTaskIds.length})
                        </Typography>
                        <TableContainer
                          component={Paper}
                          variant="outlined"
                          sx={{ mb: 2 }}
                        >
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Service</TableCell>
                                <TableCell>Service Code</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedTaskIds.map((task, index) => (
                                <TableRow key={task.taskId}>
                                  <TableCell>{task.serviceName}</TableCell>
                                  <TableCell>{task.serviceCode}</TableCell>
                                  <TableCell align="right">
                                    ₹{task.amount.toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => {
                                        setSelectedTaskIds((prev) =>
                                          prev.filter((_, i) => i !== index)
                                        );
                                      }}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}

                    {/* Custom Services Table */}
                    {formData.services.length > 0 && (
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          Custom Services ({formData.services.length})
                        </Typography>
                        <TableContainer
                          component={Paper}
                          variant="outlined"
                          sx={{ mb: 2 }}
                        >
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Service</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {formData.services.map((service, index) => (
                                <TableRow key={service.id || index}>
                                  <TableCell>
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
                                    {service.isPeriodBilling && (
                                      <Chip
                                        label="Period Billing"
                                        size="small"
                                        color="secondary"
                                        sx={{ mt: 0.5 }}
                                      />
                                    )}
                                    {service.serviceFrequency && (
                                      <Chip
                                        label={service.serviceFrequency}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ mt: 0.5, ml: 1 }}
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {service.isPeriodBilling
                                      ? "Period"
                                      : SERVICE_TYPES.find(
                                          (t) => t.value === service.serviceType
                                        )?.label || service.serviceType}
                                  </TableCell>
                                  <TableCell align="right">
                                    ₹{service.amount.toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => removeService(index)}
                                      disabled={service.isPeriodBilling}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}

                    {selectedTaskIds.length === 0 &&
                      formData.services.length === 0 && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          No services or tasks selected yet. Add custom services
                          or select tasks from client history.
                        </Alert>
                      )}
                  </CardContent>
                </Card>

                {/* Notes Section */}
                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Info sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="h6" color="primary.main">
                        Notes
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Internal Notes"
                          value={formData.notes}
                          onChange={(e) =>
                            handleFormChange("notes", e.target.value)
                          }
                          multiline
                          rows={3}
                          size="small"
                          placeholder="These notes are visible only to you"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Customer Notes"
                          value={formData.customerNotes}
                          onChange={(e) =>
                            handleFormChange("customerNotes", e.target.value)
                          }
                          multiline
                          rows={3}
                          size="small"
                          placeholder="These notes will be visible on the invoice"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Right Panel - Summary */}
              <Grid item xs={12} md={4}>
                <Box sx={{ position: "sticky", top: 20 }}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      backgroundImage: theme.gradients.primary,
                      color: "white",
                      mb: 3,
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 3 }}>
                        Invoice Summary
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography>Subtotal:</Typography>
                        <Typography>₹{totalAmount.toLocaleString()}</Typography>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography>GST (18%):</Typography>
                        <Typography>₹{gstAmount.toLocaleString()}</Typography>
                      </Box>

                      <Divider
                        sx={{ my: 2, borderColor: "rgba(255,255,255,0.2)" }}
                      />

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="h6">Total:</Typography>
                        <Typography variant="h6">
                          ₹{grandTotal.toLocaleString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>

                  <Card
                    sx={{
                      borderRadius: 2,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      mb: 3,
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Statistics
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 1.5, textAlign: "center" }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Regular Tasks
                            </Typography>
                            <Typography variant="h6">
                              {selectedTaskIds.length}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 1.5, textAlign: "center" }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Custom Services
                            </Typography>
                            <Typography variant="h6">
                              {
                                formData.services.filter(
                                  (s) => !s.isPeriodBilling
                                ).length
                              }
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 1.5, textAlign: "center" }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Period Billings
                            </Typography>
                            <Typography variant="h6">
                              {
                                formData.services.filter(
                                  (s) => s.isPeriodBilling
                                ).length
                              }
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 1.5, textAlign: "center" }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Total Line Items
                            </Typography>
                            <Typography variant="h6">
                              {selectedTaskIds.length +
                                formData.services.length}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={
                      loading ? <CircularProgress size={20} /> : <Send />
                    }
                    sx={{ mb: 2, py: 1.5, borderRadius: 2 }}
                  >
                    {loading ? "Creating Invoice..." : "Create Invoice"}
                  </Button>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    align="center"
                    sx={{ display: "block" }}
                  >
                    Press Ctrl+Enter to create invoice quickly
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>
    </LocalizationProvider>
  );
};

export default NewInvoicePage;
