import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Chip,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Modal,
  Snackbar,
  Alert,
  IconButton,
  Button,
  TextField,
  Pagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Tooltip,
  Checkbox,
  Toolbar,
  Paper,
  Grid,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
} from "@mui/material";
import {
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Print as PrintIcon,
  GetApp as GetAppIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  ViewModule as ViewModuleIcon,
  ViewSidebar as ViewSidebarIcon,
  PushPin as PushPinIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import ClientSearchBar from "../components/ClientSearchBar";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import "../styles/TaskMasterPage.css";

import API_BASE_URL from "../config"; // adjust path based on file depth



const TaskMasterPage = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [actionStages, setActionStages] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);
  const [services, setServices] = useState([]);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    pending: 0,
    upcoming: 0,
    completed: 0,
    pendingOverdue: 0,
    statusCounts: {},
  });
  const [filters, setFilters] = useState({
    clientCode: "",
    status: "",
    financialYear: "",
    teamMemberId: "",
    serviceName: "",
    fromDate: null,
    toDate: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "assignedAt",
    direction: "desc",
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionType, setActionType] = useState("");
  const [openRemarkDialog, setOpenRemarkDialog] = useState(false);
  const [remark, setRemark] = useState("");
  const [newTeamMemberId, setNewTeamMemberId] = useState("");
  const [selectedCompletionDate, setSelectedCompletionDate] = useState(
    new Date()
  );
  const [openToast, setOpenToast] = useState(false);
  const [toastAction, setToastAction] = useState(null);
  const [openTaskHistoryModal, setOpenTaskHistoryModal] = useState(false);
  const [taskHistory, setTaskHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [filterLayout, setFilterLayout] = useState("horizontal");
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const tableContainerRef = useRef(null);

  // Keyboard navigation handler for table scrolling and other actions
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "f":
            event.preventDefault();
            setFiltersExpanded(!filtersExpanded);
            break;
          case "a":
            event.preventDefault();
            handleSelectAllTasks({ target: { checked: true } });
            break;
          case "d":
            event.preventDefault();
            handleSelectAllTasks({ target: { checked: false } });
            break;
          case "p":
            event.preventDefault();
            window.print();
            break;
          case "h":
            event.preventDefault();
            navigate("/");
            break;
          case "l":
            event.preventDefault();
            setFilterLayout(
              filterLayout === "horizontal" ? "sidebar" : "horizontal"
            );
            break;
          case "Escape":
            event.preventDefault();
            setOpenRemarkDialog(false);
            setOpenTaskHistoryModal(false);
            break;
          default:
            break;
        }
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (tableContainerRef.current && filterLayout === "sidebar") {
          const scrollAmount = event.key === "ArrowLeft" ? -50 : 50;
          tableContainerRef.current.scrollBy({
            left: scrollAmount,
            behavior: "smooth",
          });
        }
      }

      // Bulk actions with Alt key
      if (event.altKey && selectedTasks.length > 0) {
        switch (event.key) {
          case "c":
            event.preventDefault();
            handleBulkAction("Completed");
            break;
          case "r":
            event.preventDefault();
            handleBulkAction("Re-Assign Task");
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate, selectedTasks.length, filtersExpanded, filterLayout]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
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

        const query = new URLSearchParams();
        if (filters.clientCode) query.append("clientCode", filters.clientCode);
        if (filters.status) {
          if (filters.status === "Pending-Overdue") {
            query.append("status", "Pending");
            query.append("isOverdue", "true");
          } else if (filters.status === "Pending") {
            query.append("status", "Pending");
            query.append("isOverdue", "false"); // Explicitly request non-overdue tasks
          } else {
            query.append("status", filters.status);
          }
        }
        if (filters.financialYear)
          query.append("financialYear", filters.financialYear);
        if (filters.teamMemberId)
          query.append("teamMemberId", filters.teamMemberId);
        if (filters.serviceName)
          query.append("serviceName", filters.serviceName);
        if (filters.fromDate)
          query.append("fromDate", filters.fromDate.toISOString());
        if (filters.toDate)
          query.append("toDate", filters.toDate.toISOString());

        query.append("page", currentPage);
        query.append("limit", limit);
        query.append("sortBy", sortConfig.key);
        query.append("sortOrder", sortConfig.direction);

        const statsQuery = new URLSearchParams();
        if (filters.clientCode)
          statsQuery.append("clientCode", filters.clientCode);
        if (filters.financialYear)
          statsQuery.append("financialYear", filters.financialYear);
        if (filters.teamMemberId)
          statsQuery.append("teamMemberId", filters.teamMemberId);
        if (filters.serviceName)
          statsQuery.append("serviceName", filters.serviceName);

        const [
          userRes,
          tasksRes,
          clientsRes,
          teamsRes,
          stagesRes,
          statsRes,
          yearsRes,
          servicesRes,
        ] = await Promise.all([
          fetch("${API_BASE_URL}/api/auth/user", {
            headers: authHeaders,
          }),
          fetch(`${API_BASE_URL}/api/tasks?${query.toString()}`, {
            headers: authHeaders,
          }),
          fetch("${API_BASE_URL}/api/clients", { headers: authHeaders }),
          fetch("${API_BASE_URL}/api/tasks/teams", {
            headers: authHeaders,
          }),
          fetch("${API_BASE_URL}/api/tasks/action-stages", {
            headers: authHeaders,
          }),
          fetch(
            `${API_BASE_URL}/api/tasks/stats?${statsQuery.toString()}`,
            {
              headers: authHeaders,
            }
          ),
          fetch("${API_BASE_URL}/api/tasks/financial-years", {
            headers: authHeaders,
          }),
          fetch("${API_BASE_URL}/api/tasks/services/names", {
            headers: authHeaders,
          }),
        ]);

        const [
          userData,
          tasksData,
          clientsData,
          teamsData,
          stagesData,
          statsData,
          yearsData,
          servicesData,
        ] = await Promise.all([
          userRes.json(),
          tasksRes.json(),
          clientsRes.json(),
          teamsRes.json(),
          stagesRes.json(),
          statsRes.json(),
          yearsRes.json(),
          servicesRes.json(),
        ]);

        if (!userRes.ok)
          throw new Error(userData.message || "Failed to fetch user data");
        if (!tasksRes.ok)
          throw new Error(tasksData.message || "Failed to fetch tasks");
        if (!clientsRes.ok)
          throw new Error(clientsData.message || "Failed to fetch clients");
        if (!teamsRes.ok)
          throw new Error(teamsData.message || "Failed to fetch team members");
        if (!stagesRes.ok)
          throw new Error(
            stagesData.message || "Failed to fetch action stages"
          );
        if (!statsRes.ok)
          throw new Error(statsData.message || "Failed to fetch task stats");
        if (!yearsRes.ok)
          throw new Error(
            yearsData.message || "Failed to fetch financial years"
          );
        if (!servicesRes.ok)
          throw new Error(servicesData.message || "Failed to fetch services");

        setIsAdmin(userData.isAdmin || false);
        setTasks(tasksData.tasks || []);
        setTotalPages(tasksData.pagination?.totalPages || 1);
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setTeamMembers(Array.isArray(teamsData) ? teamsData : []);
        setActionStages(Array.isArray(stagesData) ? stagesData : []);
        setFinancialYears(Array.isArray(yearsData) ? yearsData : []);
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setTaskStats({
          total: statsData.total || 0,
          pending: statsData.pending || 0,
          upcoming: statsData.upcoming || 0,
          completed: statsData.completed || 0,
          pendingOverdue: statsData.pendingOverdue || 0,
          statusCounts: {
            ...statsData.statusCounts,
            Pending: statsData.pending || 0, // Use non-overdue count
            "Pending-Overdue": statsData.pendingOverdue || 0,
          },
        });
        setErrors({});

        // Debug logs
        console.log("Tasks fetched:", tasksData.tasks);
        console.log("Stats fetched:", statsData);
      } catch (err) {
        console.error("Fetch initial data error:", err);
        setErrors({ server: err.message || "Failed to load data" });
        if (
          err.message.includes("expired") ||
          err.message.includes("Invalid token")
        ) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [currentPage, filters, sortConfig, navigate, limit]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    setSelectedTasks([]);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      clientCode: "",
      status: "",
      financialYear: "",
      teamMemberId: "",
      serviceName: "",
      fromDate: null,
      toDate: null,
    });
    setCurrentPage(1);
    setSelectedTasks([]);
  };

  // Handle table sorting
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setSelectedTasks([]);
  };

  // Handle task selection for bulk actions
  const handleTaskSelection = (taskId) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Select all tasks
  const handleSelectAllTasks = (event) => {
    if (event.target.checked) {
      setSelectedTasks(tasks.map((task) => task._id));
    } else {
      setSelectedTasks([]);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedTasks.length === 0) {
      setErrors({ bulk: "No tasks selected" });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "${API_BASE_URL}/api/tasks/bulk-update",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskIds: selectedTasks,
            action,
            completedAt: action === "Completed" ? new Date() : undefined,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to perform bulk action");

      setSuccess(
        `Successfully performed ${action} on ${selectedTasks.length} tasks`
      );
      setTasks(
        tasks.map((t) =>
          selectedTasks.includes(t._id)
            ? {
                ...t,
                status:
                  action === "Completed" && !isAdmin
                    ? "Pending-Admin-Approval"
                    : action,
              }
            : t
        )
      );
      setSelectedTasks([]);
    } catch (err) {
      console.error("Bulk action error:", err);
      setErrors({ bulk: err.message || "Failed to perform bulk action" });
    }
  };

  // Handle individual task actions
  const handleAction = async (task, action) => {
    if (action === "Approve" || action === "Reject") {
      if (!isAdmin) {
        setErrors({ message: "Only admins can approve or reject tasks" });
        return;
      }
      await handleApproveReject(task, action === "Approve");
      return;
    }

    if (task.status === "Deleted") {
      setErrors({ message: "Cannot modify a deleted task" });
      return;
    }

    const isBackdated =
      action === "Completed" &&
      selectedCompletionDate < new Date(new Date().setHours(0, 0, 0, 0));

    const isStatusChangeFromCompleted =
      task.status === "Completed" &&
      action !== "Completed" &&
      action !== "Re-Assign Task";

    const isUpcomingTask = task.status === "Upcoming";

    if (
      action === "Deleted" ||
      (isBackdated && !isAdmin) ||
      (isStatusChangeFromCompleted && !isAdmin) ||
      isUpcomingTask
    ) {
      setToastAction({ task, action });
      setOpenToast(true);
    } else {
      setSelectedTask(task);
      setActionType(action);
      setRemark("");
      setNewTeamMemberId("");
      setSelectedCompletionDate(new Date());
      setOpenRemarkDialog(true);
    }
  };

  // Confirm restricted action
  const handleToastConfirm = () => {
    if (toastAction) {
      const { task, action } = toastAction;
      setSelectedTask(task);
      setActionType(action);
      setRemark("");
      setNewTeamMemberId("");
      setSelectedCompletionDate(new Date());
      setOpenRemarkDialog(true);
    }
    setOpenToast(false);
    setToastAction(null);
  };

  // Close toast
  const handleToastClose = () => {
    setOpenToast(false);
    setToastAction(null);
  };

  // Submit task action with remark
  const handleRemarkSubmit = async () => {
    if (!selectedTask || !actionType) return;

    try {
      const isBackdated =
        actionType === "Completed" &&
        selectedCompletionDate < new Date(new Date().setHours(0, 0, 0, 0));

      // Handle deletion separately using DELETE endpoint
      if (actionType === "Deleted") {
        const deleteResponse = await fetch(
          `${API_BASE_URL}/api/tasks/${selectedTask._id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const deleteData = await deleteResponse.json();
        if (!deleteResponse.ok)
          throw new Error(deleteData.message || "Failed to delete task");

        // Update task in local state
        setTasks(
          tasks.map((t) =>
            t._id === selectedTask._id ? { ...t, ...deleteData.task } : t
          )
        );

        setSuccess(deleteData.message || "Task deleted successfully!");

        // Try to fetch updated task history
        try {
          await fetchTaskHistory(selectedTask._id);
        } catch (historyErr) {
          console.warn(
            "Failed to fetch task history after deletion:",
            historyErr
          );
          setErrors({ message: "Task deleted, but failed to load history" });
        }
      } else {
        // Handle other actions using PUT endpoint
        const isStatusChangeFromCompleted =
          selectedTask.status === "Completed" &&
          actionType !== "Completed" &&
          actionType !== "Re-Assign Task";

        const taskPayload = {
          status:
            actionType === "Re-Assign Task"
              ? selectedTask.status
              : (isBackdated && !isAdmin) ||
                (isStatusChangeFromCompleted && !isAdmin)
              ? "Pending-Admin-Approval"
              : actionType,
          teamMemberId:
            actionType === "Re-Assign Task"
              ? newTeamMemberId
              : selectedTask.teamMemberId,
          completedAt:
            actionType === "Completed"
              ? selectedCompletionDate
              : selectedTask.completedAt,
          pendingAction:
            isBackdated && !isAdmin
              ? "complete"
              : isStatusChangeFromCompleted && !isAdmin
              ? "status_change"
              : undefined,
          remark: remark.trim(),
        };

        const taskResponse = await fetch(
          `${API_BASE_URL}/api/tasks/${selectedTask._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(taskPayload),
          }
        );

        const taskData = await taskResponse.json();
        if (!taskResponse.ok)
          throw new Error(taskData.message || "Failed to update task");

        // Note: No need to create separate history entry as the PUT endpoint handles it when remark is provided

        setSuccess(
          `Task ${
            (isBackdated && !isAdmin) ||
            (isStatusChangeFromCompleted && !isAdmin)
              ? "submitted for admin approval"
              : actionType.toLowerCase()
          } successfully!`
        );
        setTasks(
          tasks.map((t) =>
            t._id === selectedTask._id ? { ...t, ...taskData.task } : t
          )
        );
        try {
          await fetchTaskHistory(selectedTask._id);
        } catch (historyErr) {
          console.warn(
            "Failed to fetch task history after update:",
            historyErr
          );
          setErrors({ message: "Task updated, but failed to load history" });
        }
      }
    } catch (err) {
      console.error("Task action error:", err);
      setErrors({ message: err.message || "Server error" });
    }
    setOpenRemarkDialog(false);
  };

  // Approve or reject task
  const handleApproveReject = async (task, approve) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tasks/approve/${task._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            approve,
            pendingAction: task.pendingAction || "complete",
          }),
        }
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to approve/reject task");

      setSuccess(
        `Task ${
          approve
            ? task.pendingAction === "delete"
              ? "deleted"
              : "approved"
            : "rejected"
        } successfully!`
      );
      setTasks(
        tasks.map((t) => (t._id === task._id ? { ...t, ...data.task } : t))
      );
    } catch (err) {
      console.error("Approve/Reject error:", err);
      setErrors({ message: err.message || "Failed to approve/reject task" });
    }
  };

  // Export task history as PDF
  const handleExportHistory = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text(`Task History - ${selectedTask?.clientCode}`, 20, 20);

    let y = 30;
    taskHistory.forEach((entry, index) => {
      const client = clients.find(
        (c) => c.clientCode === selectedTask.clientCode
      );
      const userName = entry.userId?.username || "Unknown";
      const actionText =
        entry.type === "status_change"
          ? entry.value === "Completed"
            ? `Task Completed`
            : `Status: ${entry.value}${
                entry.pendingApproval
                  ? ` (Pending ${
                      entry.pendingAction === "delete"
                        ? "Deletion"
                        : "Completion"
                    })`
                  : ""
              }`
          : entry.type === "reassignment"
          ? `Re-assigned to: ${
              teamMembers.find((t) => t.teamMemberId === entry.value)?.name ||
              entry.value
            }`
          : entry.type === "admin_action"
          ? `Admin Action: ${entry.value}`
          : `Created`;

      doc.text(
        `${index + 1}. Client: ${selectedTask.clientCode} | Name: ${
          client?.clientName || "Unknown"
        } | Period: ${
          selectedTask.servicePeriod || "N/A"
        } | User: ${userName} | Action: ${actionText} | Remark: ${
          entry.remark || "N/A"
        } | Timestamp: ${format(
          new Date(entry.timestamp),
          "dd-MMM-yyyy HH:mm:ss"
        )}`,
        20,
        y
      );
      y += 10;
    });

    doc.save(`task_history_${selectedTask?.clientCode}.pdf`);
  };

  // Change page
  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
    setSelectedTasks([]);
  };

  // View task history
  const handleViewTaskHistory = (task) => {
    setSelectedTask(task);
    fetchTaskHistory(task._id);
    setOpenTaskHistoryModal(true);
  };

  // Fetch task history
  const fetchTaskHistory = async (taskId) => {
    setIsHistoryLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tasks/task-history/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch task history");
      }

      setTaskHistory(data);
    } catch (err) {
      console.error("Fetch task history error:", err.message);
      setErrors({ message: err.message || "Failed to load task history" });
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Get status style for chips
  const getStatusStyle = (task) => {
    const statusColors = {
      "Pending-Overdue": "#D32F2F",
      Upcoming: "#4CAF50",
      Pending: "#0288D1",
      Completed: "#388E3C",
      Deleted: "#757575",
      "Pending-Client": "#FBC02D",
      "Pending-Admin-Approval": "#FF9800",
      "In Progress": "#2196F3",
      "Pending for Review": "#AB47BC",
    };

    // Determine display status based on filter and overdue status
    let displayStatus = task.status;
    if (
      (filters.status === "" || filters.status === "Pending-Overdue") &&
      task.status === "Pending" &&
      task.overdue
    ) {
      displayStatus = "Pending-Overdue";
    } else if (
      filters.status === "Pending" &&
      task.status === "Pending" &&
      task.overdue
    ) {
      // Skip overdue tasks when filtering for "Pending"
      return null; // Return null to skip rendering this task
    }

    const stage = actionStages.find((s) => s.name === task.status);
    return {
      backgroundColor: statusColors[displayStatus] || stage?.color || "#757575",
      color: displayStatus === "Pending-Client" ? "black" : "white",
      fontWeight: "bold",
      padding: "4px 8px",
      borderRadius: "4px",
    };
  };

  // Get client info
  const getClientInfo = (clientCode) => {
    return clients.find((c) => c.clientCode === clientCode) || {};
  };

  // Get priority score (placeholder for AI integration)
  const getPriorityScore = (task) => {
    return task.priority || Math.floor(Math.random() * 100); // Mock score
  };

  // Status options for filter dropdown
  const statusOptions = useMemo(() => {
    const coreStatuses = [
      "Pending",
      "Pending-Overdue",
      "Upcoming",
      "Completed",
      "Deleted",
      "Pending-Client",
    ];
    const customStatuses = Array.from(
      new Set(
        actionStages
          .map((stage) => stage.name)
          .filter(
            (name) =>
              ![
                "Completed",
                "Deleted",
                "Pending-Admin-Approval",
                "Pending-Client",
              ].includes(name)
          )
      )
    );
    const allStatuses = [...coreStatuses, ...customStatuses];
    console.log("Generated statusOptions:", allStatuses);
    return allStatuses;
  }, [actionStages]);

  // Render audit trail table
  const auditTrailDisplay = useMemo(() => {
    if (!selectedTask) return null;

    const client = clients.find(
      (c) => c.clientCode === selectedTask.clientCode
    );

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Client Code</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Client Name</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Service Period</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>User</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Action</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Remark</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {taskHistory.map((entry, index) => {
              const userName = entry.userId?.username || "Unknown";
              const actionText =
                entry.type === "status_change"
                  ? entry.value === "Completed"
                    ? `Task Completed`
                    : `Status: ${entry.value}${
                        entry.pendingApproval
                          ? ` (Pending ${
                              entry.pendingAction === "delete"
                                ? "Deletion"
                                : "Completion"
                            })`
                          : ""
                      }`
                  : entry.type === "reassignment"
                  ? `Re-assigned to: ${
                      teamMembers.find((t) => t.teamMemberId === entry.value)
                        ?.name || entry.value
                    }`
                  : entry.type === "admin_action"
                  ? `Admin Action: ${entry.value}`
                  : `Created`;

              return (
                <TableRow key={`${entry._id}-${index}`}>
                  <TableCell>{selectedTask.clientCode}</TableCell>
                  <TableCell>{client?.clientName || "Unknown"}</TableCell>
                  <TableCell>{selectedTask.servicePeriod || "N/A"}</TableCell>
                  <TableCell>{userName}</TableCell>
                  <TableCell>{actionText}</TableCell>
                  <TableCell>{entry.remark || "N/A"}</TableCell>
                  <TableCell>
                    {format(new Date(entry.timestamp), "dd-MMM-yyyy HH:mm:ss")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [taskHistory, teamMembers, selectedTask, clients]);

  // Horizontal filter component
  const HorizontalFilters = () => (
    <Paper
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        p: 2,
        mb: 2,
        borderRadius: 2,
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      }}
    >
      <Collapse in={filtersExpanded}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2.5}>
            <ClientSearchBar
              onSelect={(client) =>
                handleFilterChange(
                  "clientCode",
                  client ? client.clientCode : ""
                )
              }
              clients={clients}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                {statusOptions.map((status, index) => (
                  <MenuItem key={`${status}-${index}`} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Service</InputLabel>
              <Select
                value={filters.serviceName}
                onChange={(e) =>
                  handleFilterChange("serviceName", e.target.value)
                }
                label="Service"
              >
                <MenuItem value="">All</MenuItem>
                {services.map((service) => (
                  <MenuItem key={service} value={service}>
                    {service}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Financial Year</InputLabel>
              <Select
                value={filters.financialYear}
                onChange={(e) =>
                  handleFilterChange("financialYear", e.target.value)
                }
                label="Financial Year"
              >
                <MenuItem value="">All</MenuItem>
                {financialYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Team Member</InputLabel>
              <Select
                value={filters.teamMemberId}
                onChange={(e) =>
                  handleFilterChange("teamMemberId", e.target.value)
                }
                label="Team Member"
              >
                <MenuItem value="">All</MenuItem>
                {teamMembers.map((member) => (
                  <MenuItem
                    key={member.teamMemberId}
                    value={member.teamMemberId}
                  >
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1.5}>
            <DatePicker
              label="From Date"
              value={filters.fromDate}
              onChange={(date) => handleFilterChange("fromDate", date)}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
          </Grid>
          <Grid item xs={12} md={1.5}>
            <DatePicker
              label="To Date"
              value={filters.toDate}
              onChange={(date) => handleFilterChange("toDate", date)}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
          </Grid>
        </Grid>

        {/* Active Filters */}
        <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
          {filters.clientCode && (
            <Chip
              label={`Client: ${filters.clientCode}`}
              onDelete={() => handleFilterChange("clientCode", "")}
              size="small"
              color="primary"
            />
          )}
          {filters.status && (
            <Chip
              label={`Status: ${filters.status}`}
              onDelete={() => handleFilterChange("status", "")}
              size="small"
              color="primary"
            />
          )}
          {filters.serviceName && (
            <Chip
              label={`Service: ${filters.serviceName}`}
              onDelete={() => handleFilterChange("serviceName", "")}
              size="small"
              color="primary"
            />
          )}
          {filters.financialYear && (
            <Chip
              label={`FY: ${filters.financialYear}`}
              onDelete={() => handleFilterChange("financialYear", "")}
              size="small"
              color="primary"
            />
          )}
          {filters.teamMemberId && (
            <Chip
              label={`Team: ${
                teamMembers.find((t) => t.teamMemberId === filters.teamMemberId)
                  ?.name || filters.teamMemberId
              }`}
              onDelete={() => handleFilterChange("teamMemberId", "")}
              size="small"
              color="primary"
            />
          )}
          {(filters.clientCode ||
            filters.status ||
            filters.serviceName ||
            filters.financialYear ||
            filters.teamMemberId ||
            filters.fromDate ||
            filters.toDate) && (
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
      </Collapse>
    </Paper>
  );

  // Sidebar filter component
  const SidebarFilters = () => (
    <Card
      sx={{
        width: 300,
        maxHeight: "80vh",
        overflow: "auto",
        position: "sticky",
        top: 20,
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <FilterListIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Filters
          </Typography>
        </Box>

        {errors.message && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.message}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Active Filters */}
        <Box sx={{ mb: 2, minHeight: 40 }}>
          {filters.clientCode && (
            <Chip
              label={`Client: ${filters.clientCode}`}
              onDelete={() => handleFilterChange("clientCode", "")}
              sx={{ mr: 1, mb: 1 }}
              size="small"
            />
          )}
          {filters.status && (
            <Chip
              label={`Status: ${filters.status}`}
              onDelete={() => handleFilterChange("status", "")}
              sx={{ mr: 1, mb: 1 }}
              size="small"
            />
          )}
          {filters.serviceName && (
            <Chip
              label={`Service: ${filters.serviceName}`}
              onDelete={() => handleFilterChange("serviceName", "")}
              sx={{ mr: 1, mb: 1 }}
              size="small"
            />
          )}
          {filters.financialYear && (
            <Chip
              label={`FY: ${filters.financialYear}`}
              onDelete={() => handleFilterChange("financialYear", "")}
              sx={{ mr: 1, mb: 1 }}
              size="small"
            />
          )}
          {filters.teamMemberId && (
            <Chip
              label={`Team: ${
                teamMembers.find((t) => t.teamMemberId === filters.teamMemberId)
                  ?.name || filters.teamMemberId
              }`}
              onDelete={() => handleFilterChange("teamMemberId", "")}
              sx={{ mr: 1, mb: 1 }}
              size="small"
            />
          )}
        </Box>

        {/* Filter Controls */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <ClientSearchBar
            onSelect={(client) =>
              handleFilterChange("clientCode", client ? client.clientCode : "")
            }
            clients={clients}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              {statusOptions.map((status, index) => (
                <MenuItem key={`${status}-${index}`} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Service</InputLabel>
            <Select
              value={filters.serviceName}
              onChange={(e) =>
                handleFilterChange("serviceName", e.target.value)
              }
              label="Service"
            >
              <MenuItem value="">All</MenuItem>
              {services.map((service) => (
                <MenuItem key={service} value={service}>
                  {service}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Financial Year</InputLabel>
            <Select
              value={filters.financialYear}
              onChange={(e) =>
                handleFilterChange("financialYear", e.target.value)
              }
              label="Financial Year"
            >
              <MenuItem value="">All</MenuItem>
              {financialYears.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Team Member</InputLabel>
            <Select
              value={filters.teamMemberId}
              onChange={(e) =>
                handleFilterChange("teamMemberId", e.target.value)
              }
              label="Team Member"
            >
              <MenuItem value="">All</MenuItem>
              {teamMembers.map((member) => (
                <MenuItem key={member.teamMemberId} value={member.teamMemberId}>
                  {member.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DatePicker
            label="From Date"
            value={filters.fromDate}
            onChange={(date) => handleFilterChange("fromDate", date)}
            renderInput={(params) => <TextField {...params} size="small" />}
          />

          <DatePicker
            label="To Date"
            value={filters.toDate}
            onChange={(date) => handleFilterChange("toDate", date)}
            renderInput={(params) => <TextField {...params} size="small" />}
          />

          <Button
            variant="outlined"
            onClick={handleClearFilters}
            fullWidth
            startIcon={<RefreshIcon />}
          >
            Clear All Filters
          </Button>
        </Box>

        {/* Keyboard Shortcuts Info */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: "grey.50",
            border: "1px solid",
            borderColor: "grey.200",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            ⌨️ Keyboard Shortcuts:
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="caption">
              <kbd>Ctrl+F</kbd> Toggle Filters
            </Typography>
            <Typography variant="caption">
              <kbd>Ctrl+L</kbd> Toggle Layout
            </Typography>
            <Typography variant="caption">
              <kbd>Ctrl+A</kbd> Select All
            </Typography>
            <Typography variant="caption">
              <kbd>Alt+C</kbd> Complete Selected
            </Typography>
            <Typography variant="caption">
              <kbd>Ctrl+P</kbd> Print
            </Typography>
            <Typography variant="caption">
              <kbd>←/→</kbd> Scroll Table (Sidebar Mode)
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Render main content
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth={false} sx={{ py: 3 }}>
        {/* Header with Layout Toggle */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            📋 Task Master
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <ToggleButtonGroup
              value={filterLayout}
              exclusive
              onChange={(e, newLayout) =>
                newLayout && setFilterLayout(newLayout)
              }
              size="small"
            >
              <ToggleButton value="horizontal">
                <ViewModuleIcon sx={{ mr: 1 }} />
                Horizontal
              </ToggleButton>
              <ToggleButton value="sidebar">
                <ViewSidebarIcon sx={{ mr: 1 }} />
                Sidebar
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              startIcon={
                filterLayout === "horizontal" ? (
                  <PushPinIcon />
                ) : (
                  <FilterListIcon />
                )
              }
            >
              {filterLayout === "horizontal"
                ? filtersExpanded
                  ? "Pin Filters"
                  : "Unpin Filters"
                : (filtersExpanded ? "Hide" : "Show") + " Filters"}
            </Button>
            <Button component={Link} to="/dashboard" variant="outlined">
              Dashboard
            </Button>
            <Button component={Link} to="/tasks" variant="outlined">
              Task Management
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.print()}
              startIcon={<PrintIcon />}
            >
              Print
            </Button>
          </Box>
        </Box>

        {/* Task Statistics */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              📊 Task Statistics
            </Typography>
            <Grid container spacing={2}>
              {statusOptions.map((status, index) => (
                <Grid item xs={6} md={3} key={`${status}-${index}`}>
                  <Box
                    sx={{
                      textAlign: "center",
                      p: 2,
                      bgcolor: "grey.50",
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        color:
                          status === "Pending-Overdue"
                            ? "error.main"
                            : status === "Completed"
                            ? "success.main"
                            : status === "Upcoming"
                            ? "success.main"
                            : status === "Pending"
                            ? "primary.main"
                            : status === "Deleted"
                            ? "text.secondary"
                            : status === "Pending-Client"
                            ? "warning.main"
                            : status === "In Progress"
                            ? "info.main"
                            : "secondary.main",
                      }}
                    >
                      {status === "Pending"
                        ? taskStats.pending || 0
                        : status === "Pending-Overdue"
                        ? taskStats.pendingOverdue || 0
                        : taskStats.statusCounts[status] || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {status === "Pending" ? "Pending (Non-Overdue)" : status}
                    </Typography>
                  </Box>
                </Grid>
              ))}
              <Grid item xs={6} md={3}>
                <Box
                  sx={{
                    textAlign: "center",
                    p: 2,
                    bgcolor: "grey.50",
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 600, color: "primary.main" }}
                  >
                    {taskStats.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Tasks
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Filter Layout */}
        {filterLayout === "horizontal" ? (
          <>
            <HorizontalFilters />
            {/* Main Content - Full Width */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    {/* Error and Success Messages */}
                    {errors.message && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {errors.message}
                      </Alert>
                    )}
                    {success && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        {success}
                      </Alert>
                    )}

                    {/* Bulk Action Toolbar */}
                    {selectedTasks.length > 0 && (
                      <Toolbar
                        sx={{
                          bgcolor: "primary.main",
                          color: "white",
                          borderRadius: 1,
                          mb: 2,
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ flex: 1 }}>
                          {selectedTasks.length} task(s) selected
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => handleBulkAction("Completed")}
                          sx={{ color: "white", borderColor: "white", mr: 1 }}
                        >
                          Complete Selected
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleBulkAction("Re-Assign Task")}
                          sx={{ color: "white", borderColor: "white" }}
                        >
                          Re-assign Selected
                        </Button>
                      </Toolbar>
                    )}

                    {/* Loading State */}
                    {isLoading ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          py: 4,
                        }}
                      >
                        <CircularProgress />
                      </Box>
                    ) : (
                      <>
                        {/* Tasks Table */}
                        <TableContainer
                          component={Paper}
                          sx={{ maxHeight: "70vh", overflow: "auto" }}
                        >
                          <Table stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    checked={
                                      selectedTasks.length === tasks.length &&
                                      tasks.length > 0
                                    }
                                    onChange={handleSelectAllTasks}
                                  />
                                </TableCell>
                                <TableCell>SL</TableCell>
                                <TableCell>
                                  <Button
                                    variant="text"
                                    onClick={() => handleSort("clientCode")}
                                    endIcon={
                                      sortConfig.key === "clientCode" ? (
                                        sortConfig.direction === "asc" ? (
                                          <ArrowUpwardIcon />
                                        ) : (
                                          <ArrowDownwardIcon />
                                        )
                                      ) : null
                                    }
                                  >
                                    Client Details
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="text"
                                    onClick={() => handleSort("serviceName")}
                                    endIcon={
                                      sortConfig.key === "serviceName" ? (
                                        sortConfig.direction === "asc" ? (
                                          <ArrowUpwardIcon />
                                        ) : (
                                          <ArrowDownwardIcon />
                                        )
                                      ) : null
                                    }
                                  >
                                    Service Name
                                  </Button>
                                </TableCell>
                                <TableCell>Team Member</TableCell>
                                <TableCell>
                                  <Button
                                    variant="text"
                                    onClick={() => handleSort("assignedAt")}
                                    endIcon={
                                      sortConfig.key === "assignedAt" ? (
                                        sortConfig.direction === "asc" ? (
                                          <ArrowUpwardIcon />
                                        ) : (
                                          <ArrowDownwardIcon />
                                        )
                                      ) : null
                                    }
                                  >
                                    Assigned At
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="text"
                                    onClick={() => handleSort("dueDate")}
                                    endIcon={
                                      sortConfig.key === "dueDate" ? (
                                        sortConfig.direction === "asc" ? (
                                          <ArrowUpwardIcon />
                                        ) : (
                                          <ArrowDownwardIcon />
                                        )
                                      ) : null
                                    }
                                  >
                                    Due Date
                                  </Button>
                                </TableCell>
                                <TableCell>Service Period</TableCell>
                                <TableCell>
                                  <Button
                                    variant="text"
                                    onClick={() => handleSort("status")}
                                    endIcon={
                                      sortConfig.key === "status" ? (
                                        sortConfig.direction === "asc" ? (
                                          <ArrowUpwardIcon />
                                        ) : (
                                          <ArrowDownwardIcon />
                                        )
                                      ) : null
                                    }
                                  >
                                    Status
                                  </Button>
                                </TableCell>
                                <TableCell>Priority</TableCell>
                                <TableCell>Action</TableCell>
                                <TableCell>History</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {tasks.map((task, index) => {
                                const currentDate = new Date();
                                const isOverdue =
                                  task.dueDate &&
                                  new Date(task.dueDate) < currentDate &&
                                  task.status === "Pending";
                                const teamMember = teamMembers.find(
                                  (t) => t.teamMemberId === task.teamMemberId
                                );
                                const clientInfo = getClientInfo(
                                  task.clientCode
                                );

                                return (
                                  <TableRow key={task._id} hover>
                                    <TableCell padding="checkbox">
                                      <Checkbox
                                        checked={selectedTasks.includes(
                                          task._id
                                        )}
                                        onChange={() =>
                                          handleTaskSelection(task._id)
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {(currentPage - 1) * limit + index + 1}
                                    </TableCell>
                                    <TableCell>
                                      <Tooltip
                                        title={`${task.clientCode} – ${
                                          clientInfo.clientName || "Unknown"
                                        } ${
                                          clientInfo.firmName
                                            ? `(${clientInfo.firmName})`
                                            : ""
                                        }`}
                                      >
                                        <Box>
                                          <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600 }}
                                          >
                                            {task.clientCode} –{" "}
                                            {clientInfo.clientName || "Unknown"}
                                          </Typography>
                                          {clientInfo.firmName && (
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              {clientInfo.firmName}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Tooltip>
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
                                      {teamMember?.name || task.teamMemberId}
                                    </TableCell>
                                    <TableCell>
                                      {format(
                                        new Date(task.assignedAt),
                                        "dd-MMM-yyyy"
                                      )}
                                    </TableCell>
                                    <TableCell
                                      sx={{
                                        color: isOverdue
                                          ? "error.main"
                                          : "text.primary",
                                        fontWeight: isOverdue ? 600 : 400,
                                      }}
                                    >
                                      {format(
                                        new Date(task.dueDate),
                                        "dd-MMM-yyyy"
                                      )}
                                    </TableCell>
                                    <TableCell>{task.servicePeriod}</TableCell>
                                    <TableCell>
                                      <Chip
                                        label={
                                          isOverdue
                                            ? "Pending-Overdue"
                                            : task.status
                                        }
                                        sx={getStatusStyle(task)}
                                        size="small"
                                      />
                                      {task.status ===
                                        "Pending-Admin-Approval" &&
                                        isAdmin && (
                                          <Box
                                            sx={{
                                              mt: 1,
                                              display: "flex",
                                              gap: 1,
                                            }}
                                          >
                                            <Button
                                              variant="contained"
                                              color="success"
                                              size="small"
                                              onClick={() =>
                                                handleApproveReject(task, true)
                                              }
                                            >
                                              Approve
                                            </Button>
                                            <Button
                                              variant="contained"
                                              color="error"
                                              size="small"
                                              onClick={() =>
                                                handleApproveReject(task, false)
                                              }
                                            >
                                              Reject
                                            </Button>
                                          </Box>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                      {getPriorityScore(task)}
                                    </TableCell>
                                    <TableCell>
                                      <Tooltip
                                        title={
                                          task.status === "Deleted"
                                            ? "Deleted tasks cannot be modified"
                                            : ""
                                        }
                                      >
                                        <span>
                                          <FormControl
                                            size="small"
                                            sx={{ minWidth: 140 }}
                                            disabled={task.status === "Deleted"}
                                          >
                                            <Select
                                              value=""
                                              displayEmpty
                                              onChange={(e) =>
                                                handleAction(
                                                  task,
                                                  e.target.value
                                                )
                                              }
                                            >
                                              <MenuItem value="" disabled>
                                                Select Action
                                              </MenuItem>
                                              <MenuItem value="Completed">
                                                Complete
                                              </MenuItem>
                                              <MenuItem value="Re-Assign Task">
                                                Re-Assign
                                              </MenuItem>
                                              <MenuItem value="Deleted">
                                                Delete
                                              </MenuItem>
                                              {task.status ===
                                                "Pending-Admin-Approval" &&
                                                isAdmin && [
                                                  <MenuItem
                                                    key="approve"
                                                    value="Approve"
                                                  >
                                                    Approve
                                                  </MenuItem>,
                                                  <MenuItem
                                                    key="reject"
                                                    value="Reject"
                                                  >
                                                    Reject
                                                  </MenuItem>,
                                                ]}
                                              {task.status !==
                                                "Pending-Admin-Approval" &&
                                                actionStages
                                                  .filter(
                                                    (stage) =>
                                                      stage.name !==
                                                        task.status &&
                                                      ![
                                                        "Completed",
                                                        "Deleted",
                                                      ].includes(stage.name)
                                                  )
                                                  .map((stage) => (
                                                    <MenuItem
                                                      key={stage.name}
                                                      value={stage.name}
                                                    >
                                                      {stage.name}
                                                    </MenuItem>
                                                  ))}
                                            </Select>
                                          </FormControl>
                                        </span>
                                      </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                      <Tooltip title="View Task History">
                                        <IconButton
                                          onClick={() =>
                                            handleViewTaskHistory(task)
                                          }
                                          size="small"
                                        >
                                          <HistoryIcon />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              mt: 3,
                            }}
                          >
                            <Pagination
                              count={totalPages}
                              page={currentPage}
                              onChange={handlePageChange}
                              color="primary"
                              size="large"
                            />
                          </Box>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        ) : (
          /* Sidebar Layout */
          <Box sx={{ display: "flex", flexDirection: "row", gap: 3 }}>
            {/* Filter Sidebar */}
            {filtersExpanded && (
              <Box sx={{ width: 300, flexShrink: 0 }}>
                <SidebarFilters />
              </Box>
            )}

            {/* Main Content Area */}
            <Box sx={{ flexGrow: 1, overflowX: "auto" }}>
              <Card>
                <CardContent>
                  {/* Error and Success Messages */}
                  {errors.message && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {errors.message}
                    </Alert>
                  )}
                  {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      {success}
                    </Alert>
                  )}

                  {/* Bulk Action Toolbar */}
                  {selectedTasks.length > 0 && (
                    <Toolbar
                      sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ flex: 1 }}>
                        {selectedTasks.length} task(s) selected
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => handleBulkAction("Completed")}
                        sx={{ color: "white", borderColor: "white", mr: 1 }}
                      >
                        Complete Selected
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => handleBulkAction("Re-Assign Task")}
                        sx={{ color: "white", borderColor: "white" }}
                      >
                        Re-assign Selected
                      </Button>
                    </Toolbar>
                  )}

                  {/* Loading State */}
                  {isLoading ? (
                    <Box
                      sx={{ display: "flex", justifyContent: "center", py: 4 }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      {/* Tasks Table */}
                      <TableContainer
                        component={Paper}
                        sx={{
                          maxHeight: "70vh",
                          overflowX: "auto",
                          minWidth: 1200,
                        }}
                        ref={tableContainerRef}
                      >
                        <Table stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={
                                    selectedTasks.length === tasks.length &&
                                    tasks.length > 0
                                  }
                                  onChange={handleSelectAllTasks}
                                />
                              </TableCell>
                              <TableCell>SL</TableCell>
                              <TableCell>
                                <Button
                                  variant="text"
                                  onClick={() => handleSort("clientCode")}
                                  endIcon={
                                    sortConfig.key === "clientCode" ? (
                                      sortConfig.direction === "asc" ? (
                                        <ArrowUpwardIcon />
                                      ) : (
                                        <ArrowDownwardIcon />
                                      )
                                    ) : null
                                  }
                                >
                                  Client Details
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="text"
                                  onClick={() => handleSort("serviceName")}
                                  endIcon={
                                    sortConfig.key === "serviceName" ? (
                                      sortConfig.direction === "asc" ? (
                                        <ArrowUpwardIcon />
                                      ) : (
                                        <ArrowDownwardIcon />
                                      )
                                    ) : null
                                  }
                                >
                                  Service Name
                                </Button>
                              </TableCell>
                              <TableCell>Team Member</TableCell>
                              <TableCell>
                                <Button
                                  variant="text"
                                  onClick={() => handleSort("assignedAt")}
                                  endIcon={
                                    sortConfig.key === "assignedAt" ? (
                                      sortConfig.direction === "asc" ? (
                                        <ArrowUpwardIcon />
                                      ) : (
                                        <ArrowDownwardIcon />
                                      )
                                    ) : null
                                  }
                                >
                                  Assigned At
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="text"
                                  onClick={() => handleSort("dueDate")}
                                  endIcon={
                                    sortConfig.key === "dueDate" ? (
                                      sortConfig.direction === "asc" ? (
                                        <ArrowUpwardIcon />
                                      ) : (
                                        <ArrowDownwardIcon />
                                      )
                                    ) : null
                                  }
                                >
                                  Due Date
                                </Button>
                              </TableCell>
                              <TableCell>Service Period</TableCell>
                              <TableCell>
                                <Button
                                  variant="text"
                                  onClick={() => handleSort("status")}
                                  endIcon={
                                    sortConfig.key === "status" ? (
                                      sortConfig.direction === "asc" ? (
                                        <ArrowUpwardIcon />
                                      ) : (
                                        <ArrowDownwardIcon />
                                      )
                                    ) : null
                                  }
                                >
                                  Status
                                </Button>
                              </TableCell>
                              <TableCell>Priority</TableCell>
                              <TableCell>Action</TableCell>
                              <TableCell>History</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {tasks.map((task, index) => {
                              const currentDate = new Date();
                              const isOverdue =
                                task.dueDate &&
                                new Date(task.dueDate) < currentDate &&
                                task.status === "Pending";
                              const teamMember = teamMembers.find(
                                (t) => t.teamMemberId === task.teamMemberId
                              );
                              const clientInfo = getClientInfo(task.clientCode);

                              return (
                                <TableRow key={task._id} hover>
                                  <TableCell padding="checkbox">
                                    <Checkbox
                                      checked={selectedTasks.includes(task._id)}
                                      onChange={() =>
                                        handleTaskSelection(task._id)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {(currentPage - 1) * limit + index + 1}
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip
                                      title={`${task.clientCode} – ${
                                        clientInfo.clientName || "Unknown"
                                      } ${
                                        clientInfo.firmName
                                          ? `(${clientInfo.firmName})`
                                          : ""
                                      }`}
                                    >
                                      <Box>
                                        <Typography
                                          variant="body2"
                                          sx={{ fontWeight: 600 }}
                                        >
                                          {task.clientCode} –{" "}
                                          {clientInfo.clientName || "Unknown"}
                                        </Typography>
                                        {clientInfo.firmName && (
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            {clientInfo.firmName}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Tooltip>
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
                                    {teamMember?.name || task.teamMemberId}
                                  </TableCell>
                                  <TableCell>
                                    {format(
                                      new Date(task.assignedAt),
                                      "dd-MMM-yyyy"
                                    )}
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      color: isOverdue
                                        ? "error.main"
                                        : "text.primary",
                                      fontWeight: isOverdue ? 600 : 400,
                                    }}
                                  >
                                    {format(
                                      new Date(task.dueDate),
                                      "dd-MMM-yyyy"
                                    )}
                                  </TableCell>
                                  <TableCell>{task.servicePeriod}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={
                                        isOverdue
                                          ? "Pending-Overdue"
                                          : task.status
                                      }
                                      sx={getStatusStyle(task)}
                                      size="small"
                                    />
                                    {task.status === "Pending-Admin-Approval" &&
                                      isAdmin && (
                                        <Box
                                          sx={{
                                            mt: 1,
                                            display: "flex",
                                            gap: 1,
                                          }}
                                        >
                                          <Button
                                            variant="contained"
                                            color="success"
                                            size="small"
                                            onClick={() =>
                                              handleApproveReject(task, true)
                                            }
                                          >
                                            Approve
                                          </Button>
                                          <Button
                                            variant="contained"
                                            color="error"
                                            size="small"
                                            onClick={() =>
                                              handleApproveReject(task, false)
                                            }
                                          >
                                            Reject
                                          </Button>
                                        </Box>
                                      )}
                                  </TableCell>
                                  <TableCell>
                                    {getPriorityScore(task)}
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip
                                      title={
                                        task.status === "Deleted"
                                          ? "Deleted tasks cannot be modified"
                                          : ""
                                      }
                                    >
                                      <span>
                                        <FormControl
                                          size="small"
                                          sx={{ minWidth: 140 }}
                                          disabled={task.status === "Deleted"}
                                        >
                                          <Select
                                            value=""
                                            displayEmpty
                                            onChange={(e) =>
                                              handleAction(task, e.target.value)
                                            }
                                          >
                                            <MenuItem value="" disabled>
                                              Select Action
                                            </MenuItem>
                                            <MenuItem value="Completed">
                                              Complete
                                            </MenuItem>
                                            <MenuItem value="Re-Assign Task">
                                              Re-Assign
                                            </MenuItem>
                                            <MenuItem value="Deleted">
                                              Delete
                                            </MenuItem>
                                            {task.status ===
                                              "Pending-Admin-Approval" &&
                                              isAdmin && [
                                                <MenuItem
                                                  key="approve"
                                                  value="Approve"
                                                >
                                                  Approve
                                                </MenuItem>,
                                                <MenuItem
                                                  key="reject"
                                                  value="Reject"
                                                >
                                                  Reject
                                                </MenuItem>,
                                              ]}
                                            {task.status !==
                                              "Pending-Admin-Approval" &&
                                              actionStages
                                                .filter(
                                                  (stage) =>
                                                    stage.name !==
                                                      task.status &&
                                                    ![
                                                      "Completed",
                                                      "Deleted",
                                                    ].includes(stage.name)
                                                )
                                                .map((stage) => (
                                                  <MenuItem
                                                    key={stage.name}
                                                    value={stage.name}
                                                  >
                                                    {stage.name}
                                                  </MenuItem>
                                                ))}
                                          </Select>
                                        </FormControl>
                                      </span>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip title="View Task History">
                                      <IconButton
                                        onClick={() =>
                                          handleViewTaskHistory(task)
                                        }
                                        size="small"
                                      >
                                        <HistoryIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            mt: 3,
                          }}
                        >
                          <Pagination
                            count={totalPages}
                            page={currentPage}
                            onChange={handlePageChange}
                            color="primary"
                            size="large"
                          />
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}

        {/* Remark Dialog */}
        <Dialog
          open={openRemarkDialog}
          onClose={() => setOpenRemarkDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {actionType === "Completed"
              ? "Complete Task"
              : actionType === "Re-Assign Task"
              ? "Re-assign Task"
              : actionType === "Deleted"
              ? "Delete Task"
              : `Change Status to ${actionType}`}
          </DialogTitle>
          <DialogContent>
            {actionType === "Completed" && (
              <>
                <Typography sx={{ mb: 2 }}>Select completion date:</Typography>
                <DatePicker
                  label="Completion Date"
                  value={selectedCompletionDate}
                  onChange={(date) => setSelectedCompletionDate(date)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth sx={{ mb: 2 }} />
                  )}
                />
                {selectedCompletionDate < new Date().setHours(0, 0, 0, 0) &&
                  !isAdmin && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      This is a backdated completion and will require admin
                      approval.
                    </Alert>
                  )}
              </>
            )}

            {actionType === "Re-Assign Task" && (
              <>
                <Typography sx={{ mb: 2 }}>Select new team member:</Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Team Member</InputLabel>
                  <Select
                    value={newTeamMemberId}
                    label="Team Member"
                    onChange={(e) => setNewTeamMemberId(e.target.value)}
                  >
                    <MenuItem value="" disabled>
                      Select Team Member
                    </MenuItem>
                    {teamMembers.map((member) => (
                      <MenuItem
                        key={member.teamMemberId}
                        value={member.teamMemberId}
                      >
                        {member.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            {actionType === "Deleted" && !isAdmin && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This deletion will require admin approval.
              </Alert>
            )}

            <TextField
              label="Remark (Optional)"
              multiline
              rows={3}
              fullWidth
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              sx={{ mb: 2 }}
            />

            {actionType !== "Completed" &&
              actionType !== "Re-Assign Task" &&
              actionType !== "Deleted" && (
                <Accordion
                  expanded={historyExpanded}
                  onChange={() => {
                    setHistoryExpanded(!historyExpanded);
                    if (!historyExpanded && selectedTask)
                      fetchTaskHistory(selectedTask._id);
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>View Audit Trail</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {isHistoryLoading ? (
                      <Typography>Loading...</Typography>
                    ) : taskHistory.length > 0 ? (
                      auditTrailDisplay
                    ) : (
                      <Typography>No history available</Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenRemarkDialog(false);
                setRemark("");
                setNewTeamMemberId("");
                setSelectedCompletionDate(new Date());
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRemarkSubmit} variant="contained">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Task History Modal */}
        <Modal
          open={openTaskHistoryModal}
          onClose={() => setOpenTaskHistoryModal(false)}
          aria-labelledby="task-history-modal"
        >
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90vw",
              maxWidth: 1200,
              maxHeight: "90vh",
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 24,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 2,
                bgcolor: "primary.main",
                color: "white",
              }}
            >
              <Typography variant="h6">
                Task History - {selectedTask?.clientCode}
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<GetAppIcon />}
                  onClick={handleExportHistory}
                  sx={{ color: "white", borderColor: "white", mr: 1 }}
                >
                  Export PDF
                </Button>
                <IconButton
                  onClick={() => setOpenTaskHistoryModal(false)}
                  sx={{ color: "white" }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ p: 2, maxHeight: "70vh", overflow: "auto" }}>
              {isHistoryLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                auditTrailDisplay
              )}
            </Box>
          </Box>
        </Modal>

        {/* Toast Notifications */}
        <Snackbar
          open={openToast}
          autoHideDuration={8000}
          onClose={handleToastClose}
          anchorOrigin={{ vertical: "center", horizontal: "center" }}
        >
          <Alert
            severity="warning"
            action={
              <>
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleToastConfirm}
                >
                  Confirm
                </Button>
                <Button color="inherit" size="small" onClick={handleToastClose}>
                  Cancel
                </Button>
              </>
            }
          >
            {toastAction?.action === "Deleted"
              ? "This deletion requires admin approval. Proceed?"
              : toastAction?.task?.status === "Completed" &&
                toastAction?.action !== "Completed" &&
                toastAction?.action !== "Re-Assign Task"
              ? "Changing status from Completed requires admin approval. Proceed?"
              : toastAction?.task?.status === "Upcoming"
              ? "This task is scheduled for future assignment. Are you sure you want to work on this upcoming task now?"
              : "This is a backdated completion and will require admin approval. Proceed?"}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
};

export default TaskMasterPage;
