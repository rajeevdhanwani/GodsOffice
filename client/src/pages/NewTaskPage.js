import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useNavigate } from "react-router-dom";
import ClientSearchBar from "../components/ClientSearchBar";
import { format, isValid } from "date-fns";
import { styled } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/NewTaskPage.css";

// Styled components
const ProfessionalCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: "rgba(255, 255, 255, 0.98)",
  backdropFilter: "blur(20px)",
  border: `1px solid ${theme.palette.divider}`,
  transition: theme.transitions.create(["transform", "box-shadow"]),
  boxShadow: theme.shadows[3],
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: theme.shadows[5],
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  fontWeight: 600,
  textTransform: "none",
  padding: "12px 24px",
  transition: theme.transitions.create(["transform", "box-shadow"]),
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

const GradientChip = styled(Chip)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
  color: theme.palette.common.white,
  fontWeight: 500,
  borderRadius: 20,
  transition: theme.transitions.create(["transform", "box-shadow"]),
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: `0 4px 12px ${theme.palette.primary.light}`,
  },
}));

const WideAutocomplete = styled(Autocomplete)(({ theme }) => ({
  minWidth: 300,
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.95)",
    padding: "8px 12px",
    transition: theme.transitions.create([
      "background",
      "transform",
      "box-shadow",
    ]),
    "&:hover": {
      background: "rgba(255, 255, 255, 1)",
      transform: "translateY(-1px)",
      boxShadow: theme.shadows[2],
    },
    "&.Mui-focused": {
      background: "white",
      boxShadow: `0 4px 12px ${theme.palette.primary.light}`,
    },
  },
  "& .MuiAutocomplete-input": {
    padding: "8px 4px !important",
    minHeight: "24px",
  },
}));

const NewTaskPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [addedServices, setAddedServices] = useState([]);
  const [newService, setNewService] = useState({
    serviceCode: "",
    teamMemberId: "",
    startDate: new Date(),
    assignmentDates: [],
    dueDate: null,
    priority: "Medium",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [taskGenerationErrors, setTaskGenerationErrors] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Quick stats
  const [quickStats, setQuickStats] = useState({
    totalClients: 0,
    totalServices: 0,
    totalTeamMembers: 0,
    addedServices: 0,
  });

  // Clear errors after 5 seconds
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const timer = setTimeout(() => {
        setErrors({});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errors]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "n":
            event.preventDefault();
            if (
              newService.serviceCode &&
              newService.teamMemberId &&
              newService.startDate &&
              isValid(newService.startDate)
            ) {
              handleAddService();
            }
            break;
          case "g":
            event.preventDefault();
            if (selectedClient && addedServices.length > 0) {
              handleGenerateTasks();
            }
            break;
          case "r":
            event.preventDefault();
            handleReset();
            break;
          case "h":
            event.preventDefault();
            navigate("/");
            break;
          case "m":
            event.preventDefault();
            navigate("/tasks/master");
            break;
          case "t":
            event.preventDefault();
            navigate("/tasks");
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [newService, selectedClient, addedServices, navigate]);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setErrors({ server: "Please log in to access this page" });
          navigate("/login");
          return;
        }

        const authHeaders = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [clientsRes, servicesRes, teamRes] = await Promise.all([
          fetch("http://localhost:5000/api/clients", { headers: authHeaders }),
          fetch("http://localhost:5000/api/tasks/services", {
            headers: authHeaders,
          }),
          fetch("http://localhost:5000/api/teams", { headers: authHeaders }),
        ]);

        if (!clientsRes.ok) {
          const clientsData = await clientsRes.json();
          throw new Error(clientsData.message || "Failed to fetch clients");
        }
        if (!servicesRes.ok) {
          const servicesData = await servicesRes.json();
          throw new Error(servicesData.message || "Failed to fetch services");
        }
        if (!teamRes.ok) {
          const teamData = await teamRes.json();
          throw new Error(teamData.message || "Failed to fetch teams");
        }

        const [clientsData, servicesData, teamData] = await Promise.all([
          clientsRes.json(),
          servicesRes.json(),
          teamRes.json(),
        ]);

        setClients(clientsData);
        setServices(servicesData);
        setTeamMembers(teamData.data || teamData);
        setQuickStats({
          totalClients: clientsData.length || 0,
          totalServices: servicesData.length || 0,
          totalTeamMembers: teamData.length || 0,
          addedServices: addedServices.length,
        });
        setErrors({});
      } catch (err) {
        setErrors({ message: err.message || "Failed to load data" });
        console.error("Error fetching data:", err);
        if (
          err.message.includes("Invalid token") ||
          err.message.includes("expired")
        ) {
          localStorage.removeItem("token");
          setErrors({
            server: "Your session has expired. Please log in again.",
          });
          navigate("/login");
        }
      }
    };
    fetchData();
  }, [navigate]);

  // Update quick stats when addedServices changes
  useEffect(() => {
    setQuickStats((prev) => ({
      ...prev,
      addedServices: addedServices.length,
    }));
  }, [addedServices]);

  // Handle client selection
  const handleClientSelect = async (client) => {
    setSelectedClient(client);
    setNewService({
      serviceCode: "",
      teamMemberId: "",
      startDate: new Date(),
      assignmentDates: [],
      dueDate: null,
      priority: "Medium",
    });
    setAddedServices([]);
    setPortfolio([]);
    setErrors({});
    setSuccess("");
    setTaskGenerationErrors([]);
    setActiveStep(client ? 1 : 0);

    if (client) {
      setPortfolioLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `http://localhost:5000/api/tasks/clientservices?clientCode=${client.clientCode}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (!res.ok) {
          console.warn("Portfolio fetch failed:", data.message);
          setPortfolio([]);
        } else {
          const updatedPortfolio = data.map((entry) => ({
            ...entry,
            addDate: entry.createdAt || new Date(),
          }));
          setPortfolio(updatedPortfolio);
        }
      } catch (err) {
        console.warn("Error fetching portfolio:", err.message);
        setPortfolio([]);
      } finally {
        setPortfolioLoading(false);
      }
    } else {
      setPortfolio([]);
      setActiveStep(0);
    }
  };

  // Add service to the list
  const handleAddService = () => {
    if (
      !newService.serviceCode ||
      !newService.teamMemberId ||
      !newService.startDate ||
      !isValid(newService.startDate)
    ) {
      setErrors({
        message: "Please select a valid service, team member, and start date",
      });
      return;
    }

    const selectedService = services.find(
      (s) => s.serviceCode === newService.serviceCode
    );
    const selectedTeamMember = teamMembers.find(
      (t) => t.teamMemberId === newService.teamMemberId
    );

    if (!selectedService || !selectedTeamMember) {
      setErrors({ message: "Invalid service or team member selection" });
      return;
    }

    const currentFYStartYear =
      new Date().getMonth() < 3
        ? new Date().getFullYear() - 1
        : new Date().getFullYear();
    const startFYYear = getFinancialYear(newService.startDate)
      .split("-")[0]
      .replace("FY ", "");
    const startFYYearInt = parseInt(startFYYear);

    if (isNaN(startFYYearInt) || startFYYearInt < currentFYStartYear - 1) {
      setErrors({
        message: `Start date must be in FY ${currentFYStartYear - 1}-${(
          currentFYStartYear % 100
        )
          .toString()
          .padStart(2, "0")} or later`,
      });
      return;
    }
    if (
      (selectedService.frequency === "Weekly" ||
        selectedService.frequency === "On Demand") &&
      startFYYearInt < currentFYStartYear
    ) {
      setErrors({
        message: `${
          selectedService.frequency
        } services must start in FY ${currentFYStartYear}-${(
          (currentFYStartYear + 1) %
          100
        )
          .toString()
          .padStart(2, "0")} or later`,
      });
      return;
    }

    if (selectedService.frequency !== "On Demand") {
      if (
        portfolio.some(
          (p) =>
            p.serviceCode === newService.serviceCode &&
            p.financialYear === getFinancialYear(newService.startDate)
        ) ||
        addedServices.some(
          (s) =>
            s.serviceCode === newService.serviceCode &&
            getFinancialYear(s.startDate) ===
              getFinancialYear(newService.startDate)
        )
      ) {
        setErrors({
          message: "Service already in client portfolio for this FY",
        });
        return;
      }
    }

    const serviceToAdd = {
      id: Date.now(),
      serviceCode: selectedService.serviceCode,
      serviceName: selectedService.serviceName,
      teamMemberId: selectedTeamMember.teamMemberId,
      teamMemberName: selectedTeamMember.name,
      startDate: newService.startDate,
      assignmentDates: selectedService.assignmentDates,
      dueDate: selectedService.dueDate,
      frequency: selectedService.frequency,
      priority: selectedService.priority || "Medium",
    };

    setAddedServices([...addedServices, serviceToAdd]);
    setNewService({
      serviceCode: "",
      teamMemberId: "",
      startDate: new Date(),
      assignmentDates: [],
      dueDate: null,
      priority: "Medium",
    });
    setErrors({});
    setActiveStep(2);
    setSuccess("Service added successfully!");
  };

  // Remove service from the list
  const handleRemoveService = (serviceId) => {
    setAddedServices(addedServices.filter((s) => s.id !== serviceId));
    if (addedServices.length <= 1) {
      setActiveStep(1);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedClient(null);
    setAddedServices([]);
    setNewService({
      serviceCode: "",
      teamMemberId: "",
      startDate: new Date(),
      assignmentDates: [],
      dueDate: null,
      priority: "Medium",
    });
    setPortfolio([]);
    setErrors({});
    setSuccess("");
    setTaskGenerationErrors([]);
    setActiveStep(0);
    setGenerationProgress(0);
  };

  // Get financial year function
  const getFinancialYear = (date) => {
    if (!date || !isValid(date)) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      if (month < 3) {
        return `FY ${year - 1}-${(year % 100).toString().padStart(2, "0")}`;
      }
      return `FY ${year}-${((year + 1) % 100).toString().padStart(2, "0")}`;
    }
    const year = date.getFullYear();
    const month = date.getMonth();
    if (month < 3) {
      return `FY ${year - 1}-${(year % 100).toString().padStart(2, "0")}`;
    }
    return `FY ${year}-${((year + 1) % 100).toString().padStart(2, "0")}`;
  };

  // Generate tasks and update ClientService
  const handleGenerateTasks = async () => {
    if (!selectedClient || addedServices.length === 0) {
      setErrors({
        message: "Please select a client and add at least one service",
      });
      return;
    }

    setLoading(true);
    setGenerationProgress(0);
    const token = localStorage.getItem("token");

    try {
      const results = [];
      const taskErrors = [];

      for (let i = 0; i < addedServices.length; i++) {
        const service = addedServices[i];
        if (!service.startDate || !isValid(service.startDate)) {
          taskErrors.push({
            message: `Invalid start date for service ${service.serviceCode}`,
            serviceCode: service.serviceCode,
          });
          continue;
        }
        setGenerationProgress(((i + 1) / addedServices.length) * 100);

        const payload = {
          clientCode: selectedClient.clientCode,
          serviceCode: service.serviceCode,
          teamMemberId: service.teamMemberId,
          startDate: service.startDate.toISOString(),
          financialYear: getFinancialYear(service.startDate),
        };

        console.log("Task generation payload:", payload);

        const res = await fetch(
          "http://localhost:5000/api/tasks/generate-new",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();
        if (res.ok) {
          results.push(...(data.tasks || []));
          // Create ClientService entry
          const clientServicePayload = {
            clientCode: selectedClient.clientCode,
            serviceCode: service.serviceCode,
            teamMemberId: service.teamMemberId,
            startDate: service.startDate.toISOString(),
            financialYear: getFinancialYear(service.startDate),
          };
          const clientServiceRes = await fetch(
            "http://localhost:5000/api/tasks/clientservices",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(clientServicePayload),
            }
          );
          if (!clientServiceRes.ok) {
            const clientServiceData = await clientServiceRes.json();
            taskErrors.push({
              message: `Failed to add ClientService for ${service.serviceCode}: ${clientServiceData.message}`,
              serviceCode: service.serviceCode,
            });
          }
          if (data.message.includes("approval")) {
            setSuccess(data.message);
          } else {
            setSuccess(
              `Generated ${
                data.tasksCreated || results.length
              } task(s) successfully`
            );
          }
        } else {
          taskErrors.push(...(data.errors || [{ message: data.message }]));
        }
      }

      setTaskGenerationErrors(taskErrors);
      if (taskErrors.length > 0) {
        setErrors({
          message: "Some tasks failed to generate. See details below.",
        });
      } else if (!success.includes("approval")) {
        setSuccess("Tasks generated successfully!");
        setActiveStep(3);
      }

      // Refresh portfolio
      const portfolioRes = await fetch(
        `http://localhost:5000/api/tasks/clientservices?clientCode=${selectedClient.clientCode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const portfolioData = await portfolioRes.json();
      if (portfolioRes.ok) {
        const updatedPortfolio = portfolioData.map((entry) => ({
          ...entry,
          addDate: entry.createdAt || new Date(),
        }));
        setPortfolio(updatedPortfolio);
      } else {
        console.warn("Portfolio refresh failed:", portfolioData.message);
        setPortfolio([]);
      }

      // Reset form on success
      if (taskErrors.length === 0) {
        setTimeout(() => {
          setAddedServices([]);
          setActiveStep(2);
        }, 2000);
      }
    } catch (err) {
      setErrors({ message: err.message || "Server error" });
      console.error("Error submitting tasks:", err);
    } finally {
      setLoading(false);
      setGenerationProgress(0);
    }
  };

  // Prefill startDate, assignmentDates, dueDate, and priority based on service selection
  const handleServiceChange = (newValue) => {
    const selectedService = newValue
      ? services.find((s) => s.serviceCode === newValue.serviceCode)
      : null;
    setNewService({
      ...newService,
      serviceCode: newValue ? newValue.serviceCode : "",
      startDate: new Date(),
      assignmentDates: selectedService ? selectedService.assignmentDates : [],
      dueDate: selectedService ? selectedService.dueDate : null,
      priority: selectedService
        ? selectedService.priority || "Medium"
        : "Medium",
    });
  };

  // Progress tracker calculations
  const configurationProgress = selectedClient ? 100 : 0;
  const servicesProgress = addedServices.length > 0 ? 100 : 0;
  const readyToGenerateProgress =
    selectedClient && addedServices.length > 0 ? 100 : 0;

  const steps = [
    "Select Client",
    "Review Portfolio & Add Services",
    "Review Services",
    "Generate Tasks",
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="new-task-container"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          minHeight: "100vh",
          paddingBottom: "40px",
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  background: "linear-gradient(45deg, #ffffff, #e3f2fd)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                🆕 Create New Tasks
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: "rgba(255, 255, 255, 0.9)" }}
              >
                Follow the steps below to create multiple tasks for your clients
              </Typography>
            </Box>

            {/* Progress Stepper */}
            <ProfessionalCard sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stepper activeStep={activeStep} orientation="horizontal">
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel
                        sx={{
                          "& .MuiStepLabel-label": {
                            fontWeight: 600,
                            color:
                              activeStep === steps.indexOf(label)
                                ? "#1976d2"
                                : "text.secondary",
                          },
                          "& .MuiStepIcon-root": {
                            color:
                              activeStep === steps.indexOf(label)
                                ? "#1976d2"
                                : "rgba(0, 0, 0, 0.38)",
                            "&.Mui-completed": {
                              color: "#4caf50",
                            },
                          },
                        }}
                      >
                        {label}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </ProfessionalCard>

            {/* Error Display */}
            <AnimatePresence>
              {errors.message && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {errors.message}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Display */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Alert
                    severity="success"
                    sx={{ mb: 3, borderRadius: 2 }}
                    icon={<CheckCircleIcon />}
                  >
                    {success}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Task Generation Errors */}
            <AnimatePresence>
              {taskGenerationErrors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Some tasks could not be created:
                    </Typography>
                    {taskGenerationErrors.map((error, index) => (
                      <Typography key={index} variant="body2">
                        • {error.message || error}
                      </Typography>
                    ))}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress Bar for Task Generation */}
            {loading && (
              <ProfessionalCard sx={{ mb: 3 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <CircularProgress size={24} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" gutterBottom>
                        Creating tasks... {Math.round(generationProgress)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={generationProgress}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          "& .MuiLinearProgress-bar": {
                            background:
                              "linear-gradient(45deg, #4CAF50, #66BB6A)",
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </ProfessionalCard>
            )}

            <Grid container spacing={3}>
              {/* Main Content */}
              <Grid item xs={12} lg={8}>
                {/* Step 1: Client Selection */}
                <ProfessionalCard sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                      <BusinessIcon
                        sx={{ mr: 2, color: "primary.main", fontSize: 28 }}
                      />
                      <Typography variant="h5" fontWeight="bold">
                        Step 1: Select Client
                      </Typography>
                    </Box>
                    <ClientSearchBar
                      clients={clients}
                      onSelect={handleClientSelect}
                      value={selectedClient}
                      sx={{
                        width: "100%",
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          fontSize: "1.1rem",
                          height: "56px",
                        },
                      }}
                    />
                    {selectedClient && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Box
                          sx={{
                            mt: 3,
                            p: 3,
                            background:
                              "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                            borderRadius: 2,
                          }}
                        >
                          <GradientChip
                            label={`${selectedClient.clientCode} - ${selectedClient.clientName}`}
                            onDelete={() => handleClientSelect(null)}
                            sx={{ fontSize: "1rem", height: "40px", mb: 1 }}
                          />
                          {selectedClient.firmName && (
                            <Typography
                              variant="body1"
                              sx={{ color: "text.secondary", fontWeight: 500 }}
                            >
                              <BusinessIcon sx={{ mr: 1, fontSize: 16 }} />
                              Firm: {selectedClient.firmName}
                            </Typography>
                          )}
                        </Box>
                      </motion.div>
                    )}
                  </CardContent>
                </ProfessionalCard>

                {/* Step 2: Portfolio & Add Services */}
                {selectedClient && (
                  <>
                    {/* Client Portfolio */}
                    <ProfessionalCard sx={{ mb: 3 }}>
                      <CardContent sx={{ p: 4 }}>
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6" fontWeight="bold">
                              📊 Current Client Portfolio ({portfolio.length}{" "}
                              services)
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            {portfolioLoading ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  p: 4,
                                }}
                              >
                                <CircularProgress size={24} />
                                <Typography variant="body2" sx={{ ml: 2 }}>
                                  Loading portfolio...
                                </Typography>
                              </Box>
                            ) : portfolio.length > 0 ? (
                              <TableContainer
                                sx={{
                                  borderRadius: 2,
                                  border: "1px solid #e0e0e0",
                                }}
                              >
                                <Table size="small">
                                  <TableHead sx={{ background: "#f5f5f5" }}>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Service Code
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Service Name
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Team Member
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Start Date
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Financial Year
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {portfolio.map((item, index) => (
                                      <TableRow key={index} hover>
                                        <TableCell>
                                          {item.serviceCode}
                                        </TableCell>
                                        <TableCell>
                                          {item.serviceName ||
                                            services.find(
                                              (s) =>
                                                s.serviceCode ===
                                                item.serviceCode
                                            )?.serviceName}
                                        </TableCell>
                                        <TableCell>
                                          {teamMembers.find(
                                            (t) =>
                                              t.teamMemberId ===
                                              item.teamMemberId
                                          )?.name || item.teamMemberId}
                                        </TableCell>
                                        <TableCell>
                                          {item.startDate &&
                                          isValid(new Date(item.startDate))
                                            ? format(
                                                new Date(item.startDate),
                                                "dd-MMM-yyyy"
                                              )
                                            : "Invalid Date"}
                                        </TableCell>
                                        <TableCell>
                                          {item.financialYear}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            ) : (
                              <Box
                                sx={{
                                  textAlign: "center",
                                  p: 4,
                                  color: "text.secondary",
                                }}
                              >
                                <Typography variant="body1">
                                  No existing services found for this client.
                                </Typography>
                              </Box>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      </CardContent>
                    </ProfessionalCard>

                    {/* Add Services */}
                    <ProfessionalCard sx={{ mb: 3 }}>
                      <CardContent sx={{ p: 4 }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 3 }}
                        >
                          <AddIcon
                            sx={{ mr: 2, color: "success.main", fontSize: 28 }}
                          />
                          <Typography variant="h5" fontWeight="bold">
                            Step 2: Add Services
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          Note: For Weekly services, tasks will be generated for
                          each assignment date (e.g., 1st, 8th, 15th).
                        </Typography>
                        <Grid container spacing={3} alignItems="center">
                          <Grid item xs={12} md={4}>
                            <WideAutocomplete
                              options={services}
                              getOptionLabel={(option) =>
                                `${option.serviceCode} - ${option.serviceName}`
                              }
                              value={
                                services.find(
                                  (s) =>
                                    s.serviceCode === newService.serviceCode
                                ) || null
                              }
                              onChange={(event, newValue) =>
                                handleServiceChange(newValue)
                              }
                              renderOption={(props, option) => {
                                const { key, ...otherProps } = props;
                                return (
                                  <Box
                                    key={key}
                                    component="li"
                                    {...otherProps}
                                    sx={{ p: 2 }}
                                  >
                                    <Box sx={{ width: "100%" }}>
                                      <Typography
                                        variant="body1"
                                        fontWeight={600}
                                      >
                                        {option.serviceCode} -{" "}
                                        {option.serviceName}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        Assignment:{" "}
                                        {option.assignmentDates.join(", ")}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        Due: {option.dueDate || "Not specified"}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        Priority: {option.priority || "Medium"}
                                      </Typography>
                                    </Box>
                                  </Box>
                                );
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Service"
                                  variant="outlined"
                                  fullWidth
                                  placeholder="Search services..."
                                  sx={{ fontSize: "1rem" }}
                                  error={!!errors.message}
                                  helperText={
                                    errors.message &&
                                    errors.message.includes("service")
                                      ? errors.message
                                      : ""
                                  }
                                />
                              )}
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <WideAutocomplete
                              options={teamMembers}
                              getOptionLabel={(option) =>
                                `${option.name} (${option.teamMemberId})`
                              }
                              value={
                                teamMembers.find(
                                  (t) =>
                                    t.teamMemberId === newService.teamMemberId
                                ) || null
                              }
                              onChange={(event, newValue) => {
                                setNewService({
                                  ...newService,
                                  teamMemberId: newValue
                                    ? newValue.teamMemberId
                                    : "",
                                });
                              }}
                              renderOption={(props, option) => {
                                const { key, ...otherProps } = props;
                                return (
                                  <Box
                                    key={key}
                                    component="li"
                                    {...otherProps}
                                    sx={{ p: 2 }}
                                  >
                                    <Box sx={{ width: "100%" }}>
                                      <Typography
                                        variant="body1"
                                        fontWeight={600}
                                      >
                                        {option.name}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        ID: {option.teamMemberId}
                                      </Typography>
                                    </Box>
                                  </Box>
                                );
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Team Member"
                                  variant="outlined"
                                  fullWidth
                                  placeholder="Search team members..."
                                  sx={{ fontSize: "1rem" }}
                                  error={!!errors.message}
                                  helperText={
                                    errors.message &&
                                    errors.message.includes("team member")
                                      ? errors.message
                                      : ""
                                  }
                                />
                              )}
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <Tooltip title="Select the start date for the service. Tasks will be generated from this date based on service frequency and settings.">
                              <Box>
                                <DatePicker
                                  label="Start Date"
                                  value={newService.startDate}
                                  onChange={(date) =>
                                    setNewService({
                                      ...newService,
                                      startDate:
                                        date && isValid(date)
                                          ? date
                                          : new Date(),
                                    })
                                  }
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      fullWidth
                                      sx={{
                                        "& .MuiOutlinedInput-root": {
                                          borderRadius: 2,
                                          fontSize: "1rem",
                                        },
                                      }}
                                      error={!!errors.message}
                                      helperText={
                                        errors.message &&
                                        errors.message.includes("start date")
                                          ? errors.message
                                          : ""
                                      }
                                    />
                                  )}
                                  minDate={
                                    new Date(new Date().getFullYear() - 1, 3, 1)
                                  }
                                  maxDate={
                                    new Date(
                                      new Date().getFullYear() + 1,
                                      2,
                                      31
                                    )
                                  }
                                />
                              </Box>
                            </Tooltip>
                          </Grid>
                          <Grid item xs={12} md={2}>
                            <StyledButton
                              variant="contained"
                              onClick={handleAddService}
                              startIcon={<AddIcon />}
                              fullWidth
                              size="large"
                              sx={{
                                background:
                                  "linear-gradient(45deg, #4caf50, #66bb6a)",
                                color: "white",
                                fontWeight: "bold",
                                height: "56px",
                                "&:hover": {
                                  background:
                                    "linear-gradient(45deg, #388e3c, #4caf50)",
                                  transform: "translateY(-1px)",
                                  boxShadow:
                                    "0 4px 12px rgba(76, 175, 80, 0.3)",
                                },
                              }}
                            >
                              Add (Ctrl+N)
                            </StyledButton>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </ProfessionalCard>
                  </>
                )}

                {/* Step 3: Added Services List */}
                {addedServices.length > 0 && (
                  <ProfessionalCard sx={{ mb: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 3 }}
                      >
                        <CheckCircleIcon
                          sx={{ mr: 2, color: "info.main", fontSize: 28 }}
                        />
                        <Typography variant="h5" fontWeight="bold">
                          Step 3: Services to be Created ({addedServices.length}
                          )
                        </Typography>
                      </Box>
                      <TableContainer
                        sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}
                      >
                        <Table>
                          <TableHead
                            sx={{
                              background:
                                "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)",
                            }}
                          >
                            <TableRow>
                              <TableCell
                                sx={{ fontWeight: "bold", fontSize: "1rem" }}
                              >
                                Service Code
                              </TableCell>
                              <TableCell
                                sx={{ fontWeight: "bold", fontSize: "1rem" }}
                              >
                                Service Name
                              </TableCell>
                              <TableCell
                                sx={{ fontWeight: "bold", fontSize: "1rem" }}
                              >
                                Team Member
                              </TableCell>
                              <TableCell
                                sx={{ fontWeight: "bold", fontSize: "1rem" }}
                              >
                                Start Date
                              </TableCell>
                              <TableCell
                                sx={{ fontWeight: "bold", fontSize: "1rem" }}
                              >
                                Assignment Dates
                              </TableCell>
                              <TableCell
                                sx={{ fontWeight: "bold", fontSize: "1rem" }}
                              >
                                Due Date
                              </TableCell>
                              <TableCell
                                sx={{ fontWeight: "bold", fontSize: "1rem" }}
                              >
                                Priority
                              </TableCell>
                              <TableCell
                                sx={{ fontWeight: "bold", fontSize: "1rem" }}
                              >
                                Financial Year
                              </TableCell>
                              <TableCell
                                sx={{ fontWeight: "bold", fontSize: "1rem" }}
                              >
                                Frequency
                              </TableCell>
                              <TableCell
                                sx={{ fontWeight: "bold", fontSize: "1rem" }}
                              >
                                Action
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {addedServices.map((service) => (
                              <TableRow key={service.id} hover>
                                <TableCell sx={{ fontSize: "0.95rem" }}>
                                  {service.serviceCode}
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.95rem" }}>
                                  {service.serviceName}
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.95rem" }}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <PersonIcon
                                      sx={{
                                        mr: 1,
                                        fontSize: 16,
                                        color: "text.secondary",
                                      }}
                                    />
                                    {service.teamMemberName}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.95rem" }}>
                                  {service.startDate &&
                                  isValid(service.startDate)
                                    ? format(service.startDate, "dd-MMM-yyyy")
                                    : "Invalid Date"}
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.95rem" }}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <ScheduleIcon
                                      sx={{
                                        mr: 1,
                                        fontSize: 16,
                                        color: "text.secondary",
                                      }}
                                    />
                                    {service.assignmentDates.join(", ")}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.95rem" }}>
                                  {service.dueDate || "Not specified"}
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.95rem" }}>
                                  <GradientChip
                                    label={service.priority}
                                    size="small"
                                    sx={{ fontWeight: "bold" }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.95rem" }}>
                                  {service.startDate &&
                                  isValid(service.startDate)
                                    ? getFinancialYear(service.startDate)
                                    : "Invalid FY"}
                                </TableCell>
                                <TableCell>
                                  <GradientChip
                                    label={service.frequency || "Monthly"}
                                    size="small"
                                    sx={{ fontWeight: "bold" }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <IconButton
                                    onClick={() =>
                                      handleRemoveService(service.id)
                                    }
                                    color="error"
                                    size="small"
                                    sx={{
                                      "&:hover": {
                                        background: "rgba(244, 67, 54, 0.1)",
                                        transform: "scale(1.1)",
                                      },
                                    }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </ProfessionalCard>
                )}
              </Grid>

              {/* Right Sidebar - Summary, Quick Stats, Progress Tracker */}
              <Grid item xs={12} lg={4}>
                <ProfessionalCard
                  sx={{
                    position: "sticky",
                    top: 20,
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      📋 Task Summary
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Selected Client
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedClient
                          ? `${selectedClient.clientCode} - ${selectedClient.clientName}`
                          : "None"}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Services to Create
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{ color: "#1976d2" }}
                        fontWeight="bold"
                      >
                        {addedServices.length}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Portfolio Services
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {portfolio.length} existing
                      </Typography>
                    </Box>

                    {/* Quick Stats */}
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ mt: 3 }}
                    >
                      📈 Quick Stats
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box
                          sx={{
                            textAlign: "center",
                            p: 2,
                            background: "rgba(33, 150, 243, 0.1)",
                            borderRadius: 2,
                          }}
                        >
                          <BusinessIcon
                            sx={{ fontSize: 32, color: "#1976d2", mb: 1 }}
                          />
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            sx={{ color: "#1976d2" }}
                          >
                            {quickStats.totalClients}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Clients
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box
                          sx={{
                            textAlign: "center",
                            p: 2,
                            background: "rgba(76, 175, 80, 0.1)",
                            borderRadius: 2,
                          }}
                        >
                          <AssignmentIcon
                            sx={{ fontSize: 32, color: "#4caf50", mb: 1 }}
                          />
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            sx={{ color: "#4caf50" }}
                          >
                            {quickStats.totalServices}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Services
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box
                          sx={{
                            textAlign: "center",
                            p: 2,
                            background: "rgba(255, 152, 0, 0.1)",
                            borderRadius: 2,
                          }}
                        >
                          <GroupIcon
                            sx={{ fontSize: 32, color: "#ff9800", mb: 1 }}
                          />
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            sx={{ color: "#ff9800" }}
                          >
                            {quickStats.totalTeamMembers}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Team Members
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box
                          sx={{
                            textAlign: "center",
                            p: 2,
                            background: "rgba(156, 39, 176, 0.1)",
                            borderRadius: 2,
                          }}
                        >
                          <TrendingUpIcon
                            sx={{ fontSize: 32, color: "#9c27b0", mb: 1 }}
                          />
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            sx={{ color: "#9c27b0" }}
                          >
                            {quickStats.addedServices}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Added Services
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Progress Tracker */}
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ mt: 3 }}
                    >
                      🎯 Progress Tracker
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2">Configuration</Typography>
                        <Typography variant="body2" sx={{ color: "#1976d2" }}>
                          {configurationProgress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={configurationProgress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          "& .MuiLinearProgress-bar": {
                            background:
                              "linear-gradient(45deg, #2196F3, #21CBF3)",
                          },
                        }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2">Services Added</Typography>
                        <Typography variant="body2" sx={{ color: "#4caf50" }}>
                          {servicesProgress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={servicesProgress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          "& .MuiLinearProgress-bar": {
                            background:
                              "linear-gradient(45deg, #4CAF50, #66BB6A)",
                          },
                        }}
                      />
                    </Box>
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2">
                          Ready to Generate
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#ff9800" }}>
                          {readyToGenerateProgress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={readyToGenerateProgress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          "& .MuiLinearProgress-bar": {
                            background:
                              "linear-gradient(45deg, #FF9800, #FFB74D)",
                          },
                        }}
                      />
                    </Box>

                    {/* Tips & Shortcuts */}
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ mt: 3 }}
                    >
                      💡 Tips & Shortcuts
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1,
                          background: "rgba(33, 150, 243, 0.05)",
                          borderRadius: 1,
                        }}
                      >
                        <SpeedIcon
                          sx={{ color: "#1976d2", mr: 1, fontSize: 20 }}
                        />
                        <Typography variant="body2">
                          Use <strong>Ctrl+N</strong> to quickly add services
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1,
                          background: "rgba(76, 175, 80, 0.05)",
                          borderRadius: 1,
                        }}
                      >
                        <CheckCircleIcon
                          sx={{ color: "#4caf50", mr: 1, fontSize: 20 }}
                        />
                        <Typography variant="body2">
                          Press <strong>Ctrl+G</strong> to generate all tasks
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1,
                          background: "rgba(255, 152, 0, 0.05)",
                          borderRadius: 1,
                        }}
                      >
                        <RefreshIcon
                          sx={{ color: "#ff9800", mr: 1, fontSize: 20 }}
                        />
                        <Typography variant="body2">
                          Use <strong>Ctrl+R</strong> to reset the form
                        </Typography>
                      </Box>
                    </Box>

                    {/* Generate Tasks Button */}
                    {selectedClient && addedServices.length > 0 && (
                      <Box sx={{ mt: 3, mb: 2 }}>
                        <StyledButton
                          variant="contained"
                          onClick={handleGenerateTasks}
                          disabled={loading}
                          fullWidth
                          size="large"
                          sx={{
                            background:
                              "linear-gradient(45deg, #1976d2, #42a5f5)",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                            py: 1.5,
                            "&:hover": {
                              background:
                                "linear-gradient(45deg, #1565c0, #1976d2)",
                              transform: "translateY(-2px)",
                              boxShadow: "0 6px 20px rgba(25, 118, 210, 0.3)",
                            },
                          }}
                        >
                          {loading ? (
                            <>
                              <CircularProgress
                                size={24}
                                sx={{ mr: 2, color: "white" }}
                              />
                              Generating...
                            </>
                          ) : (
                            `Generate ${addedServices.length} Tasks (Ctrl+G)`
                          )}
                        </StyledButton>
                      </Box>
                    )}

                    <StyledButton
                      variant="outlined"
                      onClick={() => navigate("/tasks")}
                      size="large"
                      fullWidth
                      sx={{
                        borderColor: "#1976d2",
                        color: "#1976d2",
                        fontWeight: "bold",
                        "&:hover": {
                          background: "#1976d2",
                          color: "white",
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      Back to Task Management
                    </StyledButton>

                    <StyledButton
                      variant="outlined"
                      onClick={handleReset}
                      size="large"
                      fullWidth
                      sx={{
                        borderColor: "#f57c00",
                        color: "#f57c00",
                        fontWeight: "bold",
                        mt: 2,
                        "&:hover": {
                          background: "#f57c00",
                          color: "white",
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      Reset Form (Ctrl+R)
                    </StyledButton>
                  </CardContent>
                </ProfessionalCard>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </motion.div>
    </LocalizationProvider>
  );
};

export default NewTaskPage;
