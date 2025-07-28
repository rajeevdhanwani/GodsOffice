// client/src/pages/AdminPanelPage.js
import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  History as BackdateIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config"; // adjust path based on file depth


const AdminPanelPage = () => {
  const navigate = useNavigate();
  const [pendingRecords, setPendingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [actionDialog, setActionDialog] = useState({
    open: false,
    action: null,
  });
  const [filterDirection, setFilterDirection] = useState("All"); // All, Inward, Outward, Deletion
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchPendingRecords();
  }, []);

  const fetchPendingRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrors({ server: "Authentication required. Please log in." });
        navigate("/login");
        return;
      }

      const response = await fetch(
        "${API_BASE_URL}/api/records/pending",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setPendingRecords(data.records || []);
      } else {
        setErrors({
          server: data.message || "Failed to fetch pending records",
        });
      }
    } catch (err) {
      setErrors({ server: err.message || "Server error" });
      console.error("Error fetching pending records:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (recordId, approve) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/records/approve/${recordId}`,
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
        setSuccess(data.message);
        fetchPendingRecords(); // Refresh the list
        setActionDialog({ open: false, action: null });
        setSelectedRecord(null);
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

  const handleActionClick = (record, action) => {
    setSelectedRecord(record);
    setActionDialog({ open: true, action });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    const directions = ["All", "Inward", "Outward", "DELETION_REQUEST"];
    setFilterDirection(directions[newValue]);
  };

  // Filter records based on selected direction
  const filteredRecords = pendingRecords.filter((record) => {
    if (filterDirection === "All") return true;
    if (filterDirection === "DELETION_REQUEST")
      return record.direction === "DELETION_REQUEST";
    return record.direction === filterDirection;
  });

  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd-MMM-yyyy HH:mm");
  };

  const getRecordTypeChip = (record) => {
    if (record.direction === "DELETION_REQUEST") {
      return (
        <Chip
          icon={<DeleteIcon />}
          label="Deletion Request"
          color="error"
          variant="outlined"
          size="small"
        />
      );
    } else {
      return (
        <Chip
          icon={<BackdateIcon />}
          label={`${record.direction} - Backdated`}
          color="warning"
          variant="outlined"
          size="small"
        />
      );
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading pending approvals...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          🛡️ Admin Approval Panel
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and approve pending record submissions
        </Typography>
      </Box>

      {errors.server && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrors({})}>
          {errors.server}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Filter Tabs */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="approval filter tabs"
            >
              <Tab
                label={
                  <Badge badgeContent={pendingRecords.length} color="primary">
                    All Pending
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge
                    badgeContent={
                      pendingRecords.filter((r) => r.direction === "Inward")
                        .length
                    }
                    color="info"
                  >
                    Inward
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge
                    badgeContent={
                      pendingRecords.filter((r) => r.direction === "Outward")
                        .length
                    }
                    color="success"
                  >
                    Outward
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge
                    badgeContent={
                      pendingRecords.filter(
                        (r) => r.direction === "DELETION_REQUEST"
                      ).length
                    }
                    color="error"
                  >
                    Deletions
                  </Badge>
                }
              />
            </Tabs>
          </Box>
        </CardContent>
      </Card>

      {filteredRecords.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <InfoIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {filterDirection === "All"
                ? "🎉 All caught up! No pending approvals."
                : `No ${filterDirection.toLowerCase()} records pending approval.`}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              sx={{ mb: 2, display: "flex", alignItems: "center" }}
            >
              <WarningIcon sx={{ mr: 1, color: "warning.main" }} />
              Pending Approvals ({filteredRecords.length})
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      Client/Record
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Record Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created At</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                    <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record._id} hover>
                      <TableCell>{getRecordTypeChip(record)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {record.clientName}
                        </Typography>
                        {record.clientCode && (
                          <Typography variant="caption" color="text.secondary">
                            Code: {record.clientCode}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.recordType}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {record.createdByName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDate(record.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {record.approvalMessage}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "center",
                          }}
                        >
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<ApproveIcon />}
                            onClick={() => handleActionClick(record, "approve")}
                            sx={{ minWidth: 90 }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<RejectIcon />}
                            onClick={() => handleActionClick(record, "reject")}
                            sx={{ minWidth: 90 }}
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

      {/* Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, action: null })}
      >
        <DialogTitle>
          {actionDialog.action === "approve"
            ? "Approve Record?"
            : "Reject Record?"}
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Record:</strong> {selectedRecord.clientName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Type:</strong> {selectedRecord.recordType}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Created by:</strong> {selectedRecord.createdByName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Details:</strong> {selectedRecord.approvalMessage}
              </Typography>

              {actionDialog.action === "approve" ? (
                <Alert severity="success">
                  ✅ This will approve the record and make it active in the
                  system.
                </Alert>
              ) : (
                <Alert severity="warning">
                  ⚠️ This will reject and permanently delete the record request.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setActionDialog({ open: false, action: null })}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={actionDialog.action === "approve" ? "success" : "error"}
            onClick={() =>
              handleApproveReject(
                selectedRecord?._id,
                actionDialog.action === "approve"
              )
            }
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={20} />
            ) : actionDialog.action === "approve" ? (
              "Approve"
            ) : (
              "Reject"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanelPage;
