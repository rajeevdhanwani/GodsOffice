// Enhanced PendingRequestsSection.js with Design System Integration
import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  Tooltip,
  Avatar,
  Card,
  CardContent,
  Badge,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Zoom,
  Fade,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  Edit,
  DeleteForever,
  ExpandMore,
  Person,
  Notifications,
} from "@mui/icons-material";
import { formatIndianDateTime } from "../utils/invoiceUtils";
import { designSystem } from "../theme/designSystem";
import "../styles/animations.css";

const PendingRequestsSection = ({
  invoices,
  handleOpenDialog,
  currentUser,
}) => {
  const [expandedRequests, setExpandedRequests] = useState({});
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // Memoize the filtered list of invoices with pending requests for performance
  const pendingInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];

    let filtered = invoices.filter(
      (invoice) =>
        invoice.editRequests?.some((req) => req.status === "Pending") ||
        invoice.deleteRequests?.some((req) => req.status === "Pending")
    );

    if (showOnlyMine && currentUser) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.editRequests?.some(
            (req) =>
              req.status === "Pending" &&
              req.requestedBy?._id === currentUser.id
          ) ||
          invoice.deleteRequests?.some(
            (req) =>
              req.status === "Pending" &&
              req.requestedBy?._id === currentUser.id
          )
      );
    }

    return filtered;
  }, [invoices, showOnlyMine, currentUser]);

  const totalPendingCount = useMemo(() => {
    return pendingInvoices.reduce((count, invoice) => {
      const editCount =
        invoice.editRequests?.filter((req) => req.status === "Pending")
          .length || 0;
      const deleteCount =
        invoice.deleteRequests?.filter((req) => req.status === "Pending")
          .length || 0;
      return count + editCount + deleteCount;
    }, 0);
  }, [pendingInvoices]);

  const toggleRequestExpansion = (requestId) => {
    setExpandedRequests((prev) => ({
      ...prev,
      [requestId]: !prev[requestId],
    }));
  };

  const getRequestPriorityColor = (requestDate) => {
    const daysOld = Math.floor(
      (new Date() - new Date(requestDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysOld > 7) return designSystem.colors.error.main;
    if (daysOld > 3) return designSystem.colors.warning.main;
    return designSystem.colors.info.main;
  };

  const getRequestPriorityLabel = (requestDate) => {
    const daysOld = Math.floor(
      (new Date() - new Date(requestDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysOld > 7) return "🚨 Urgent";
    if (daysOld > 3) return "⚠️ High";
    if (daysOld > 1) return "📅 Medium";
    return "🆕 New";
  };

  const getUserInitials = (username) => {
    if (!username) return "?";
    return username.substring(0, 2).toUpperCase();
  };

  const getUserGradient = (username) => {
    if (!username) return designSystem.colors.background.primaryGradient;

    const gradients = [
      designSystem.colors.background.primaryGradient,
      designSystem.colors.background.secondaryGradient,
      designSystem.colors.background.successGradient,
      designSystem.colors.background.warningGradient,
      designSystem.colors.background.infoGradient,
      "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
      "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
      "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
    ];

    const index = username.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  if (pendingInvoices.length === 0) {
    return (
      <Fade in={true}>
        <Paper
          sx={{
            textAlign: "center",
            p: 6,
            borderRadius: designSystem.borderRadius.lg,
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
            border: `2px dashed ${designSystem.colors.grey[300]}`,
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='a' patternUnits='userSpaceOnUse' width='20' height='20' patternTransform='scale(1) rotate(0)'%3e%3crect x='0' y='0' width='100%25' height='100%25' fill='transparent'/%3e%3cpath d='M10 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z' stroke-width='1' stroke='%23${designSystem.colors.primary[200].replace(
                "#",
                ""
              )}' fill='none'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23a)'/%3e%3c/svg%3e")`,
              opacity: 0.3,
            },
          }}
        >
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: designSystem.colors.background.successGradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                boxShadow: designSystem.shadows.lg,
                animation: "pulse 2s infinite",
              }}
            >
              <CheckCircle sx={{ fontSize: 60, color: "white" }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                mb: 2,
                background: designSystem.colors.background.primaryGradient,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ✨ All Caught Up!
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mb: 2, fontWeight: 600 }}
            >
              No Pending Requests
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ maxWidth: 400, mx: "auto" }}
            >
              Excellent work! All edit and delete requests have been processed.
              Your team is staying on top of invoice management. 🎉
            </Typography>
          </Box>
        </Paper>
      </Fade>
    );
  }

  return (
    <Box className="animate-fade-in-up">
      {/* Header Section */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          borderRadius: designSystem.borderRadius.lg,
          background: designSystem.colors.background.primaryGradient,
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
              >
                <Badge
                  badgeContent={totalPendingCount}
                  color="error"
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: "14px",
                      fontWeight: "bold",
                      minWidth: "28px",
                      height: "28px",
                    },
                  }}
                >
                  <Notifications sx={{ fontSize: 40 }} />
                </Badge>
                <Box>
                  <Typography
                    variant="h4"
                    component="h2"
                    sx={{ fontWeight: 800, mb: 1 }}
                  >
                    🚨 Action Required
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    {totalPendingCount} pending approval
                    {totalPendingCount !== 1 ? "s" : ""} across{" "}
                    {pendingInvoices.length} invoice
                    {pendingInvoices.length !== 1 ? "s" : ""}
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
                <Button
                  variant={showOnlyMine ? "contained" : "outlined"}
                  onClick={() => setShowOnlyMine(!showOnlyMine)}
                  startIcon={<Person />}
                  sx={{
                    color: "white",
                    borderColor: "white",
                    background: showOnlyMine
                      ? "rgba(255,255,255,0.2)"
                      : "transparent",
                    "&:hover": {
                      borderColor: "white",
                      background: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  {showOnlyMine ? "Show All" : "My Requests Only"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%)",
            backgroundSize: "20px 20px",
            opacity: 0.3,
          }}
        />
      </Box>

      {/* Requests List */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {pendingInvoices.map((invoice, index) => (
          <Zoom
            key={invoice._id}
            in={true}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <Card
              sx={{
                borderRadius: designSystem.borderRadius.lg,
                boxShadow: designSystem.shadows.lg,
                overflow: "hidden",
                background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                border: `1px solid ${designSystem.colors.grey[200]}`,
                transition: designSystem.transitions.normal,
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: designSystem.shadows.xxl,
                },
              }}
            >
              {/* Invoice Header */}
              <Box
                sx={{
                  background: designSystem.colors.background.primaryGradient,
                  color: "white",
                  p: 3,
                  position: "relative",
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                      📋 {invoice.invoiceNumber}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Client: <strong>{invoice.clientName}</strong> (
                      {invoice.clientCode})
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Amount:{" "}
                      {invoice.totalAmount
                        ? `₹${invoice.totalAmount.toLocaleString()}`
                        : "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: { xs: "flex-start", md: "flex-end" },
                      }}
                    >
                      <Chip
                        label={`${
                          invoice.editRequests?.filter(
                            (req) => req.status === "Pending"
                          ).length || 0
                        } Edit + ${
                          invoice.deleteRequests?.filter(
                            (req) => req.status === "Pending"
                          ).length || 0
                        } Delete`}
                        sx={{
                          background: "rgba(255,255,255,0.2)",
                          color: "white",
                          fontWeight: "bold",
                          fontSize: "0.875rem",
                        }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <CardContent sx={{ p: 0 }}>
                {/* Pending Edit Requests */}
                {invoice.editRequests
                  ?.filter((req) => req.status === "Pending")
                  .map((req) => (
                    <Box
                      key={req._id}
                      sx={{
                        borderBottom: `1px solid ${designSystem.colors.grey[200]}`,
                      }}
                    >
                      <Accordion
                        expanded={expandedRequests[req._id] || false}
                        onChange={() => toggleRequestExpansion(req._id)}
                        sx={{
                          boxShadow: "none",
                          "&:before": { display: "none" },
                          "& .MuiAccordionSummary-root": {
                            minHeight: "80px",
                            px: 3,
                            "&:hover": {
                              background: designSystem.colors.warning[50],
                            },
                          },
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={1}>
                              <Avatar
                                sx={{
                                  background: getUserGradient(
                                    req.requestedBy?.username
                                  ),
                                  width: 48,
                                  height: 48,
                                  fontSize: "16px",
                                  fontWeight: "bold",
                                }}
                              >
                                {getUserInitials(req.requestedBy?.username)}
                              </Avatar>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  mb: 1,
                                }}
                              >
                                <Edit
                                  sx={{
                                    color: designSystem.colors.warning.main,
                                    fontSize: 20,
                                  }}
                                />
                                <Chip
                                  label="Edit Request"
                                  color="warning"
                                  size="small"
                                  sx={{ fontWeight: "bold" }}
                                />
                                <Chip
                                  label={getRequestPriorityLabel(
                                    req.requestedAt
                                  )}
                                  size="small"
                                  sx={{
                                    background: getRequestPriorityColor(
                                      req.requestedAt
                                    ),
                                    color: "white",
                                    fontWeight: "bold",
                                  }}
                                />
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 0.5 }}
                              >
                                Requested by:{" "}
                                <strong>
                                  {req.requestedBy?.username || "Unknown User"}
                                </strong>
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {formatIndianDateTime(req.requestedAt)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={5}>
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1,
                                  flexWrap: "wrap",
                                  justifyContent: {
                                    xs: "flex-start",
                                    md: "flex-end",
                                  },
                                }}
                              >
                                <Tooltip title="Approve Edit Request">
                                  <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    startIcon={<CheckCircle />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDialog(
                                        invoice._id,
                                        req._id,
                                        "edit",
                                        true,
                                        req.changes
                                      );
                                    }}
                                    sx={{
                                      borderRadius:
                                        designSystem.borderRadius.md,
                                      fontWeight: "bold",
                                      textTransform: "none",
                                    }}
                                  >
                                    Approve
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Reject Edit Request">
                                  <Button
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    startIcon={<Cancel />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDialog(
                                        invoice._id,
                                        req._id,
                                        "edit",
                                        false,
                                        req.changes
                                      );
                                    }}
                                    sx={{
                                      borderRadius:
                                        designSystem.borderRadius.md,
                                      fontWeight: "bold",
                                      textTransform: "none",
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </Tooltip>
                              </Box>
                            </Grid>
                          </Grid>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 3, pb: 3 }}>
                          <Alert
                            severity="info"
                            sx={{
                              borderRadius: designSystem.borderRadius.md,
                              mb: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              💡 Click on the buttons above to review and
                              approve/reject this edit request.
                            </Typography>
                          </Alert>
                          {req.reason && (
                            <Box
                              sx={{
                                mt: 2,
                                p: 2,
                                background: designSystem.colors.grey[50],
                                borderRadius: designSystem.borderRadius.sm,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 1 }}
                              >
                                📝 Reason:
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {req.reason}
                              </Typography>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  ))}

                {/* Pending Delete Requests */}
                {invoice.deleteRequests
                  ?.filter((req) => req.status === "Pending")
                  .map((req) => (
                    <Box
                      key={req._id}
                      sx={{
                        borderBottom: `1px solid ${designSystem.colors.grey[200]}`,
                      }}
                    >
                      <Accordion
                        expanded={expandedRequests[req._id] || false}
                        onChange={() => toggleRequestExpansion(req._id)}
                        sx={{
                          boxShadow: "none",
                          "&:before": { display: "none" },
                          "& .MuiAccordionSummary-root": {
                            minHeight: "80px",
                            px: 3,
                            "&:hover": {
                              background: designSystem.colors.error[50],
                            },
                          },
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={1}>
                              <Avatar
                                sx={{
                                  background: getUserGradient(
                                    req.requestedBy?.username
                                  ),
                                  width: 48,
                                  height: 48,
                                  fontSize: "16px",
                                  fontWeight: "bold",
                                }}
                              >
                                {getUserInitials(req.requestedBy?.username)}
                              </Avatar>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  mb: 1,
                                }}
                              >
                                <DeleteForever
                                  sx={{
                                    color: designSystem.colors.error.main,
                                    fontSize: 20,
                                  }}
                                />
                                <Chip
                                  label="Delete Request"
                                  color="error"
                                  size="small"
                                  sx={{ fontWeight: "bold" }}
                                />
                                <Chip
                                  label={getRequestPriorityLabel(
                                    req.requestedAt
                                  )}
                                  size="small"
                                  sx={{
                                    background: getRequestPriorityColor(
                                      req.requestedAt
                                    ),
                                    color: "white",
                                    fontWeight: "bold",
                                  }}
                                />
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 0.5 }}
                              >
                                Requested by:{" "}
                                <strong>
                                  {req.requestedBy?.username || "Unknown User"}
                                </strong>
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {formatIndianDateTime(req.requestedAt)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={5}>
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1,
                                  flexWrap: "wrap",
                                  justifyContent: {
                                    xs: "flex-start",
                                    md: "flex-end",
                                  },
                                }}
                              >
                                <Tooltip title="Approve Deletion">
                                  <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    startIcon={<CheckCircle />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDialog(
                                        invoice._id,
                                        req._id,
                                        "delete",
                                        true
                                      );
                                    }}
                                    sx={{
                                      borderRadius:
                                        designSystem.borderRadius.md,
                                      fontWeight: "bold",
                                      textTransform: "none",
                                    }}
                                  >
                                    Approve
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Reject Deletion">
                                  <Button
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    startIcon={<Cancel />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDialog(
                                        invoice._id,
                                        req._id,
                                        "delete",
                                        false
                                      );
                                    }}
                                    sx={{
                                      borderRadius:
                                        designSystem.borderRadius.md,
                                      fontWeight: "bold",
                                      textTransform: "none",
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </Tooltip>
                              </Box>
                            </Grid>
                          </Grid>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 3, pb: 3 }}>
                          <Alert
                            severity="warning"
                            sx={{
                              borderRadius: designSystem.borderRadius.md,
                              mb: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              ⚠️ Deleting this invoice will permanently remove
                              it from the system.
                            </Typography>
                          </Alert>
                          <Box
                            sx={{
                              p: 2,
                              background: designSystem.colors.grey[50],
                              borderRadius: designSystem.borderRadius.sm,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, mb: 1 }}
                            >
                              📝 Reason for Deletion:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {req.reason || "No reason provided."}
                            </Typography>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  ))}
              </CardContent>
            </Card>
          </Zoom>
        ))}
      </Box>

      {/* Summary Footer */}
      <Box
        sx={{
          mt: 4,
          p: 3,
          borderRadius: designSystem.borderRadius.lg,
          background: designSystem.colors.grey[50],
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          📊 Showing {pendingInvoices.length} invoice
          {pendingInvoices.length !== 1 ? "s" : ""} with {totalPendingCount}{" "}
          pending request{totalPendingCount !== 1 ? "s" : ""}
        </Typography>
      </Box>
    </Box>
  );
};

export default PendingRequestsSection;
