// client/src/pages/AdminApprovalPage.js
// NEW FILE - Complete Admin Approval System for Backdated Records

import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Tooltip,
  Badge,
  Tab,
  Tabs,
  CircularProgress,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  Visibility,
  Schedule,
  Warning,
  AdminPanelSettings,
  History,
  Home as HomeIcon,
  Refresh,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const AdminApprovalPage = () => {
  const [pendingRecords, setPendingRecords] = useState([]);
  const [approvedRecords, setApprovedRecords] = useState([]);
  const [rejectedRecords, setRejectedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(""); // 'approve', 'reject', or 'view'
  const [comments, setComments] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchPendingRecords();
    fetchApprovedRecords();
    fetchRejectedRecords();
    fetchStats();
  }, []);

  // Fetch pending approval records
  const fetchPendingRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "${API_BASE_URL}/api/records/pending",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPendingRecords(data.records || []);
      } else {
        throw new Error("Failed to fetch pending records");
      }
    } catch (error) {
      console.error("Error fetching pending records:", error);
      setError("Failed to load pending records");
    } finally {
      setLoading(false);
    }
  };

  // Fetch approved records for history
  const fetchApprovedRecords = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "${API_BASE_URL}/api/records/approved",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setApprovedRecords(data.records || []);
      }
    } catch (error) {
      console.error("Error fetching approved records:", error);
    }
  };

  // Fetch rejected records for history
  const fetchRejectedRecords = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "${API_BASE_URL}/api/records/rejected",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRejectedRecords(data.records || []);
      }
    } catch (error) {
      console.error("Error fetching rejected records:", error);
    }
  };

  // Fetch approval statistics
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "${API_BASE_URL}/api/records/approval-stats",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || { pending: 0, approved: 0, rejected: 0 });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Handle approval/rejection
  const handleAction = async (recordId, action, comments = "") => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/records/${recordId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action,
            comments,
          }),
        }
      );

      if (response.ok) {
        setSuccess(`Record ${action}d successfully`);
        // Refresh all data
        await Promise.all([
          fetchPendingRecords(),
          fetchApprovedRecords(),
          fetchRejectedRecords(),
          fetchStats(),
        ]);
        setDialogOpen(false);
        setComments("");
        setSelectedRecord(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} record`);
      }
    } catch (error) {
      console.error(`Error ${action}ing record:`, error);
      setError(error.message || `Failed to ${action} record`);
    }
  };

  // Open action dialog
  const openActionDialog = (record, action) => {
    setSelectedRecord(record);
    setActionType(action);
    setDialogOpen(true);
    setComments("");
  };

  // Calculate days ago for backdated entries
  const getDaysAgo = (date) => {
    const diffTime = new Date() - new Date(date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get reason for approval requirement
  const getApprovalReason = (record) => {
    const daysAgo = getDaysAgo(record.timestamp);
    if (daysAgo > 1) {
      return `Backdated entry (${daysAgo} days ago)`;
    }
    return "Administrative review required";
  };

  // Refresh all data
  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchPendingRecords(),
      fetchApprovedRecords(),
      fetchRejectedRecords(),
      fetchStats(),
    ]);
    setLoading(false);
    setSuccess("Data refreshed successfully");
  };

  // Summary cards component
  const SummaryCards = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} md={4}>
        <Card
          sx={{
            height: "100%",
            backgroundColor: "#fff3e0",
            border: "1px solid #ff9800",
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="h4"
                  color="#f57c00"
                  sx={{ fontWeight: "bold" }}
                >
                  {stats.pending}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Approval
                </Typography>
              </Box>
              <Schedule sx={{ fontSize: 40, color: "#f57c00" }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card
          sx={{
            height: "100%",
            backgroundColor: "#e8f5e8",
            border: "1px solid #4caf50",
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="h4"
                  color="#4caf50"
                  sx={{ fontWeight: "bold" }}
                >
                  {stats.approved}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Approved Today
                </Typography>
              </Box>
              <CheckCircle sx={{ fontSize: 40, color: "#4caf50" }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card
          sx={{
            height: "100%",
            backgroundColor: "#ffebee",
            border: "1px solid #f44336",
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="h4"
                  color="#f44336"
                  sx={{ fontWeight: "bold" }}
                >
                  {stats.rejected}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rejected Today
                </Typography>
              </Box>
              <Cancel sx={{ fontSize: 40, color: "#f44336" }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Records table component
  const RecordsTable = ({
    records,
    showActions = true,
    emptyMessage = "No records found",
  }) => (
    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
            <TableCell>
              <strong>Date/Time</strong>
            </TableCell>
            <TableCell>
              <strong>Client</strong>
            </TableCell>
            <TableCell>
              <strong>Record Type</strong>
            </TableCell>
            <TableCell>
              <strong>Direction</strong>
            </TableCell>
            <TableCell>
              <strong>Reason</strong>
            </TableCell>
            <TableCell>
              <strong>Days Ago</strong>
            </TableCell>
            {showActions && (
              <TableCell>
                <strong>Actions</strong>
              </TableCell>
            )}
            {!showActions && (
              <TableCell>
                <strong>Status</strong>
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 7} align="center">
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 7} align="center">
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => (
              <TableRow key={record._id} hover>
                <TableCell>
                  <Typography variant="body2">
                    {format(new Date(record.timestamp), "MMM dd, yyyy HH:mm")}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {record.clientName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {record.clientCode}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={record.recordType}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={record.direction}
                    size="small"
                    color={record.direction === "Inward" ? "success" : "info"}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {getApprovalReason(record)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${getDaysAgo(record.timestamp)} days`}
                    size="small"
                    color={
                      getDaysAgo(record.timestamp) > 7 ? "error" : "warning"
                    }
                    icon={<History />}
                  />
                </TableCell>
                {showActions ? (
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => openActionDialog(record, "view")}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Approve">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => openActionDialog(record, "approve")}
                        >
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openActionDialog(record, "reject")}
                        >
                          <Cancel />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                ) : (
                  <TableCell>
                    <Chip
                      label={
                        record.isApproved === true ? "Approved" : "Rejected"
                      }
                      size="small"
                      color={record.isApproved === true ? "success" : "error"}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <AdminPanelSettings sx={{ mr: 2, fontSize: 32, color: "#1976d2" }} />
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            Admin Approval Center
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            component={Link}
            to="/records"
            variant="outlined"
            startIcon={<HomeIcon />}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <SummaryCards />

      {/* Alert for pending items */}
      {stats.pending > 0 && (
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
          <Typography variant="body1">
            You have <strong>{stats.pending}</strong> records waiting for
            approval. These are backdated entries that require administrative
            review.
          </Typography>
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            label={
              <Badge badgeContent={stats.pending} color="error">
                Pending Approval
              </Badge>
            }
          />
          <Tab label="Approval History" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Records Pending Approval
          </Typography>
          <RecordsTable
            records={pendingRecords}
            showActions={true}
            emptyMessage="No pending approvals"
          />
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Approval History
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ mb: 2, color: "#4caf50", fontWeight: 600 }}
              >
                Approved Records
              </Typography>
              <RecordsTable
                records={approvedRecords}
                showActions={false}
                emptyMessage="No approved records today"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ mb: 2, color: "#f44336", fontWeight: 600 }}
              >
                Rejected Records
              </Typography>
              <RecordsTable
                records={rejectedRecords}
                showActions={false}
                emptyMessage="No rejected records today"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Action Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionType === "approve" && "Approve Record"}
          {actionType === "reject" && "Reject Record"}
          {actionType === "view" && "Record Details"}
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Client
                  </Typography>
                  <Typography variant="body1">
                    {selectedRecord.clientName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Record Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedRecord.recordType}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Direction
                  </Typography>
                  <Typography variant="body1">
                    {selectedRecord.direction}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Mode
                  </Typography>
                  <Typography variant="body1">{selectedRecord.mode}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body1">
                    {format(
                      new Date(selectedRecord.timestamp),
                      "MMMM dd, yyyy 'at' HH:mm"
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Reason for Approval
                  </Typography>
                  <Typography variant="body1">
                    {getApprovalReason(selectedRecord)}
                  </Typography>
                </Grid>
                {selectedRecord.description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {selectedRecord.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {(actionType === "approve" || actionType === "reject") && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={`${
                    actionType === "approve" ? "Approval" : "Rejection"
                  } Comments`}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={`Enter reason for ${actionType}...`}
                  sx={{ mt: 3 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          {actionType === "approve" && (
            <Button
              variant="contained"
              color="success"
              onClick={() =>
                handleAction(selectedRecord._id, "approve", comments)
              }
            >
              Approve
            </Button>
          )}
          {actionType === "reject" && (
            <Button
              variant="contained"
              color="error"
              onClick={() =>
                handleAction(selectedRecord._id, "reject", comments)
              }
            >
              Reject
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminApprovalPage;
