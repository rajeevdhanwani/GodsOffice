import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Button,
  ButtonGroup,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  FilterList as FilterListIcon,
  AdminPanelSettings as AdminIcon,
  Approval as ApprovalIcon,
  History as HistoryIcon,
  Task as TaskIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, isValid } from "date-fns"; // FIXED: Added isValid import
import "../styles/TaskManagementPage.css";

// Styled components with improved color scheme
import { styled } from "@mui/material/styles";

const StyledSelect = styled(Select)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.95)",
    transition: "all 0.3s ease",
    "&:hover": {
      background: "rgba(255, 255, 255, 1)",
      transform: "translateY(-1px)",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    },
    "&.Mui-focused": {
      background: "white",
      boxShadow: "0 4px 12px rgba(33, 150, 243, 0.3)",
    },
  },
}));

const StyledMenuItem = styled(MenuItem)(() => ({
  borderRadius: 8,
  margin: "4px 8px",
  transition: "all 0.2s ease",
  "&:hover": {
    background:
      "linear-gradient(45deg, rgba(33, 150, 243, 0.1), rgba(30, 136, 229, 0.1))",
    transform: "translateX(4px)",
  },
  "&.Mui-selected": {
    background:
      "linear-gradient(45deg, rgba(33, 150, 243, 0.2), rgba(30, 136, 229, 0.1))",
    fontWeight: 600,
  },
}));

const ProfessionalCard = styled(Card)(() => ({
  borderRadius: 16,
  background: "rgba(255, 255, 255, 0.98)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.18)",
  },
}));

const StyledButton = styled(Button)(() => ({
  borderRadius: 12,
  fontWeight: 600,
  textTransform: "none",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
  },
}));

const FilterChip = styled(Chip)(() => ({
  background: "linear-gradient(45deg, #2196F3, #21CBF3)",
  color: "white",
  fontWeight: 500,
  transition: "all 0.2s ease",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 4px 12px rgba(33, 150, 243, 0.4)",
  },
}));

const TaskManagementPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    upcoming: 0,
    completed: 0,
    overdue: 0,
    pendingApproval: 0,
  });
  const [filters, setFilters] = useState({
    financialYear: "",
    clientCode: "",
    teamMemberId: "",
  });
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("pie");
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [pendingApprovalTasks, setPendingApprovalTasks] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedApprovalTask, setSelectedApprovalTask] = useState(null);

  // Enhanced keyboard shortcuts including admin approval
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "r":
            event.preventDefault();
            fetchData();
            break;
          case "n":
            event.preventDefault();
            navigate("/tasks/new");
            break;
          case "m":
            event.preventDefault();
            navigate("/tasks/master");
            break;
          case "h":
            event.preventDefault();
            navigate("/");
            break;
          case "a":
            event.preventDefault();
            if (isAdmin && pendingApprovalTasks.length > 0) {
              setSelectedTab(2);
            }
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate, isAdmin, pendingApprovalTasks.length]);

  // FIXED: Safe date formatting function
  const safeFormatDate = (date, formatString = "dd-MMM-yyyy HH:mm") => {
    if (!date) return "N/A";

    const dateObj = new Date(date);
    if (!isValid(dateObj)) return "Invalid Date";

    try {
      return format(dateObj, formatString);
    } catch (error) {
      console.warn("Date formatting error:", error);
      return "Invalid Date";
    }
  };

  // Enhanced data fetching with admin approval tasks
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to access this page");
        navigate("/login");
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Build query parameters for filtering
      const queryParams = new URLSearchParams();
      if (filters.financialYear)
        queryParams.append("financialYear", filters.financialYear);
      if (filters.clientCode)
        queryParams.append("clientCode", filters.clientCode);
      if (filters.teamMemberId)
        queryParams.append("teamMemberId", filters.teamMemberId);

      const [
        userResponse,
        statsResponse,
        clientsResponse,
        teamMembersResponse,
        pendingApprovalResponse,
      ] = await Promise.all([
        fetch("http://localhost:5000/api/auth/user", { headers: authHeaders }),
        fetch(
          `http://localhost:5000/api/tasks/analytics?${queryParams.toString()}`,
          { headers: authHeaders }
        ),
        fetch("http://localhost:5000/api/clients", { headers: authHeaders }),
        fetch("http://localhost:5000/api/tasks/teams", {
          headers: authHeaders,
        }),
        fetch("http://localhost:5000/api/tasks/pending-approval", {
          headers: authHeaders,
        }),
      ]);

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user data");
      }
      if (!statsResponse.ok) {
        const errorData = await statsResponse.json();
        throw new Error(errorData.message || "Failed to fetch statistics");
      }
      if (!clientsResponse.ok) {
        throw new Error("Failed to fetch clients");
      }
      if (!teamMembersResponse.ok) {
        throw new Error("Failed to fetch team members");
      }
      if (!pendingApprovalResponse.ok) {
        console.warn("Failed to fetch pending approval tasks");
      }

      const [
        userData,
        statsData,
        clientsData,
        teamMembersData,
        pendingApprovalData,
      ] = await Promise.all([
        userResponse.json(),
        statsResponse.json(),
        clientsResponse.json(),
        teamMembersResponse.json(),
        pendingApprovalResponse.ok ? pendingApprovalResponse.json() : [],
      ]);

      setIsAdmin(userData.isAdmin || false);

      // FIXED: Updated to use statsData.overdue instead of wrong field
      setStats({
        total: statsData.total || 0,
        pending: statsData.pending || 0,
        upcoming: statsData.upcoming || 0,
        completed: statsData.completed || 0,
        overdue: statsData.overdue || 0, // FIXED: Use overdue field from backend
        pendingApproval: Array.isArray(pendingApprovalData)
          ? pendingApprovalData.length
          : 0,
      });

      setClients(Array.isArray(clientsData) ? clientsData : []);
      setTeamMembers(Array.isArray(teamMembersData) ? teamMembersData : []);

      setPendingApprovalTasks(
        Array.isArray(pendingApprovalData) ? pendingApprovalData : []
      );

      // Trigger confetti for milestone achievements
      if (statsData.completed > 0 && statsData.completed % 10 === 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (err) {
      console.error("Fetch data error:", err);
      setError(err.message || "Failed to load data");
      if (
        err.message.includes("expired") ||
        err.message.includes("Invalid token")
      ) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Admin approval functions
  const handleApprovalAction = async (taskId, approve) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/tasks/approve/${taskId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ approve }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to process approval");
      }

      // Refresh data after approval action
      await fetchData();
      setApprovalDialogOpen(false);
      setSelectedApprovalTask(null);
    } catch (err) {
      console.error("Approval action error:", err);
      setError(err.message || "Failed to process approval");
    }
  };

  const handleApprovalDialogOpen = (task) => {
    setSelectedApprovalTask(task);
    setApprovalDialogOpen(true);
  };

  // Fetch data on component mount and filter changes
  useEffect(() => {
    fetchData();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      financialYear: "",
      clientCode: "",
      teamMemberId: "",
    });
  };

  // Chart data for task status visualization with improved colors
  const chartData = [
    { name: "Pending", value: stats.pending, color: "#FF9800" },
    { name: "Upcoming", value: stats.upcoming, color: "#4CAF50" },
    { name: "Completed", value: stats.completed, color: "#2196F3" },
    { name: "Overdue", value: stats.overdue, color: "#F44336" },
    {
      name: "Pending Approval",
      value: stats.pendingApproval,
      color: "#9C27B0",
    },
  ];

  // Tab panel component
  const TabPanel = ({ children, value, index, ...other }) => (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  // FIXED: Admin approval tasks table with safe date formatting
  const AdminApprovalTable = () => (
    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
      <Table>
        <TableHead
          sx={{ background: "linear-gradient(45deg, #9C27B0, #E91E63)" }}
        >
          <TableRow>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>
              Client
            </TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>
              Service
            </TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>
              Team Member
            </TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>
              Action Type
            </TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>
              User Remark
            </TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>
              Submitted
            </TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pendingApprovalTasks.map((task) => {
            const client = clients.find(
              (c) => c.clientCode === task.clientCode
            );
            const teamMember = teamMembers.find(
              (t) => t.teamMemberId === task.teamMemberId
            );

            return (
              <TableRow
                key={task._id}
                sx={{
                  "&:hover": {
                    backgroundColor: "rgba(156, 39, 176, 0.04)",
                    transform: "translateY(-1px)",
                    transition: "all 0.2s ease",
                  },
                }}
              >
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {task.clientCode}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {client?.clientName || "Unknown"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip title={task.serviceName}>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.serviceName}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={<TaskIcon />}
                    label={teamMember?.name || task.teamMemberId}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={
                      task.pendingAction === "delete"
                        ? "Deletion"
                        : task.pendingAction === "complete"
                        ? "Backdated Completion"
                        : task.pendingAction === "status_change"
                        ? "Status Change"
                        : "Unknown"
                    }
                    size="small"
                    color={
                      task.pendingAction === "delete"
                        ? "error"
                        : task.pendingAction === "complete"
                        ? "warning"
                        : "info"
                    }
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={task.userRemark || "No remark provided"}>
                    <Typography
                      variant="caption"
                      sx={{
                        maxWidth: 150,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                      }}
                    >
                      {task.userRemark || "No remark"}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {safeFormatDate(task.submittedAt || task.updatedAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title="Approve Task">
                      <IconButton
                        onClick={() => handleApprovalAction(task._id, true)}
                        color="success"
                        size="small"
                        sx={{
                          "&:hover": {
                            transform: "scale(1.1)",
                            backgroundColor: "rgba(76, 175, 80, 0.1)",
                          },
                        }}
                      >
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reject Task">
                      <IconButton
                        onClick={() => handleApprovalAction(task._id, false)}
                        color="error"
                        size="small"
                        sx={{
                          "&:hover": {
                            transform: "scale(1.1)",
                            backgroundColor: "rgba(244, 67, 54, 0.1)",
                          },
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                      <IconButton
                        onClick={() => handleApprovalDialogOpen(task)}
                        color="primary"
                        size="small"
                        sx={{
                          "&:hover": {
                            transform: "scale(1.1)",
                            backgroundColor: "rgba(33, 150, 243, 0.1)",
                          },
                        }}
                      >
                        <HistoryIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
          {pendingApprovalTasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No tasks pending approval
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Container
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <CircularProgress size={50} />
      </Container>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="task-management-container"
      sx={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
      }}
    >
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header with improved colors */}
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              background: "linear-gradient(45deg, #ffffff, #e3f2fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            📊 Task Management Dashboard
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 3 }}
          >
            Monitor, analyze, and manage all your tasks in one place
          </Typography>

          {/* Enhanced Navigation Buttons with better colors */}
          <ButtonGroup variant="contained" sx={{ mb: 3 }}>
            <Button
              component={Link}
              to="/"
              startIcon={<TrendingUpIcon />}
              sx={{
                background: "linear-gradient(45deg, #2196F3, #21CBF3)",
                "&:hover": {
                  background: "linear-gradient(45deg, #1976D2, #0288D1)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              Dashboard
            </Button>
            <Button
              component={Link}
              to="/tasks/new"
              startIcon={<TaskIcon />}
              sx={{
                background: "linear-gradient(45deg, #4CAF50, #66BB6A)",
                "&:hover": {
                  background: "linear-gradient(45deg, #388E3C, #4CAF50)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              New Task
            </Button>
            <Button
              component={Link}
              to="/tasks/master"
              startIcon={<TaskIcon />}
              sx={{
                background: "linear-gradient(45deg, #FF9800, #FFB74D)",
                "&:hover": {
                  background: "linear-gradient(45deg, #F57C00, #FF9800)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              Task Master
            </Button>
            {isAdmin && (
              <Button
                onClick={() => setSelectedTab(2)}
                startIcon={
                  <Badge badgeContent={stats.pendingApproval} color="error">
                    <AdminIcon />
                  </Badge>
                }
                sx={{
                  background:
                    stats.pendingApproval > 0
                      ? "linear-gradient(45deg, #9C27B0, #E91E63)"
                      : "linear-gradient(45deg, #607D8B, #78909C)",
                  "&:hover": {
                    background: "linear-gradient(45deg, #7B1FA2, #C2185B)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                Admin Approval
              </Button>
            )}
          </ButtonGroup>

          {/* Keyboard Shortcuts Info with better styling */}
          <Box
            sx={{
              display: "inline-flex",
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(20px)",
              borderRadius: 2,
              p: 2,
              gap: 2,
              flexWrap: "wrap",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "white", display: "flex", alignItems: "center" }}
            >
              <kbd
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  marginRight: "4px",
                }}
              >
                Ctrl+R
              </kbd>
              Refresh
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "white", display: "flex", alignItems: "center" }}
            >
              <kbd
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  marginRight: "4px",
                }}
              >
                Ctrl+N
              </kbd>
              New Task
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "white", display: "flex", alignItems: "center" }}
            >
              <kbd
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  marginRight: "4px",
                }}
              >
                Ctrl+M
              </kbd>
              Task Master
            </Typography>
            {isAdmin && (
              <Typography
                variant="caption"
                sx={{ color: "white", display: "flex", alignItems: "center" }}
              >
                <kbd
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    marginRight: "4px",
                  }}
                >
                  Ctrl+A
                </kbd>
                Admin Panel
              </Typography>
            )}
          </Box>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Main Tabs */}
        <ProfessionalCard>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={selectedTab}
              onChange={(e, newValue) => setSelectedTab(newValue)}
              aria-label="task management tabs"
              sx={{
                "& .MuiTab-root": {
                  fontWeight: 600,
                  textTransform: "none",
                  fontSize: "1rem",
                },
                "& .MuiTabs-indicator": {
                  background: "linear-gradient(45deg, #2196F3, #21CBF3)",
                  height: 3,
                  borderRadius: 2,
                },
              }}
            >
              <Tab
                icon={<BarChartIcon />}
                label="Analytics"
                iconPosition="start"
              />
              <Tab
                icon={<FilterListIcon />}
                label="Filters & Views"
                iconPosition="start"
              />
              {isAdmin && (
                <Tab
                  icon={
                    <Badge badgeContent={stats.pendingApproval} color="error">
                      <ApprovalIcon />
                    </Badge>
                  }
                  label={`Admin Approval (${stats.pendingApproval})`}
                  iconPosition="start"
                  sx={{
                    color: stats.pendingApproval > 0 ? "#9C27B0" : "inherit",
                  }}
                />
              )}
            </Tabs>
          </Box>

          {/* Tab 1: Analytics */}
          <TabPanel value={selectedTab} index={0}>
            {/* Key Metrics Cards with improved colors */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={2.4}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ProfessionalCard>
                    <CardContent
                      sx={{
                        textAlign: "center",
                        p: 3,
                        background: "linear-gradient(135deg, #E3F2FD, #BBDEFB)",
                      }}
                    >
                      <TrendingUpIcon
                        sx={{ fontSize: 40, color: "#1976D2", mb: 1 }}
                      />
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        color="#1976D2"
                      >
                        {stats.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Tasks
                      </Typography>
                    </CardContent>
                  </ProfessionalCard>
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ProfessionalCard>
                    <CardContent
                      sx={{
                        textAlign: "center",
                        p: 3,
                        background: "linear-gradient(135deg, #FFF3E0, #FFE0B2)",
                      }}
                    >
                      <ScheduleIcon
                        sx={{ fontSize: 40, color: "#F57C00", mb: 1 }}
                      />
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        color="#F57C00"
                      >
                        {stats.pending}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending
                      </Typography>
                    </CardContent>
                  </ProfessionalCard>
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ProfessionalCard>
                    <CardContent
                      sx={{
                        textAlign: "center",
                        p: 3,
                        background: "linear-gradient(135deg, #E8F5E8, #C8E6C9)",
                      }}
                    >
                      <CheckCircleIcon
                        sx={{ fontSize: 40, color: "#388E3C", mb: 1 }}
                      />
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        color="#388E3C"
                      >
                        {stats.completed}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Completed
                      </Typography>
                    </CardContent>
                  </ProfessionalCard>
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ProfessionalCard>
                    <CardContent
                      sx={{
                        textAlign: "center",
                        p: 3,
                        background: "linear-gradient(135deg, #FFEBEE, #FFCDD2)",
                      }}
                    >
                      <ErrorIcon
                        sx={{ fontSize: 40, color: "#D32F2F", mb: 1 }}
                      />
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        color="#D32F2F"
                      >
                        {stats.overdue}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overdue
                      </Typography>
                    </CardContent>
                  </ProfessionalCard>
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ProfessionalCard>
                    <CardContent
                      sx={{
                        textAlign: "center",
                        p: 3,
                        background: "linear-gradient(135deg, #F3E5F5, #E1BEE7)",
                      }}
                    >
                      <Badge badgeContent={stats.pendingApproval} color="error">
                        <ApprovalIcon
                          sx={{ fontSize: 40, color: "#7B1FA2", mb: 1 }}
                        />
                      </Badge>
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{ color: "#7B1FA2" }}
                      >
                        {stats.pendingApproval}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Approval
                      </Typography>
                      {isAdmin && stats.pendingApproval > 0 && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => setSelectedTab(2)}
                          sx={{
                            mt: 1,
                            fontSize: "0.75rem",
                            background:
                              "linear-gradient(45deg, #9C27B0, #E91E63)",
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </CardContent>
                  </ProfessionalCard>
                </motion.div>
              </Grid>
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <ProfessionalCard>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 3,
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold">
                        Task Distribution
                      </Typography>
                      <ButtonGroup size="small">
                        <Button
                          variant={
                            chartType === "pie" ? "contained" : "outlined"
                          }
                          onClick={() => setChartType("pie")}
                          startIcon={<PieChartIcon />}
                        >
                          Pie Chart
                        </Button>
                        <Button
                          variant={
                            chartType === "bar" ? "contained" : "outlined"
                          }
                          onClick={() => setChartType("bar")}
                          startIcon={<BarChartIcon />}
                        >
                          Bar Chart
                        </Button>
                      </ButtonGroup>
                    </Box>

                    <ResponsiveContainer width="100%" height={400}>
                      {chartType === "pie" ? (
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            dataKey="value"
                            animationDuration={1000}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip />
                          <Legend />
                        </PieChart>
                      ) : (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <ChartTooltip />
                          <Legend />
                          <Bar dataKey="value" fill="#2196F3" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                </ProfessionalCard>
              </Grid>

              <Grid item xs={12} lg={4}>
                <ProfessionalCard>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Quick Actions
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <StyledButton
                        variant="contained"
                        fullWidth
                        onClick={() => navigate("/tasks/new")}
                        startIcon={<TaskIcon />}
                        sx={{
                          background:
                            "linear-gradient(45deg, #4CAF50, #66BB6A)",
                        }}
                      >
                        Create New Task
                      </StyledButton>
                      <StyledButton
                        variant="contained"
                        fullWidth
                        onClick={() => navigate("/tasks/master")}
                        startIcon={<BarChartIcon />}
                        sx={{
                          background:
                            "linear-gradient(45deg, #FF9800, #FFB74D)",
                        }}
                      >
                        View All Tasks
                      </StyledButton>
                      <StyledButton
                        variant="contained"
                        fullWidth
                        onClick={fetchData}
                        startIcon={<RefreshIcon />}
                        sx={{
                          background:
                            "linear-gradient(45deg, #2196F3, #21CBF3)",
                        }}
                      >
                        Refresh Data
                      </StyledButton>
                      {isAdmin && stats.pendingApproval > 0 && (
                        <StyledButton
                          variant="contained"
                          fullWidth
                          onClick={() => setSelectedTab(2)}
                          startIcon={
                            <Badge
                              badgeContent={stats.pendingApproval}
                              color="error"
                            >
                              <ApprovalIcon />
                            </Badge>
                          }
                          sx={{
                            background:
                              "linear-gradient(45deg, #9C27B0, #E91E63)",
                          }}
                        >
                          Review Approvals
                        </StyledButton>
                      )}
                    </Box>
                  </CardContent>
                </ProfessionalCard>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 2: Filters & Views */}
          <TabPanel value={selectedTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Financial Year</InputLabel>
                  <StyledSelect
                    value={filters.financialYear}
                    label="Financial Year"
                    onChange={(e) =>
                      handleFilterChange("financialYear", e.target.value)
                    }
                  >
                    <StyledMenuItem value="">All</StyledMenuItem>
                    <StyledMenuItem value="FY 2023-24">
                      FY 2023-24
                    </StyledMenuItem>
                    <StyledMenuItem value="FY 2024-25">
                      FY 2024-25
                    </StyledMenuItem>
                    <StyledMenuItem value="FY 2025-26">
                      FY 2025-26
                    </StyledMenuItem>
                  </StyledSelect>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <Autocomplete
                  options={clients}
                  getOptionLabel={(option) =>
                    `${option.clientCode} - ${option.clientName}`
                  }
                  value={
                    clients.find((c) => c.clientCode === filters.clientCode) ||
                    null
                  }
                  onChange={(event, newValue) => {
                    handleFilterChange(
                      "clientCode",
                      newValue ? newValue.clientCode : ""
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Client"
                      variant="outlined"
                      fullWidth
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          background: "rgba(255, 255, 255, 0.95)",
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Team Member</InputLabel>
                  <StyledSelect
                    value={filters.teamMemberId}
                    label="Team Member"
                    onChange={(e) =>
                      handleFilterChange("teamMemberId", e.target.value)
                    }
                  >
                    <StyledMenuItem value="">All</StyledMenuItem>
                    {teamMembers.map((member) => (
                      <StyledMenuItem
                        key={member.teamMemberId}
                        value={member.teamMemberId}
                      >
                        {member.name}
                      </StyledMenuItem>
                    ))}
                  </StyledSelect>
                </FormControl>
              </Grid>
            </Grid>

            {/* Active Filters */}
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Active Filters
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {filters.financialYear && (
                  <FilterChip
                    label={`Financial Year: ${filters.financialYear}`}
                    onDelete={() => handleFilterChange("financialYear", "")}
                  />
                )}
                {filters.clientCode && (
                  <FilterChip
                    label={`Client: ${filters.clientCode}`}
                    onDelete={() => handleFilterChange("clientCode", "")}
                  />
                )}
                {filters.teamMemberId && (
                  <FilterChip
                    label={`Team: ${
                      teamMembers.find(
                        (t) => t.teamMemberId === filters.teamMemberId
                      )?.name || filters.teamMemberId
                    }`}
                    onDelete={() => handleFilterChange("teamMemberId", "")}
                  />
                )}
                {(filters.financialYear ||
                  filters.clientCode ||
                  filters.teamMemberId) && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleClearFilters}
                    startIcon={<RefreshIcon />}
                  >
                    Clear All
                  </Button>
                )}
              </Box>
            </Box>
          </TabPanel>

          {/* Tab 3: Admin Approval (only for admins) */}
          {isAdmin && (
            <TabPanel value={selectedTab} index={2}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  🔍 Tasks Pending Admin Approval
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Review and approve/reject tasks that require admin attention
                  (backdated completions, etc.)
                </Typography>

                {stats.pendingApproval > 0 && (
                  <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                    <strong>{stats.pendingApproval}</strong> task(s) require
                    your approval. Please review them below and take appropriate
                    action.
                  </Alert>
                )}
              </Box>

              <AdminApprovalTable />
            </TabPanel>
          )}
        </ProfessionalCard>

        {/* Approval Dialog with safe date formatting */}
        <Dialog
          open={approvalDialogOpen}
          onClose={() => setApprovalDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Task Approval Details</DialogTitle>
          <DialogContent>
            {selectedApprovalTask && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Client:
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedApprovalTask.clientCode}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Service:
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedApprovalTask.serviceName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Team Member:
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {teamMembers.find(
                        (t) =>
                          t.teamMemberId === selectedApprovalTask.teamMemberId
                      )?.name || selectedApprovalTask.teamMemberId}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Completed Date:
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      color="warning.main"
                    >
                      {safeFormatDate(
                        selectedApprovalTask.completedAt,
                        "dd-MMM-yyyy"
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Reason for Approval:
                    </Typography>
                    <Alert
                      severity={
                        selectedApprovalTask.pendingAction === "delete"
                          ? "warning"
                          : "info"
                      }
                      sx={{ mt: 1 }}
                    >
                      {selectedApprovalTask.pendingAction === "delete"
                        ? "This task has been requested for deletion and requires admin approval."
                        : selectedApprovalTask.pendingAction === "complete"
                        ? "This task was completed with a backdated completion date and requires admin approval."
                        : selectedApprovalTask.pendingAction === "status_change"
                        ? "This task status change from completed status requires admin approval."
                        : "This task requires admin approval."}
                    </Alert>
                  </Grid>
                  {selectedApprovalTask.userRemark && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Users Remark:
                      </Typography>
                      <Alert
                        severity="secondary"
                        sx={{ mt: 1, bgcolor: "grey.50" }}
                      >
                        {selectedApprovalTask.userRemark}
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                selectedApprovalTask &&
                handleApprovalAction(selectedApprovalTask._id, false)
              }
              color="error"
              startIcon={<CloseIcon />}
            >
              Reject
            </Button>
            <Button
              onClick={() =>
                selectedApprovalTask &&
                handleApprovalAction(selectedApprovalTask._id, true)
              }
              color="success"
              variant="contained"
              startIcon={<CheckIcon />}
            >
              Approve
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </motion.div>
  );
};

export default TaskManagementPage;
