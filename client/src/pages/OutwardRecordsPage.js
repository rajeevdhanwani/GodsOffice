// client/src/pages/OutwardRecordsPage.js
import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  TablePagination,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Save as SaveIcon,
  Clear as ClearIcon,
  Home as HomeIcon,
  FilterList as FilterIcon,
  Send as SendIcon,
  LinkOff as LinkOffIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import ClientSearchBar from "../components/ClientSearchBar";
import "../styles/OutwardRecordsPage.css";

const OutwardRecordsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [returnableInwardRecords, setReturnableInwardRecords] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    record: null,
  });
  const [formData, setFormData] = useState({
    clientType: "Client",
    clientCode: "",
    clientName: "",
    giverId: "",
    receiver: "",
    recordType: "",
    mode: "",
    remarks: "",
    timestamp: new Date(),
    linkedInwardId: null,
  });
  const [backdateWarning, setBackdateWarning] = useState("");
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filters, setFilters] = useState({
    clientSearch: "",
    mode: "",
    dateFrom: null,
    dateTo: null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [setSelectedClient] = useState(null);
  const [userData, setUserData] = useState(null);

  const modes = [
    "Mail",
    "Letter",
    "Physical",
    "Email",
    "WhatsApp",
    "Courier",
    "Hand Delivery",
    "Other",
  ];

  // Initialize form with pre-filled data if coming from inward record
  useEffect(() => {
    if (location.state) {
      const {
        clientType,
        clientCode,
        clientName,
        recordType,
        mode,
        remarks,
        linkedInwardId,
      } = location.state;

      setFormData((prev) => ({
        ...prev,
        clientType: clientType || "Client",
        clientCode: clientCode || "",
        clientName: clientName || "",
        recordType: recordType || "",
        mode: mode || "",
        remarks: `Return of: ${remarks || recordType}`,
        linkedInwardId: linkedInwardId || null,
      }));
    }
  }, [location.state]);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrors({ server: "Please log in to access this page" });
        navigate("/login");
        return;
      }

      // Build query parameters for outward records with enhanced filtering
      const queryParams = new URLSearchParams({
        direction: "Outward",
        page: page + 1,
        limit: rowsPerPage,
      });

      // Add filters
      if (filters.clientSearch) {
        queryParams.append("clientSearch", filters.clientSearch);
      }
      if (filters.mode) {
        queryParams.append("mode", filters.mode);
      }
      if (filters.dateFrom) {
        queryParams.append("dateFrom", format(filters.dateFrom, "yyyy-MM-dd"));
      }
      if (filters.dateTo) {
        queryParams.append("dateTo", format(filters.dateTo, "yyyy-MM-dd"));
      }

      const [userRes, clientsRes, teamRes, recordsRes, inwardRes, pendingRes] =
        await Promise.all([
          fetch("http://localhost:5000/api/auth/user", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:5000/api/clients", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:5000/api/tasks/teams", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`http://localhost:5000/api/records?${queryParams}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          // Fetch returnable inward records that haven't been returned yet
          fetch(
            "http://localhost:5000/api/records?direction=Inward&limit=1000",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          fetch("http://localhost:5000/api/records/pending?direction=Outward", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ ok: true, json: () => ({ records: [] }) })),
        ]);

      const [
        userData,
        clientsData,
        teamData,
        recordsData,
        inwardData,
        pendingData,
      ] = await Promise.all([
        userRes.json(),
        clientsRes.json(),
        teamRes.json(),
        recordsRes.json(),
        inwardRes.json(),
        pendingRes.json(),
      ]);

      if (!userRes.ok)
        throw new Error(userData.message || "Failed to fetch user");
      if (!clientsRes.ok)
        throw new Error(clientsData.message || "Failed to fetch clients");
      if (!teamRes.ok)
        throw new Error(teamData.message || "Failed to fetch team members");
      if (!recordsRes.ok)
        throw new Error(recordsData.message || "Failed to fetch records");
      if (!inwardRes.ok)
        throw new Error(inwardData.message || "Failed to fetch inward records");

      setIsAdmin(userData.isAdmin || false);
      setUserData(userData);
      setClients(clientsData);

      const teamMembersData = teamData.data || teamData;
      setTeamMembers(teamMembersData);

      // Auto-select current user as Executive-O for non-admin users
      if (!userData.isAdmin && userData.teamMemberId) {
        // Verify the teamMemberId exists in the team data
        const teamMemberExists = teamMembersData.find(
          (member) => member.teamMemberId === userData.teamMemberId
        );

        if (teamMemberExists) {
          setFormData((prev) => ({
            ...prev,
            giverId: userData.teamMemberId,
          }));
          console.log(`Auto-assigned Executive-O: ${userData.teamMemberId}`);
        } else {
          console.error(
            `TeamMemberId ${userData.teamMemberId} not found in team data. Available team members:`,
            teamMembersData
          );
          setErrors({
            server: `Your account is not properly linked to a team member. Please contact admin to link your account to teamMemberId: ${userData.teamMemberId}`,
          });
        }
      } else if (!userData.isAdmin && !userData.teamMemberId) {
        console.warn(
          "User account missing teamMemberId. Please contact admin to link your account to a team member."
        );
        setErrors({
          server:
            "Your account is not linked to a team member. Please contact admin to complete the setup.",
        });
      }

      setRecords(recordsData.records || []);
      setTotalRecords(recordsData.totalRecords || 0);
      setPendingRecords(pendingData.records || []);

      // Filter returnable inward records that haven't been returned
      const returnableRecords = (inwardData.records || []).filter(
        (record) => record.returnable && !record.isReturned
      );
      setReturnableInwardRecords(returnableRecords);
    } catch (err) {
      setErrors({ server: err.message || "Failed to load data" });
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle client selection - COMPLETELY BLOCKED when linked to inward record
  const handleClientSelect = (client) => {
    // COMPLETELY BLOCK if linked to inward record
    if (formData.linkedInwardId) {
      return;
    }

    setFormData({
      ...formData,
      clientCode: client ? client.clientCode : "",
      clientName: client ? client.clientName : "",
    });
    setErrors({ ...errors, clientCode: "", clientName: "" });
  };

  // Handle form change - Block editing when linked
  const handleFormChange = (field, value) => {
    // Block editing of client fields and record type when linked to inward record
    if (
      formData.linkedInwardId &&
      (field === "clientType" ||
        field === "clientCode" ||
        field === "clientName" ||
        field === "recordType")
    ) {
      return;
    }

    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "" });

    // Check for backdate warning when timestamp changes
    if (field === "timestamp" && value) {
      const selectedDate = new Date(value);
      const today = new Date();
      selectedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        const daysDiff = Math.ceil(
          (today - selectedDate) / (1000 * 60 * 60 * 24)
        );
        setBackdateWarning(
          `⚠️ Warning: You have selected a date ${daysDiff} day${
            daysDiff > 1 ? "s" : ""
          } in the past. This entry will require admin approval before it appears in the records list.`
        );
      } else {
        setBackdateWarning("");
      }
    }
  };

  // Handle linked inward record selection
  const handleLinkedRecordSelect = (record) => {
    if (record) {
      setFormData({
        ...formData,
        clientType: record.clientType,
        clientCode: record.clientCode || "",
        clientName: record.clientName,
        recordType: record.recordType,
        mode: record.mode,
        remarks: `Return of: ${record.remarks || record.recordType}`,
        linkedInwardId: record._id,
      });
    } else {
      setFormData({
        ...formData,
        linkedInwardId: null,
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (formData.clientType === "Client" && !formData.clientCode)
      newErrors.clientCode = "Client is required";
    if (formData.clientType === "NonClient" && !formData.clientName)
      newErrors.clientName = "Name is required";
    // Only validate Executive-O for admin users
    if (isAdmin && !formData.giverId) {
      newErrors.giverId = "Executive-O is required";
    }
    if (!formData.receiver) newErrors.receiver = "Receiver name is required";
    if (!formData.recordType) newErrors.recordType = "Record Type is required";
    if (!formData.mode) newErrors.mode = "Mode is required";
    if (!formData.remarks) newErrors.remarks = "Remarks are required";
    if (!formData.timestamp) newErrors.timestamp = "Date is required";

    const timestamp = new Date(formData.timestamp);
    if (timestamp > new Date())
      newErrors.timestamp = "Future dates are not allowed";

    return newErrors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrors({ server: "Authentication required. Please log in." });
        navigate("/login");
        return;
      }

      const payload = {
        ...formData,
        direction: "Outward",
        timestamp: format(formData.timestamp, "yyyy-MM-dd"),
      };

      const response = await fetch("http://localhost:5000/api/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        let message = data.message || "Outward record created successfully!";
        if (data.pendingAdminApproval) {
          message +=
            " Record is pending admin approval due to backdated entry.";
        }
        setSuccess(message);

        // Reset form
        clearForm();

        // Refresh data
        fetchData();
      } else {
        setErrors({ server: data.message || "Failed to create record" });
      }
    } catch (err) {
      setErrors({ server: err.message || "Server error" });
      console.error("Submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Clear form
  const clearForm = () => {
    setFormData({
      clientType: "Client",
      clientCode: "",
      clientName: "",
      giverId: "", // Will be auto-assigned in useEffect
      receiver: "",
      recordType: "",
      mode: "",
      remarks: "",
      timestamp: new Date(),
      linkedInwardId: null,
    });
    setErrors({});
    setSuccess("");

    // Reset client selection properly
    setSelectedClient(null);

    // Clear the client search bar by forcing a re-render
    setTimeout(() => {
      setSelectedClient(null);
      // Re-trigger auto-assignment for non-admin users
      if (userData && !userData.isAdmin && userData.teamMemberId) {
        setFormData((prev) => ({
          ...prev,
          giverId: userData.teamMemberId,
        }));
      }
    }, 100);
  };

  // Handle admin approval/rejection
  const handleApproval = async (recordId, approve) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/records/approve/${recordId}`,
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
      if (response.ok) {
        setPendingRecords(pendingRecords.filter((rec) => rec._id !== recordId));
        if (approve) {
          fetchData(); // Refresh to get updated list
        }
        setSuccess(data.message);
      } else {
        setErrors({ server: data.message || "Failed to process approval" });
      }
    } catch (err) {
      setErrors({ server: err.message || "Server error" });
      console.error("Approval error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle record deletion
  const handleDeleteClick = (record) => {
    setDeleteDialog({ open: true, record });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.record) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/records/${deleteDialog.record._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (response.ok) {
        if (data.requiresApproval) {
          setSuccess("🔄 " + data.message);
        } else {
          setSuccess("✅ " + data.message);
        }
        fetchData();
      } else {
        setErrors({ server: data.message || "Failed to delete record" });
      }
    } catch (err) {
      setErrors({ server: err.message || "Server error" });
    } finally {
      setLoading(false);
      setDeleteDialog({ open: false, record: null });
    }
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd-MMM-yyyy");
  };

  // Format time for display
  const formatDateTime = (dateString) => {
    return format(new Date(dateString), "dd-MMM-yyyy HH:mm");
  };

  // Get team member name by ID
  const getTeamMemberName = (memberId) => {
    const member = teamMembers.find((tm) => tm.teamMemberId === memberId);
    return member ? member.name : memberId;
  };

  // Helper function for proper case formatting
  const toProperCase = (str) => {
    if (!str) return str;
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#2c3e50" }}>
          <SendIcon sx={{ mr: 2, verticalAlign: "middle", color: "#2196F3" }} />
          Outward Records Management
        </Typography>
        <Button
          component={Link}
          to="/records"
          startIcon={<HomeIcon />}
          variant="outlined"
          sx={{
            borderColor: "#2196F3",
            color: "#2196F3",
            "&:hover": {
              backgroundColor: "#2196F3",
              color: "white",
            },
          }}
        >
          Back to Dashboard
        </Button>
      </Box>

      {errors.server && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.server}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Enhanced Form Card */}
      <Card sx={{ mb: 4, borderRadius: 2, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",
              color: "white",
              p: 2,
              borderRadius: 2,
              mb: 3,
              textAlign: "center",
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              <DescriptionIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Create New Outward Record
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            {/* Linked Inward Record Selection */}
            <Card
              sx={{
                mb: 4,
                border: "2px dashed #e3f2fd",
                backgroundColor: "#f3f8ff",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  sx={{ mb: 2, color: "#1976D2", fontWeight: 600 }}
                >
                  🔗 Link to Returnable Inward Record (Optional)
                </Typography>
                <Autocomplete
                  options={returnableInwardRecords}
                  getOptionLabel={(option) =>
                    `${option.clientName} - ${option.recordType} (${formatDate(
                      option.timestamp
                    )})`
                  }
                  value={
                    returnableInwardRecords.find(
                      (r) => r._id === formData.linkedInwardId
                    ) || null
                  }
                  onChange={(event, newValue) =>
                    handleLinkedRecordSelect(newValue)
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Returnable Record"
                      size="small"
                      helperText="Select this if you're returning an item received earlier"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body2">
                          <strong>{option.clientName}</strong> -{" "}
                          {option.recordType}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Received: {formatDate(option.timestamp)} | Mode:{" "}
                          {option.mode}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
                {formData.linkedInwardId && (
                  <Box mt={2}>
                    <Chip
                      label="Linked to Inward Record"
                      color="success"
                      size="small"
                      onDelete={() => handleLinkedRecordSelect(null)}
                      deleteIcon={<LinkOffIcon />}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* TOP ROW: Client Type Checkbox and Date - POSITIONED TO RIGHT */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.clientType === "Client"}
                      onChange={(e) =>
                        handleFormChange(
                          "clientType",
                          e.target.checked ? "Client" : "NonClient"
                        )
                      }
                      disabled={!!formData.linkedInwardId}
                      sx={{ color: "#2196F3" }}
                    />
                  }
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <PersonIcon
                        sx={{
                          mr: 1,
                          color: formData.linkedInwardId
                            ? "#c0c0c0"
                            : "#2196F3",
                        }}
                      />
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 500,
                          color: formData.linkedInwardId
                            ? "#c0c0c0"
                            : "inherit",
                        }}
                      >
                        Record is for existing client
                      </Typography>
                      {formData.linkedInwardId && (
                        <LockIcon
                          sx={{ ml: 1, fontSize: 16, color: "#c0c0c0" }}
                        />
                      )}
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} md={6} sx={{ textAlign: "right" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <CalendarIcon sx={{ mr: 1, color: "#2196F3" }} />
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Record Date *
                    </Typography>
                    <DatePicker
                      selected={formData.timestamp}
                      onChange={(date) => handleFormChange("timestamp", date)}
                      dateFormat="dd-MMM-yyyy"
                      maxDate={new Date()}
                      className="custom-datepicker"
                      placeholderText="Select date"
                    />
                    {errors.timestamp && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1, display: "block" }}
                      >
                        {errors.timestamp}
                      </Typography>
                    )}
                    {backdateWarning && (
                      <Typography
                        variant="caption"
                        sx={{
                          mt: 1,
                          display: "block",
                          color: "#FF9800",
                          fontWeight: 500,
                          maxWidth: 250,
                        }}
                      >
                        {backdateWarning}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* CENTERED FORM FIELDS WITH PROPER WIDTHS */}
            <Box sx={{ maxWidth: 1200, margin: "0 auto" }}>
              {/* FIRST ROW: Search Client (3-4 inches), Receiver Name (2 inches), Executive-O (2 inches) */}
              <Grid
                container
                spacing={3}
                sx={{ mb: 3, justifyContent: "center" }}
              >
                <Grid item xs={12} md={5}>
                  {formData.clientType === "Client" ? (
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          mb: 1,
                          fontWeight: 500,
                          color: formData.linkedInwardId
                            ? "#c0c0c0"
                            : "inherit",
                        }}
                      >
                        Search Client * {formData.linkedInwardId && "🔒 LOCKED"}
                      </Typography>
                      <Box sx={{ position: "relative" }}>
                        <ClientSearchBar
                          clients={clients}
                          onSelect={handleClientSelect}
                          disabled={!!formData.linkedInwardId}
                          style={{
                            minWidth: "300px",
                            backgroundColor: formData.linkedInwardId
                              ? "#f5f5f5"
                              : "white",
                            cursor: formData.linkedInwardId
                              ? "not-allowed"
                              : "pointer",
                          }}
                        />
                        {formData.linkedInwardId && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: "rgba(0,0,0,0.1)",
                              borderRadius: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              pointerEvents: "none",
                            }}
                          >
                            <LockIcon sx={{ color: "#666" }} />
                          </Box>
                        )}
                      </Box>
                      {formData.linkedInwardId && (
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 1,
                            display: "block",
                            color: "#666",
                            fontStyle: "italic",
                          }}
                        >
                          Client details locked due to linked inward record
                        </Typography>
                      )}
                      {errors.clientCode && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ mt: 1, ml: 2 }}
                        >
                          {errors.clientCode}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <TextField
                      fullWidth
                      label="Client/Person Name"
                      value={formData.clientName}
                      onChange={(e) =>
                        handleFormChange("clientName", e.target.value)
                      }
                      error={!!errors.clientName}
                      helperText={
                        errors.clientName ||
                        (formData.linkedInwardId
                          ? "🔒 Locked due to linked record"
                          : "")
                      }
                      required
                      disabled={!!formData.linkedInwardId}
                      sx={{
                        minWidth: "300px",
                        "& .MuiInputBase-input.Mui-disabled": {
                          backgroundColor: "#f5f5f5",
                          cursor: "not-allowed",
                        },
                      }}
                    />
                  )}
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Receiver Name (Person who receives)"
                    value={formData.receiver}
                    onChange={(e) =>
                      handleFormChange("receiver", e.target.value)
                    }
                    error={!!errors.receiver}
                    helperText={
                      errors.receiver ||
                      "Name of the person who actually receives the document"
                    }
                    required
                    sx={{ minWidth: "180px" }}
                  />
                </Grid>

                {isAdmin && (
                  <Grid item xs={12} md={4}>
                    <FormControl
                      fullWidth
                      error={!!errors.giverId}
                      required
                      sx={{ minWidth: "180px" }}
                    >
                      <InputLabel>Executive-O</InputLabel>
                      <Select
                        value={formData.giverId}
                        onChange={(e) =>
                          handleFormChange("giverId", e.target.value)
                        }
                        label="Executive-O"
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 300,
                              minWidth: 250,
                            },
                          },
                        }}
                      >
                        {teamMembers.map((member) => (
                          <MenuItem
                            key={member.teamMemberId}
                            value={member.teamMemberId}
                            sx={{ minHeight: 48, padding: "12px 16px" }}
                          >
                            {member.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.giverId && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ mt: 1, ml: 2 }}
                        >
                          {errors.giverId}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                )}
              </Grid>

              {/* SECOND ROW: Document Description (6 inches) and Mode (2 inches) */}
              <Grid
                container
                spacing={3}
                sx={{ mb: 3, justifyContent: "center" }}
              >
                <Grid item xs={12} md={8}>
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      fullWidth
                      label="Document/Item Description"
                      value={formData.recordType}
                      onChange={(e) =>
                        handleFormChange("recordType", e.target.value)
                      }
                      error={!!errors.recordType}
                      helperText={
                        errors.recordType ||
                        (formData.linkedInwardId
                          ? "🔒 Locked due to linked record"
                          : "Describe what is being sent/returned")
                      }
                      required
                      disabled={!!formData.linkedInwardId}
                      sx={{
                        minWidth: "400px",
                        "& .MuiInputBase-input.Mui-disabled": {
                          backgroundColor: "#f5f5f5",
                          cursor: "not-allowed",
                        },
                      }}
                    />
                    {formData.linkedInwardId && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          zIndex: 1,
                        }}
                      >
                        <LockIcon sx={{ color: "#666", fontSize: 20 }} />
                      </Box>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl
                    fullWidth
                    error={!!errors.mode}
                    required
                    sx={{ minWidth: "180px" }}
                  >
                    <InputLabel>Delivery Mode</InputLabel>
                    <Select
                      value={formData.mode}
                      onChange={(e) => handleFormChange("mode", e.target.value)}
                      label="Delivery Mode"
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                            minWidth: 180,
                          },
                        },
                      }}
                    >
                      {modes.map((mode) => (
                        <MenuItem
                          key={mode}
                          value={mode}
                          sx={{ minHeight: 48, padding: "12px 16px" }}
                        >
                          {mode}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.mode && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1, ml: 2 }}
                      >
                        {errors.mode}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>

              {/* THIRD ROW: Remarks */}
              <Grid
                container
                spacing={3}
                sx={{ mb: 4, justifyContent: "center" }}
              >
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    multiline
                    rows={3}
                    value={formData.remarks}
                    onChange={(e) =>
                      handleFormChange("remarks", e.target.value)
                    }
                    error={!!errors.remarks}
                    helperText={
                      errors.remarks ||
                      "Additional notes about the outward record"
                    }
                    required
                  />
                </Grid>
              </Grid>
            </Box>

            {/* CENTERED ACTION BUTTONS */}
            <Box
              sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3 }}
            >
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={<SaveIcon />}
                sx={{
                  backgroundColor: "#2196F3",
                  "&:hover": { backgroundColor: "#1976D2" },
                  px: 4,
                  py: 1.5,
                }}
              >
                {loading ? "Saving..." : "Save Record"}
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={clearForm}
                disabled={loading}
                startIcon={<ClearIcon />}
                sx={{
                  borderColor: "#2196F3",
                  color: "#2196F3",
                  "&:hover": {
                    backgroundColor: "#2196F3",
                    color: "white",
                  },
                  px: 4,
                  py: 1.5,
                }}
              >
                Clear Form
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Admin Pending Approvals - ENHANCED with creator names, remarks, and actual timestamp */}
      {isAdmin && pendingRecords.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: "#2196F3", fontWeight: 600 }}
            >
              Pending Admin Approvals ({pendingRecords.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell sx={{ fontWeight: 600 }}>
                      Approval Type
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Client Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Record Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingRecords.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>
                        <Chip
                          label={record.approvalType || "Backdated Entry"}
                          size="small"
                          color={
                            record.approvalType === "Deletion Request"
                              ? "error"
                              : "warning"
                          }
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {record.approvalMessage ||
                            `Backdated entry for ${formatDate(
                              record.timestamp
                            )}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.remarks &&
                            `Remarks: ${record.remarks.substring(0, 100)}${
                              record.remarks.length > 100 ? "..." : ""
                            }`}
                        </Typography>
                      </TableCell>
                      <TableCell>{toProperCase(record.clientName)}</TableCell>
                      <TableCell>{toProperCase(record.recordType)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {record.createdByName || "Unknown User"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(
                            record.actualTimestamp || record.createdAt
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleApproval(record._id, true)}
                            startIcon={<CheckCircleIcon />}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => handleApproval(record._id, false)}
                            startIcon={<CancelIcon />}
                          >
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Outward Records List</Typography>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                borderColor: "#2196F3",
                color: "#2196F3",
                "&:hover": {
                  backgroundColor: "#2196F3",
                  color: "white",
                },
              }}
            >
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
          </Box>

          {/* Enhanced Filters with Date Range */}
          {showFilters && (
            <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    options={clients}
                    getOptionLabel={(option) =>
                      `${option.clientCode} - ${option.clientName}`
                    }
                    filterOptions={(options, { inputValue }) =>
                      options.filter((option) =>
                        [
                          option.clientCode,
                          option.clientName,
                          option.firmName,
                        ].some((field) =>
                          field
                            ?.toLowerCase()
                            .includes(inputValue.toLowerCase())
                        )
                      )
                    }
                    value={
                      clients.find(
                        (client) =>
                          client.clientCode === filters.clientSearch ||
                          client.clientName === filters.clientSearch
                      ) || null
                    }
                    onChange={(event, newValue) => {
                      setFilters({
                        ...filters,
                        clientSearch: newValue
                          ? newValue.clientCode || newValue.clientName
                          : "",
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Client Code or Name"
                        size="small"
                        helperText="Search by client code, name, or firm name"
                      />
                    )}
                    noOptionsText="No clients found"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Mode</InputLabel>
                    <Select
                      value={filters.mode}
                      onChange={(e) =>
                        setFilters({ ...filters, mode: e.target.value })
                      }
                      label="Mode"
                    >
                      <MenuItem value="">All</MenuItem>
                      {modes.map((mode) => (
                        <MenuItem key={mode} value={mode}>
                          {mode}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Date From
                    </Typography>
                    <DatePicker
                      selected={filters.dateFrom}
                      onChange={(date) =>
                        setFilters({ ...filters, dateFrom: date })
                      }
                      dateFormat="dd-MMM-yyyy"
                      className="date-filter-input"
                      placeholderText="Select start date"
                      maxDate={new Date()}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Date To
                    </Typography>
                    <DatePicker
                      selected={filters.dateTo}
                      onChange={(date) =>
                        setFilters({ ...filters, dateTo: date })
                      }
                      dateFormat="dd-MMM-yyyy"
                      className="date-filter-input"
                      placeholderText="Select end date"
                      minDate={filters.dateFrom}
                      maxDate={new Date()}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Card>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell sx={{ fontWeight: 600 }}>SL</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Client Name
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Executive-O
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Receiver</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Record Type
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Mode</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((record, index) => (
                      <TableRow key={record._id}>
                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                        <TableCell>{formatDate(record.timestamp)}</TableCell>
                        <TableCell>{toProperCase(record.clientName)}</TableCell>
                        <TableCell>
                          {toProperCase(getTeamMemberName(record.giverId))}
                        </TableCell>
                        <TableCell>{toProperCase(record.receiver)}</TableCell>
                        <TableCell>{toProperCase(record.recordType)}</TableCell>
                        <TableCell>{toProperCase(record.mode)}</TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {record.remarks}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(record)}
                            size="small"
                            title="Delete Record"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalRecords}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, record: null })}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningIcon color="warning" />
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this record for{" "}
            <strong>{deleteDialog.record?.clientName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {!isAdmin
              ? "⚠️ This deletion request will be sent to admin for approval. The record will not be permanently deleted until approved by an administrator."
              : "This action cannot be undone and will delete the record immediately."}
          </Typography>
          {deleteDialog.record && (
            <Typography
              variant="body2"
              sx={{ mt: 2, p: 2, backgroundColor: "#fff3e0", borderRadius: 1 }}
            >
              <strong>Record Details:</strong>
              <br />
              Type: {deleteDialog.record.recordType}
              <br />
              Date: {formatDate(deleteDialog.record.timestamp)}
              <br />
              Mode: {deleteDialog.record.mode}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, record: null })}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OutwardRecordsPage;
