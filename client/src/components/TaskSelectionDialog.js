import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TextField,
  Chip,
  Pagination,
  Alert,
  FormControlLabel,
  Switch,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import {
  Close,
  Refresh,
  Info,
  Timeline,
  GroupWork,
  CheckCircle,
  AutoAwesome,
} from "@mui/icons-material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import API_BASE_URL from "../config"; // adjust path based on file depth


// Task status configurations
const TASK_STATUSES = {
  All: {
    label: "All Tasks",
    color: "#2196f3",
    filter: "",
    icon: "📋",
  },
  Pending: {
    label: "Pending",
    color: "#ff9800",
    filter:
      "pending,pending-overdue,pending-client,pending-admin-approval,Pending,Pending-overdue,Pending-client,Pending-Admin-approval",
    icon: "⏳",
  },
  Completed: {
    label: "Completed",
    color: "#4caf50",
    filter: "completed,Completed",
    icon: "✅",
  },
  Upcoming: {
    label: "Upcoming",
    color: "#9e9e9e",
    filter: "upcoming,Upcoming",
    icon: "📅",
  },
};

// Financial year months with proper calculation
const FY_MONTHS = [
  { value: 0, label: "April", short: "Apr", calendarMonth: 3 },
  { value: 1, label: "May", short: "May", calendarMonth: 4 },
  { value: 2, label: "June", short: "Jun", calendarMonth: 5 },
  { value: 3, label: "July", short: "Jul", calendarMonth: 6 },
  { value: 4, label: "August", short: "Aug", calendarMonth: 7 },
  { value: 5, label: "September", short: "Sep", calendarMonth: 8 },
  { value: 6, label: "October", short: "Oct", calendarMonth: 9 },
  { value: 7, label: "November", short: "Nov", calendarMonth: 10 },
  { value: 8, label: "December", short: "Dec", calendarMonth: 11 },
  { value: 9, label: "January", short: "Jan", calendarMonth: 0 },
  { value: 10, label: "February", short: "Feb", calendarMonth: 1 },
  { value: 11, label: "March", short: "Mar", calendarMonth: 2 },
];

// Quarters for quarterly billing
const QUARTERS = [
  { value: "Q1", label: "Q1 (Apr-Jun)", months: [0, 1, 2] },
  { value: "Q2", label: "Q2 (Jul-Sep)", months: [3, 4, 5] },
  { value: "Q3", label: "Q3 (Oct-Dec)", months: [6, 7, 8] },
  { value: "Q4", label: "Q4 (Jan-Mar)", months: [9, 10, 11] },
];

// Status display mapping
const getStatusDisplayInfo = (status) => {
  const normalizedStatus = status?.toLowerCase();

  if (!normalizedStatus)
    return { label: "Unknown", color: "default", icon: "❓" };

  if (normalizedStatus.includes("completed")) {
    return { label: "Completed", color: "success", icon: "✅" };
  } else if (normalizedStatus.includes("pending")) {
    if (normalizedStatus.includes("overdue")) {
      return { label: "Pending (Overdue)", color: "error", icon: "🚨" };
    } else if (normalizedStatus.includes("client")) {
      return { label: "Pending (Client)", color: "warning", icon: "👤" };
    } else if (normalizedStatus.includes("admin")) {
      return { label: "Pending (Admin)", color: "info", icon: "🔍" };
    } else {
      return { label: "Pending", color: "warning", icon: "⏳" };
    }
  } else if (normalizedStatus.includes("upcoming")) {
    return { label: "Upcoming", color: "info", icon: "📅" };
  } else {
    return { label: status, color: "default", icon: "📝" };
  }
};

// Convert frequency from Service model to period type
const convertFrequencyToPeriodType = (frequency) => {
  if (!frequency) return "monthly"; // Default to monthly

  const lowerFrequency = frequency.toLowerCase();

  if (lowerFrequency.includes("month")) return "monthly";
  if (lowerFrequency.includes("quarter")) return "quarterly";
  if (lowerFrequency.includes("year") || lowerFrequency.includes("annual"))
    return "yearly";
  if (lowerFrequency.includes("week")) return "weekly";

  return "monthly"; // Default fallback
};

// Generate period display text with proper year calculation
const generatePeriodDisplayText = (
  periodType,
  startDate,
  endDate,
  startMonth,
  endMonth,
  startQuarter,
  endQuarter
) => {
  switch (periodType) {
    case "yearly":
      if (startDate && endDate) {
        const fyYear = startDate.getFullYear();
        return `FY ${fyYear}-${(fyYear + 1) % 100}`;
      }
      break;
    case "monthly":
      if (
        startMonth !== undefined &&
        endMonth !== undefined &&
        startDate &&
        endDate
      ) {
        const startMonthData = FY_MONTHS[startMonth];
        const endMonthData = FY_MONTHS[endMonth];
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        return `${startMonthData.short} ${startYear} to ${endMonthData.short} ${endYear}`;
      }
      break;
    case "quarterly":
      if (startQuarter && endQuarter && startDate) {
        const fyYear = startDate.getFullYear();
        return `${startQuarter} to ${endQuarter} FY${fyYear}-${
          (fyYear + 1) % 100
        }`;
      }
      break;
    case "weekly":
      if (startDate && endDate) {
        return `${startDate.toLocaleDateString(
          "en-GB"
        )} to ${endDate.toLocaleDateString("en-GB")}`;
      }
      break;
    case "custom":
      if (startDate && endDate) {
        return `${startDate.toLocaleDateString(
          "en-GB"
        )} to ${endDate.toLocaleDateString("en-GB")}`;
      }
      break;
    default:
      return "";
  }
  return "";
};

const TaskSelectionDialog = ({
  open,
  onClose,
  clientCode,
  billedTaskIds = new Set(),
  onTasksSelected,
  selectedTasks = [],
}) => {
  const [currentTab, setCurrentTab] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [taskCounts, setTaskCounts] = useState({});
  const [localSelectedTasks, setLocalSelectedTasks] = useState([]);
  const [taskAmounts, setTaskAmounts] = useState({});
  const [amountSuggestions, setAmountSuggestions] = useState({});
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalTasks: 0,
    currentPage: 1,
  });
  const [debugInfo, setDebugInfo] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Period billing state
  const [periodBillingEnabled, setPeriodBillingEnabled] = useState(false);
  const [periodType, setPeriodType] = useState("monthly");
  const [periodStartDate, setPeriodStartDate] = useState(new Date());
  const [periodEndDate, setPeriodEndDate] = useState(new Date());
  const [periodServiceName, setPeriodServiceName] = useState("");
  const [serviceFrequency, setServiceFrequency] = useState(null);
  const [periodRate, setPeriodRate] = useState("");
  const [periodAnalysis, setPeriodAnalysis] = useState(null);

  // Smart period selection states
  const [startMonth, setStartMonth] = useState(0); // April (FY start)
  const [endMonth, setEndMonth] = useState(11); // March (FY end)
  const [startQuarter, setStartQuarter] = useState("Q1");
  const [endQuarter, setEndQuarter] = useState("Q4");

  // Service name suggestions from client's tasks
  const [serviceNameSuggestions, setServiceNameSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const tasksPerPage = 25;

  // Initialize local state with selected tasks
  useEffect(() => {
    if (selectedTasks.length > 0) {
      setLocalSelectedTasks(selectedTasks);
      const amounts = {};
      selectedTasks.forEach((task) => {
        amounts[task.taskId] = task.amount;
      });
      setTaskAmounts(amounts);
    }
  }, [selectedTasks]);

  // Fetch service name suggestions from client's tasks
  const fetchServiceNameSuggestions = useCallback(async () => {
    if (!clientCode) return;

    setLoadingSuggestions(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/tasks?clientCode=${clientCode}&limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const tasks = data.tasks || [];

        // Extract unique service names
        const uniqueServices = [
          ...new Set(
            tasks
              .map((task) => task.serviceName)
              .filter((name) => name && name.trim())
          ),
        ];

        setServiceNameSuggestions(uniqueServices);
        console.log(
          `📋 Found ${uniqueServices.length} unique service names for client ${clientCode}`
        );
      }
    } catch (err) {
      console.warn("Could not fetch service name suggestions:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [clientCode]);

  // Fetch service suggestions when dialog opens
  useEffect(() => {
    if (open && clientCode) {
      fetchServiceNameSuggestions();
    }
  }, [open, clientCode, fetchServiceNameSuggestions]);

  // Fetch service frequency from API when service name changes
  const fetchServiceFrequency = useCallback(async (serviceName) => {
    if (!serviceName || !serviceName.trim()) {
      setServiceFrequency(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const encodedServiceName = encodeURIComponent(serviceName.trim());
      const response = await fetch(
        `${API_BASE_URL}/api/services/by-name/${encodedServiceName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const serviceData = await response.json();
        console.log(`🔍 Retrieved service data:`, serviceData);

        // Set the service frequency from the Service model
        setServiceFrequency(serviceData.frequency);

        // Convert the frequency to period type
        const newPeriodType = convertFrequencyToPeriodType(
          serviceData.frequency
        );
        console.log(
          `🎯 Setting period type to ${newPeriodType} based on frequency: ${serviceData.frequency}`
        );
        setPeriodType(newPeriodType);

        // Set appropriate defaults based on detected type
        if (newPeriodType === "yearly") {
          // Yearly services automatically use the current FY
          // Trigger calculation immediately
          setTimeout(() => calculatePeriodDates(), 0);
        } else if (newPeriodType === "quarterly") {
          setStartQuarter("Q1");
          setEndQuarter("Q4");
          // Trigger calculation after setting quarters
          setTimeout(() => calculatePeriodDates(), 0);
        } else if (newPeriodType === "monthly") {
          setStartMonth(0); // April
          setEndMonth(11); // March (full FY)
          // Trigger calculation after setting months
          setTimeout(() => calculatePeriodDates(), 0);
        } else if (newPeriodType === "weekly") {
          // Set default dates for weekly services to current FY
          setTimeout(() => calculatePeriodDates(), 0);
        }
      } else {
        console.warn(`Service not found for name: ${serviceName}`);
        setServiceFrequency(null);
      }
    } catch (err) {
      console.error("Error fetching service frequency:", err);
      setServiceFrequency(null);
    }
  }, []);

  // Fetch service frequency when service name changes
  useEffect(() => {
    if (periodServiceName && periodBillingEnabled) {
      fetchServiceFrequency(periodServiceName);
    }
  }, [periodServiceName, periodBillingEnabled, fetchServiceFrequency]);

  // Calculate date ranges based on period type and selections with proper FY logic
  const calculatePeriodDates = useCallback(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-based (0 = January, 3 = April)

    // Determine current FY year (FY starts in April)
    const currentFYYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    switch (periodType) {
      case "yearly": {
        // For yearly services, use full financial year
        const startDate = new Date(currentFYYear, 3, 1); // April 1st
        const endDate = new Date(currentFYYear + 1, 2, 31); // March 31st next year

        setPeriodStartDate(startDate);
        setPeriodEndDate(endDate);
        break;
      }

      case "monthly": {
        // Proper FY based month calculation
        const startMonthData = FY_MONTHS[startMonth];
        const endMonthData = FY_MONTHS[endMonth];

        // For FY calculation: April-March of current FY year
        let startYear = currentFYYear;
        let endYear = currentFYYear;

        // If start month is Jan-Mar (next calendar year), use FY+1 calendar year
        if (startMonthData.calendarMonth < 3) {
          startYear = currentFYYear + 1;
        }

        if (endMonthData.calendarMonth < 3) {
          endYear = currentFYYear + 1;
        }

        // If we're spanning across FY (like Nov to Feb), adjust end year
        if (startMonth > endMonth) {
          endYear = startYear + 1;
        }

        const startDate = new Date(startYear, startMonthData.calendarMonth, 1);
        const endDate = new Date(endYear, endMonthData.calendarMonth + 1, 0); // Last day of end month

        setPeriodStartDate(startDate);
        setPeriodEndDate(endDate);
        break;
      }

      case "quarterly": {
        const startQ = QUARTERS.find((q) => q.value === startQuarter);
        const endQ = QUARTERS.find((q) => q.value === endQuarter);

        if (startQ && endQ) {
          const startMonthIndex = startQ.months[0];
          const endMonthIndex = endQ.months[2];

          const startMonthCalendar = FY_MONTHS[startMonthIndex].calendarMonth;
          const endMonthCalendar = FY_MONTHS[endMonthIndex].calendarMonth;

          let qStartYear = currentFYYear;
          let qEndYear = currentFYYear;

          // Adjust for Jan-Mar months which are in next calendar year
          if (startMonthCalendar < 3) {
            qStartYear = currentFYYear + 1;
          }

          if (endMonthCalendar < 3) {
            qEndYear = currentFYYear + 1;
          }

          const qStartDate = new Date(qStartYear, startMonthCalendar, 1);
          const qEndDate = new Date(qEndYear, endMonthCalendar + 1, 0); // Last day of end month

          setPeriodStartDate(qStartDate);
          setPeriodEndDate(qEndDate);
        }
        break;
      }

      case "weekly": {
        // For weekly services, use the dates directly
        // If dates are not set, default to current financial year
        if (!periodStartDate || !periodEndDate) {
          const fyStartDate = new Date(currentFYYear, 3, 1); // April 1st of current FY
          const fyEndDate = new Date(currentFYYear + 1, 2, 31); // March 31st of next year

          setPeriodStartDate(fyStartDate);
          setPeriodEndDate(fyEndDate);
        }
        // If dates are already set, keep them as they are
        break;
      }
      default:
        // Custom dates - use existing date selection
        break;
    }
  }, [periodType, startMonth, endMonth, startQuarter, endQuarter]);

  // Update dates when period settings change
  useEffect(() => {
    if (periodType !== "custom") {
      calculatePeriodDates();
    }
  }, [
    periodType,
    startMonth,
    endMonth,
    startQuarter,
    endQuarter,
    calculatePeriodDates,
  ]);

  // Analyze tasks for period billing with better date matching
  const analyzePeriodTasks = useCallback(async () => {
    if (
      !clientCode ||
      !periodStartDate ||
      !periodEndDate ||
      !periodServiceName
    ) {
      setPeriodAnalysis(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      // Use broader date range and better matching
      // Format dates without timezone conversion to avoid off-by-one errors
      const startDateStr = `${periodStartDate.getFullYear()}-${String(
        periodStartDate.getMonth() + 1
      ).padStart(2, "0")}-${String(periodStartDate.getDate()).padStart(
        2,
        "0"
      )}`;
      const endDateStr = `${periodEndDate.getFullYear()}-${String(
        periodEndDate.getMonth() + 1
      ).padStart(2, "0")}-${String(periodEndDate.getDate()).padStart(2, "0")}`;

      console.log("🔍 Analyzing period:", {
        clientCode,
        serviceName: periodServiceName,
        startDate: startDateStr,
        endDate: endDateStr,
        periodType,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/taskbillings/analyze-period-billing?` +
          new URLSearchParams({
            clientCode,
            serviceName: periodServiceName,
            startDate: startDateStr,
            endDate: endDateStr,
          }),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const analysis = await response.json();
        setPeriodAnalysis(analysis);
        console.log("📊 Period analysis result:", analysis);
      } else {
        console.warn("Failed to analyze period tasks");
        setPeriodAnalysis(null);
      }
    } catch (err) {
      console.error("Error analyzing period tasks:", err);
      setPeriodAnalysis(null);
    }
  }, [
    clientCode,
    periodStartDate,
    periodEndDate,
    periodServiceName,
    periodType,
  ]);

  // Trigger analysis when period parameters change
  useEffect(() => {
    if (periodBillingEnabled && periodServiceName) {
      const timeoutId = setTimeout(analyzePeriodTasks, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [periodBillingEnabled, analyzePeriodTasks, periodServiceName]);

  // Fetch amount suggestions when client changes
  useEffect(() => {
    const fetchAmountSuggestions = async () => {
      if (!clientCode) return;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_BASE_URL}/api/invoices/service-amounts/${clientCode}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const suggestions = await response.json();
          setAmountSuggestions(suggestions);
          console.log("Amount suggestions loaded:", suggestions);
        }
      } catch (err) {
        console.warn("Could not fetch amount suggestions:", err);
      }
    };

    fetchAmountSuggestions();
  }, [clientCode]);

  // Better task count fetching with new endpoints
  const fetchTaskCounts = useCallback(async () => {
    if (!clientCode) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/taskbillings/task-counts-for-billing/${clientCode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const countsData = await response.json();
        console.log("📊 Task counts received:", countsData);
        setTaskCounts(countsData);

        const totalTasksFound = Object.values(countsData).reduce(
          (sum, count) => sum + count,
          0
        );
        setDebugInfo(
          `Total tasks found: ${totalTasksFound} across all statuses`
        );
      } else {
        console.warn("Failed to fetch task counts:", response.status);
      }
    } catch (err) {
      console.error("Error fetching task counts:", err);
      setTaskCounts({});
    }
  }, [clientCode]);

  // Better task fetching with new endpoint
  const fetchTasks = useCallback(async () => {
    if (!clientCode) return;

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const statusConfig = TASK_STATUSES[currentTab];

      const queryParams = new URLSearchParams({
        clientCode,
        page: currentPage,
        limit: tasksPerPage,
      });

      if (statusConfig?.filter) {
        queryParams.set("status", statusConfig.filter);
      }

      console.log(
        `🔍 Fetching tasks for tab "${currentTab}" with params:`,
        queryParams.toString()
      );

      let response = await fetch(
        `${API_BASE_URL}/api/taskbillings/tasks-for-billing?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok && response.status === 404) {
        console.log("📝 Falling back to regular tasks endpoint");
        response = await fetch(
          `${API_BASE_URL}/api/tasks?${queryParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📋 Tasks response for "${currentTab}":`, {
        tasksCount: data.tasks?.length || 0,
        totalTasks: data.totalTasks || data.total,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
      });

      const allTasks = (data.tasks || []).filter(
        (task) => !task.isDeleted && task.status !== "deleted"
      );

      setTasks(allTasks);
      setPagination({
        totalPages:
          data.totalPages ||
          Math.ceil((data.totalTasks || data.total || 0) / tasksPerPage),
        totalTasks: data.totalTasks || data.total || 0,
        currentPage: data.currentPage || currentPage,
      });

      const debugMsg = `Tab: ${currentTab}, Page: ${currentPage}, Tasks: ${
        allTasks.length
      }, Total: ${data.totalTasks || data.total || 0}`;
      setDebugInfo(debugMsg);
    } catch (err) {
      console.error("❌ Error fetching tasks:", err);
      setError(`Failed to load tasks: ${err.message}`);
      setTasks([]);
      setPagination({ totalPages: 1, totalTasks: 0, currentPage: 1 });
    } finally {
      setLoading(false);
    }
  }, [clientCode, currentTab, currentPage, tasksPerPage]);

  // Fetch tasks when dialog opens or filters change
  useEffect(() => {
    if (!open || !clientCode) return;
    fetchTasks();
  }, [open, fetchTasks, refreshKey]);

  // Fetch task counts when dialog opens
  useEffect(() => {
    if (!open || !clientCode) return;
    fetchTaskCounts();
  }, [open, fetchTaskCounts, refreshKey]);

  const handleTabChange = useCallback((event, newValue) => {
    console.log(`🔄 Switching to tab: ${newValue}`);
    setCurrentTab(newValue);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((event, value) => {
    console.log(`📄 Changing to page: ${value}`);
    setCurrentPage(value);
  }, []);

  const getAmountSuggestion = useCallback(
    (serviceName) => {
      if (!serviceName || !amountSuggestions) return null;
      const normalizedServiceName = serviceName.toLowerCase().trim();
      return amountSuggestions[normalizedServiceName] || null;
    },
    [amountSuggestions]
  );

  const handleTaskSelection = useCallback(
    (taskId, isSelected) => {
      const task = tasks.find((t) => t._id === taskId);
      if (!task) return;

      if (billedTaskIds.has(taskId)) {
        setError(
          "This task has already been billed and cannot be selected again."
        );
        return;
      }

      if (isSelected) {
        let suggestedAmount = 0;
        if (autoFillEnabled) {
          suggestedAmount = getAmountSuggestion(task.serviceName) || 0;
        }

        const amount = taskAmounts[taskId] || suggestedAmount || 0;

        const newTask = {
          taskId,
          amount,
          serviceName: task.serviceName || "Task Service",
          serviceCode: task.serviceCode || "TASK",
          sacCode: task.sacCode || "998314",
          servicePeriod: task.servicePeriod || "N/A",
          isCustom: false,
        };

        setLocalSelectedTasks((prev) => [...prev, newTask]);
        setTaskAmounts((prev) => ({ ...prev, [taskId]: amount }));
      } else {
        setLocalSelectedTasks((prev) =>
          prev.filter((t) => t.taskId !== taskId)
        );
        setTaskAmounts((prev) => {
          const newAmounts = { ...prev };
          delete newAmounts[taskId];
          return newAmounts;
        });
      }
    },
    [tasks, taskAmounts, autoFillEnabled, getAmountSuggestion, billedTaskIds]
  );

  const handleAmountChange = useCallback((taskId, amount) => {
    const numericAmount = parseFloat(amount) || 0;
    setTaskAmounts((prev) => ({ ...prev, [taskId]: numericAmount }));

    setLocalSelectedTasks((prev) =>
      prev.map((task) =>
        task.taskId === taskId ? { ...task, amount: numericAmount } : task
      )
    );
  }, []);

  const handleAutoFillAll = useCallback(() => {
    if (!autoFillEnabled || Object.keys(amountSuggestions).length === 0) return;

    const updatedAmounts = { ...taskAmounts };
    const updatedTasks = localSelectedTasks.map((task) => {
      const suggestion = getAmountSuggestion(task.serviceName);
      if (suggestion && suggestion > 0) {
        updatedAmounts[task.taskId] = suggestion;
        return { ...task, amount: suggestion };
      }
      return task;
    });

    setTaskAmounts(updatedAmounts);
    setLocalSelectedTasks(updatedTasks);
  }, [
    autoFillEnabled,
    amountSuggestions,
    taskAmounts,
    localSelectedTasks,
    getAmountSuggestion,
  ]);

  // Handle period billing selection with corrected enum value
  const handleAddPeriodBilling = useCallback(() => {
    if (!periodServiceName || !periodRate || !periodAnalysis) {
      setError("Please fill all period billing fields and analyze the period");
      return;
    }

    const rate = parseFloat(periodRate);
    if (rate <= 0) {
      setError("Period rate must be greater than 0");
      return;
    }

    if (periodAnalysis.totalTasks === 0) {
      setError("No tasks found for the selected period");
      return;
    }

    // Better period display text
    const periodDisplayText = generatePeriodDisplayText(
      periodType,
      periodStartDate,
      periodEndDate,
      startMonth,
      endMonth,
      startQuarter,
      endQuarter
    );

    const periodTask = {
      taskId: `period_${Date.now()}`, // Unique ID for period billing
      amount: rate * periodAnalysis.totalTasks,
      serviceName: periodServiceName, // Just the service name
      serviceCode: "PERIOD",
      sacCode: "998314",
      servicePeriod: periodDisplayText, // Clean period display
      isCustom: true,
      isPeriodBilling: true,
      customServiceType: "OTHER", // FIXED: Use valid enum value
      periodDetails: {
        type: periodType,
        startDate: periodStartDate,
        endDate: periodEndDate,
        rate: rate,
        tasksCount: periodAnalysis.totalTasks,
        taskIds: periodAnalysis.taskIds || [],
        displayText: periodDisplayText,
        // Store period selection details
        periodSettings: {
          startMonth,
          endMonth,
          startQuarter,
          endQuarter,
        },
        // Store service frequency from Service model
        serviceFrequency: serviceFrequency,
      },
    };

    setLocalSelectedTasks((prev) => [...prev, periodTask]);

    // Reset period billing form
    setPeriodBillingEnabled(false);
    setPeriodServiceName("");
    setPeriodRate("");
    setPeriodAnalysis(null);
  }, [
    periodServiceName,
    periodRate,
    periodAnalysis,
    periodType,
    periodStartDate,
    periodEndDate,
    startMonth,
    endMonth,
    startQuarter,
    endQuarter,
    // startWeek,
    // endWeek,
    serviceFrequency,
  ]);

  const handleConfirm = useCallback(() => {
    const invalidTasks = localSelectedTasks.filter(
      (task) => !task.amount || task.amount <= 0
    );
    if (invalidTasks.length > 0) {
      setError("Please enter valid amounts for all selected tasks");
      return;
    }

    onTasksSelected(localSelectedTasks);
    onClose();
  }, [localSelectedTasks, onTasksSelected, onClose]);

  const handleCancel = useCallback(() => {
    setLocalSelectedTasks(selectedTasks);
    const amounts = {};
    selectedTasks.forEach((task) => {
      amounts[task.taskId] = task.amount;
    });
    setTaskAmounts(amounts);
    onClose();
  }, [selectedTasks, onClose]);

  const isTaskSelected = useCallback(
    (taskId) => {
      return localSelectedTasks.some((task) => task.taskId === taskId);
    },
    [localSelectedTasks]
  );

  const isTaskBilled = useCallback(
    (taskId) => {
      return billedTaskIds.has(taskId);
    },
    [billedTaskIds]
  );

  const totalSelectedAmount = useMemo(() => {
    return localSelectedTasks.reduce(
      (sum, task) => sum + (task.amount || 0),
      0
    );
  }, [localSelectedTasks]);

  const availableTasksCount = useMemo(() => {
    return tasks.filter((task) => !isTaskBilled(task._id)).length;
  }, [tasks, isTaskBilled]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    fetchTasks();
    fetchTaskCounts();
  }, [fetchTasks, fetchTaskCounts]);

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: "80vh",
          maxHeight: "95vh",
          borderRadius: 3,
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
        },
      }}
    >
      <DialogTitle sx={{ bgcolor: "primary.main", color: "white", p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              📋 Select Tasks for Billing
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Client: <strong>{clientCode}</strong> • Available:{" "}
              <strong>{availableTasksCount}</strong> • Page:{" "}
              <strong>
                {currentPage}/{pagination.totalPages}
              </strong>
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <IconButton
              onClick={handleRefresh}
              sx={{ color: "white" }}
              size="small"
            >
              <Refresh />
            </IconButton>
            <IconButton onClick={handleCancel} sx={{ color: "white" }}>
              <Close />
            </IconButton>
          </Box>
        </Box>

        {/* Debug Info */}
        {debugInfo && (
          <Alert
            severity="info"
            sx={{
              mt: 2,
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
            icon={<Info sx={{ color: "white" }} />}
          >
            <Typography variant="caption" sx={{ color: "white" }}>
              Debug: {debugInfo}
            </Typography>
          </Alert>
        )}
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* Period Billing Section with Service Frequency */}
        <Card sx={{ mb: 3, borderRadius: 2, border: "2px solid #e3f2fd" }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Timeline color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                ⚡ Period Billing (Super Fast Invoice Creation)
              </Typography>
              <Switch
                checked={periodBillingEnabled}
                onChange={(e) => setPeriodBillingEnabled(e.target.checked)}
                sx={{ ml: "auto" }}
              />
            </Box>

            {periodBillingEnabled && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  💡 Create a single line item for multiple services within a
                  period. Period type is determined by the services frequency.
                </Alert>

                <Grid container spacing={2}>
                  {/* Service Name field with auto-detection */}
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      fullWidth
                      options={serviceNameSuggestions}
                      value={periodServiceName}
                      onChange={(event, newValue) => {
                        setPeriodServiceName(newValue || "");
                      }}
                      onInputChange={(event, newInputValue) => {
                        setPeriodServiceName(newInputValue);
                      }}
                      loading={loadingSuggestions}
                      freeSolo
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Service Name"
                          placeholder="e.g., GSTR-1 - MLY, Income Tax Return"
                          size="small"
                          sx={{ minWidth: "300px" }}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingSuggestions ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                    {serviceFrequency && (
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ mt: 1, display: "block" }}
                      >
                        🎯 Service Frequency: {serviceFrequency}
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Rate per Service"
                      value={periodRate}
                      onChange={(e) => setPeriodRate(e.target.value)}
                      type="number"
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">₹</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Period Type: <strong>{periodType.toUpperCase()}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Based on service frequency: {serviceFrequency || "N/A"}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Smart Period Selection based on detected type */}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {periodType === "yearly" && (
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        💡 Yearly services automatically use the current
                        Financial Year (April to March).
                      </Alert>
                    </Grid>
                  )}

                  {periodType === "monthly" && (
                    <>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Start Month</InputLabel>
                          <Select
                            value={startMonth}
                            onChange={(e) => setStartMonth(e.target.value)}
                            label="Start Month"
                          >
                            {FY_MONTHS.map((month) => (
                              <MenuItem key={month.value} value={month.value}>
                                {month.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>End Month</InputLabel>
                          <Select
                            value={endMonth}
                            onChange={(e) => setEndMonth(e.target.value)}
                            label="End Month"
                          >
                            {FY_MONTHS.map((month) => (
                              <MenuItem key={month.value} value={month.value}>
                                {month.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </>
                  )}

                  {periodType === "quarterly" && (
                    <>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Start Quarter</InputLabel>
                          <Select
                            value={startQuarter}
                            onChange={(e) => setStartQuarter(e.target.value)}
                            label="Start Quarter"
                          >
                            {QUARTERS.map((quarter) => (
                              <MenuItem
                                key={quarter.value}
                                value={quarter.value}
                              >
                                {quarter.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>End Quarter</InputLabel>
                          <Select
                            value={endQuarter}
                            onChange={(e) => setEndQuarter(e.target.value)}
                            label="End Quarter"
                          >
                            {QUARTERS.map((quarter) => (
                              <MenuItem
                                key={quarter.value}
                                value={quarter.value}
                              >
                                {quarter.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </>
                  )}

                  {periodType === "weekly" && (
                    <>
                      <Grid item xs={12} md={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Start Date"
                            value={periodStartDate}
                            onChange={setPeriodStartDate}
                            renderInput={(params) => (
                              <TextField {...params} fullWidth size="small" />
                            )}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="End Date"
                            value={periodEndDate}
                            onChange={setPeriodEndDate}
                            renderInput={(params) => (
                              <TextField {...params} fullWidth size="small" />
                            )}
                          />
                        </LocalizationProvider>
                      </Grid>
                    </>
                  )}

                  {periodType === "custom" && (
                    <>
                      <Grid item xs={12} md={4}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Start Date"
                            value={periodStartDate}
                            onChange={setPeriodStartDate}
                            renderInput={(params) => (
                              <TextField {...params} fullWidth size="small" />
                            )}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="End Date"
                            value={periodEndDate}
                            onChange={setPeriodEndDate}
                            renderInput={(params) => (
                              <TextField {...params} fullWidth size="small" />
                            )}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={handleAddPeriodBilling}
                          disabled={
                            !periodAnalysis || !periodServiceName || !periodRate
                          }
                          startIcon={<GroupWork />}
                          sx={{ height: "40px" }}
                        >
                          Add Period Billing
                        </Button>
                      </Grid>
                    </>
                  )}

                  {(periodType === "yearly" ||
                    periodType === "monthly" ||
                    periodType === "quarterly" ||
                    periodType === "weekly") &&
                    periodType !== "custom" && (
                      <Grid item xs={12} md={12}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            mt: 1,
                          }}
                        >
                          <Button
                            variant="contained"
                            onClick={handleAddPeriodBilling}
                            disabled={
                              !periodAnalysis ||
                              !periodServiceName ||
                              !periodRate
                            }
                            startIcon={<GroupWork />}
                          >
                            Add Period Billing
                          </Button>

                          {/* Show calculated period text */}
                          {periodStartDate && periodEndDate && (
                            <Typography variant="body2" color="text.secondary">
                              📅 Period:{" "}
                              {generatePeriodDisplayText(
                                periodType,
                                periodStartDate,
                                periodEndDate,
                                startMonth,
                                endMonth,
                                startQuarter,
                                endQuarter
                              )}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    )}
                </Grid>

                {/* Period Analysis Display */}
                {periodAnalysis && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mt: 2,
                      background:
                        "linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      📈 Period Analysis
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Expected Tasks:
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {periodAnalysis.totalTasks}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Tasks Found:
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {periodAnalysis.summary?.availableForBilling || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Total Amount:
                        </Typography>
                        <Typography variant="h6" color="secondary">
                          ₹
                          {(
                            (parseFloat(periodRate) || 0) *
                            (periodAnalysis.totalTasks || 0)
                          ).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Method:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {periodAnalysis.debug?.queryUsed ===
                          "date_range_or_service"
                            ? "Date Match"
                            : "Manual Selection"}
                        </Typography>
                      </Grid>
                    </Grid>

                    {/* Period Details */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      📅 Period: {periodStartDate?.toLocaleDateString("en-GB")}{" "}
                      to {periodEndDate?.toLocaleDateString("en-GB")}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Task Selection Tabs */}
        <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
          >
            {Object.entries(TASK_STATUSES).map(([key, config]) => (
              <Tab
                key={key}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                    <Chip
                      label={taskCounts[key] || 0}
                      size="small"
                      sx={{ bgcolor: config.color, color: "white" }}
                    />
                  </Box>
                }
                value={key}
              />
            ))}
          </Tabs>

          {/* Task List */}
          <Box sx={{ p: 2 }}>
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            )}

            {!loading && tasks.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No tasks found for the selected status. Try switching to a
                different tab or refresh the data.
              </Alert>
            )}

            {!loading && tasks.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" disabled />
                      </TableCell>
                      <TableCell>Service Details</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell width={120}>Amount (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tasks.map((task) => {
                      const taskId = task._id;
                      const isSelected = isTaskSelected(taskId);
                      const isBilled = isTaskBilled(taskId);
                      const statusInfo = getStatusDisplayInfo(task.status);

                      return (
                        <TableRow
                          key={taskId}
                          sx={{
                            bgcolor: isBilled
                              ? "#ffebee"
                              : isSelected
                              ? "#e8f5e8"
                              : "inherit",
                            opacity: isBilled ? 0.6 : 1,
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              disabled={isBilled}
                              onChange={(e) =>
                                handleTaskSelection(taskId, e.target.checked)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                              >
                                {task.serviceName || "Unnamed Service"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Code: {task.serviceCode || "N/A"}
                              </Typography>
                              {isBilled && (
                                <Chip
                                  label="Already Billed"
                                  size="small"
                                  color="error"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusInfo.label}
                              size="small"
                              color={statusInfo.color}
                              icon={<span>{statusInfo.icon}</span>}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {task.servicePeriod || "N/A"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {isSelected && !isBilled ? (
                              <TextField
                                type="number"
                                size="small"
                                value={taskAmounts[taskId] || ""}
                                onChange={(e) =>
                                  handleAmountChange(taskId, e.target.value)
                                }
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      ₹
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{ width: 100 }}
                              />
                            ) : (
                              <Typography variant="body2">
                                {isBilled ? "Billed" : "Not Selected"}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: 2,
                }}
              >
                <Pagination
                  count={pagination.totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </Box>
        </Paper>

        {/* Selected Tasks Summary */}
        {localSelectedTasks.length > 0 && (
          <Paper
            sx={{
              p: 2,
              mt: 2,
              background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              📋 Selected Tasks ({localSelectedTasks.length})
            </Typography>
            <Box
              sx={{
                maxHeight: 200,
                overflowY: "auto",
                border: "1px solid #ddd",
                borderRadius: 1,
                bgcolor: "white",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell width={100}>Amount</TableCell>
                    <TableCell width={50}>Remove</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {localSelectedTasks.map((task, index) => (
                    <TableRow key={task.taskId}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {task.serviceName}
                        </Typography>
                        {task.isPeriodBilling && (
                          <Chip
                            label="Period Billing"
                            size="small"
                            color="secondary"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {task.isPeriodBilling ? "Period" : "Regular"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ₹{task.amount?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setLocalSelectedTasks((prev) =>
                              prev.filter((_, i) => i !== index)
                            );
                          }}
                        >
                          <Close />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 2,
              }}
            >
              <Typography variant="h6" color="primary">
                Total: ₹{totalSelectedAmount.toLocaleString()}
              </Typography>
              {autoFillEnabled && Object.keys(amountSuggestions).length > 0 && (
                <Button
                  startIcon={<AutoAwesome />}
                  onClick={handleAutoFillAll}
                  size="small"
                  variant="outlined"
                >
                  Auto-fill Amounts
                </Button>
              )}
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: "#f8f9fa" }}>
        <FormControlLabel
          control={
            <Switch
              checked={autoFillEnabled}
              onChange={(e) => setAutoFillEnabled(e.target.checked)}
              size="small"
            />
          }
          label="Auto-fill amounts"
          sx={{ mr: "auto" }}
        />
        <Button onClick={handleCancel} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={localSelectedTasks.length === 0}
          startIcon={<CheckCircle />}
        >
          Confirm Selection ({localSelectedTasks.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskSelectionDialog;
