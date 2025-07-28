// Enhanced Records Management Page - Professional & Visible Design
import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Avatar,
  Fade,
  Zoom,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Input as InputIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Dashboard as DashboardIcon,
  Today as TodayIcon,
  AdminPanelSettings as AdminIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import "../styles/RecordsManagementPage.css";
const RecordsManagementPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  // State management
  const [stats, setStats] = useState({
    inwardCount: 4, // Set default values based on your image
    outwardCount: 5,
    pendingReturns: 1,
    pendingApprovals: 1,
  });
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [fadeIn, setFadeIn] = useState(false);
  const [cardAnimations, setCardAnimations] = useState({
    inward: false,
    outward: false,
    pending: false,
    admin: false,
  });
  // Data fetching
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication required. Please log in to continue.");
          navigate("/login");
          return;
        }
        const [userRes, statsRes] = await Promise.all([
          fetch("${API_BASE_URL}/api/auth/user", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch("${API_BASE_URL}/api/records/dashboard/stats", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        ]);
        if (!userRes.ok && userRes.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        if (!statsRes.ok && statsRes.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        const [userDataResult, statsData] = await Promise.all([
          userRes.json(),
          statsRes.json(),
        ]);
        if (!userRes.ok) {
          throw new Error(
            userDataResult.message || "Failed to fetch user information"
          );
        }
        if (!statsRes.ok) {
          throw new Error(
            statsData.message || "Failed to fetch dashboard statistics"
          );
        }
        setUserData({
          ...userDataResult,
          name: userDataResult.name || "User",
          isAdmin: Boolean(userDataResult.isAdmin),
        });
        setStats({
          inwardCount: Math.max(0, parseInt(statsData.inwardCount) || 0),
          outwardCount: Math.max(0, parseInt(statsData.outwardCount) || 0),
          pendingReturns: Math.max(0, parseInt(statsData.pendingReturns) || 0),
          pendingApprovals: Math.max(
            0,
            parseInt(statsData.pendingApprovals) || 0
          ),
        });
        setError("");
        setTimeout(
          () => setCardAnimations((prev) => ({ ...prev, inward: true })),
          200
        );
        setTimeout(
          () => setCardAnimations((prev) => ({ ...prev, outward: true })),
          400
        );
        setTimeout(
          () => setCardAnimations((prev) => ({ ...prev, pending: true })),
          600
        );
        setTimeout(
          () => setCardAnimations((prev) => ({ ...prev, admin: true })),
          800
        );
      } catch (err) {
        setError(
          err.message || "Unable to load dashboard data. Please try again."
        );
        console.error("Dashboard data fetch error:", err);
        if (
          err.message.includes("Session expired") ||
          err.message.includes("Authentication")
        ) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );
  useEffect(() => {
    fetchData();
    const timer = setTimeout(() => setFadeIn(true), 150);
    return () => clearTimeout(timer);
  }, [fetchData]);
  // Navigation handlers
  const handlePendingReturnsClick = useCallback(() => {
    navigate("/records/inward", {
      state: {
        filters: { pendingReturns: "true" },
        highlightPending: true,
      },
    });
  }, [navigate]);
  const handlePendingApprovalsClick = useCallback(() => {
    if (userData.isAdmin) {
      navigate("/records/admin", {
        state: { focusOnApprovals: true },
      });
    }
  }, [userData.isAdmin, navigate]);
  const handleInwardRecordsClick = useCallback(() => {
    navigate("/records/inward");
  }, [navigate]);
  const handleOutwardRecordsClick = useCallback(() => {
    navigate("/records/outward");
  }, [navigate]);
  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);
  const handleBackToDashboard = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);
  // Loading component
  const LoadingComponent = () => (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress
          size={60}
          sx={{
            color: "#667eea",
            mb: 3,
            "& .MuiCircularProgress-circle": {
              strokeLinecap: "round",
            },
          }}
        />
        <Typography variant="h6" sx={{ color: "#64748b", fontWeight: 500 }}>
          Loading your dashboard...
        </Typography>
        <Typography variant="body2" sx={{ color: "#94a3b8", mt: 1 }}>
          Please wait while we fetch your latest data
        </Typography>
      </Box>
    </Container>
  );
  // Stats card component
  const StatsCard = ({
    title,
    count,
    icon,
    description,
    onClick,
    hasNotification,
    animationKey,
    cardType,
    delay = 0,
  }) => (
    <Grid item xs={12} sm={6} md={3}>
      <Zoom
        in={cardAnimations[animationKey]}
        timeout={600}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <Tooltip title={`Click to view ${title.toLowerCase()}`} arrow>
          <Card
            className={`stats-card ${cardType}`}
            onClick={onClick}
            sx={{
              height: isMobile ? 160 : 200,
              cursor: "pointer",
              transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              border: "none",
              borderRadius: 3,
              position: "relative",
              overflow: "hidden",
              backdropFilter: "blur(10px)",
              "&:hover": {
                transform: "translateY(-12px) scale(1.02)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
              },
              "&:active": {
                transform: "translateY(-6px) scale(1.01)",
              },
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                transition: "all 0.3s ease",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -50,
                left: -50,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
              }}
            />
            <CardContent
              sx={{ p: 3, position: "relative", zIndex: 1, height: "100%" }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Avatar
                  sx={{
                    bgcolor: "rgba(255,255,255,0.25)",
                    width: isMobile ? 45 : 55,
                    height: isMobile ? 45 : 55,
                    transition: "all 0.3s ease",
                  }}
                >
                  {icon}
                </Avatar>
                <Box textAlign="right">
                  <Typography
                    variant={isMobile ? "h4" : "h3"}
                    sx={{
                      fontWeight: 800,
                      mb: 0,
                      textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      color: "white",
                    }}
                  >
                    {count}
                  </Typography>
                </Box>
              </Box>
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                sx={{ fontWeight: 600, mb: 1, color: "white" }}
              >
                {title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  fontSize: isMobile ? "0.8rem" : "0.9rem",
                  lineHeight: 1.4,
                  color: "white",
                }}
              >
                {description}
              </Typography>
              {hasNotification && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    animation: "gentlePulse 3s infinite",
                    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                  }}
                />
              )}
            </CardContent>
          </Card>
        </Tooltip>
      </Zoom>
    </Grid>
  );
  if (loading) {
    return <LoadingComponent />;
  }
  return (
    <div className="records-dashboard">
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        {/* Back to Dashboard Button */}
        <Box sx={{ mb: 3 }}>
          <Tooltip title="Return to main dashboard" arrow>
            <Button
              onClick={handleBackToDashboard}
              startIcon={<ArrowBackIcon />}
              className="back-button"
              sx={{
                color: "#667eea",
                bgcolor: "rgba(102, 126, 234, 0.1)",
                border: "2px solid rgba(102, 126, 234, 0.2)",
                backdropFilter: "blur(10px)",
                fontWeight: 600,
                "&:hover": {
                  bgcolor: "rgba(102, 126, 234, 0.2)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 25px rgba(102, 126, 234, 0.25)",
                },
              }}
            >
              Back to Dashboard
            </Button>
          </Tooltip>
        </Box>
        {/* Enhanced Header */}
        <Fade in={fadeIn} timeout={1000}>
          <Paper
            elevation={0}
            className="dashboard-header"
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              p: isMobile ? 3 : 4,
              borderRadius: 4,
              mb: 4,
              position: "relative",
              overflow: "hidden",
              backdropFilter: "blur(20px)",
              maxWidth: 1200,
              mx: "auto",
              boxShadow: "0 20px 40px rgba(102, 126, 234, 0.3)",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 250,
                height: 250,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                animation: "floatGentle 8s ease-in-out infinite",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -40,
                left: -40,
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                animation: "floatGentle 6s ease-in-out infinite reverse",
              }}
            />
            <Box sx={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                mb={2}
              >
                <Avatar
                  sx={{
                    bgcolor: "rgba(255,255,255,0.25)",
                    width: isMobile ? 50 : 70,
                    height: isMobile ? 50 : 70,
                    mr: 3,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <DashboardIcon sx={{ fontSize: isMobile ? 25 : 35 }} />
                </Avatar>
                <Box>
                  <Typography
                    variant={isMobile ? "h4" : "h3"}
                    sx={{ fontWeight: 800, mb: 1, lineHeight: 1.2 }}
                  >
                    Records Management
                  </Typography>
                  <Typography
                    variant={isMobile ? "body1" : "h6"}
                    sx={{ opacity: 0.9 }}
                  >
                    Welcome back, {userData.name || "User"}!
                    {userData.isAdmin && (
                      <Chip
                        icon={<AdminIcon sx={{ fontSize: "1rem" }} />}
                        label="Administrator"
                        size="small"
                        sx={{
                          ml: 2,
                          background: "rgba(255,255,255,0.25)",
                          color: "white",
                          fontWeight: 600,
                          backdropFilter: "blur(10px)",
                        }}
                      />
                    )}
                  </Typography>
                </Box>
              </Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={2}
                mb={2}
              >
                <TodayIcon sx={{ fontSize: 20 }} />
                <Typography
                  variant="body1"
                  sx={{ opacity: 0.9, fontWeight: 500 }}
                >
                  {new Date().toLocaleDateString("en-GB", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="center" gap={2}>
                <Typography
                  variant="body1"
                  sx={{ opacity: 0.85, fontStyle: "italic" }}
                >
                  📋 Click on any card below to access the respective module
                </Typography>
                <Tooltip title="Refresh data" arrow>
                  <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    sx={{
                      color: "white",
                      bgcolor: "rgba(255,255,255,0.1)",
                      backdropFilter: "blur(10px)",
                      "&:hover": {
                        bgcolor: "rgba(255,255,255,0.2)",
                      },
                    }}
                  >
                    <RefreshIcon
                      sx={{
                        animation: refreshing
                          ? "spin 1s linear infinite"
                          : "none",
                      }}
                    />
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          </Paper>
        </Fade>
        {/* Error handling */}
        {error && (
          <Fade in={Boolean(error)} timeout={500}>
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
                maxWidth: 1200,
                mx: "auto",
              }}
              action={
                <Button color="inherit" size="small" onClick={handleRefresh}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Fade>
        )}
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4, maxWidth: 1200, mx: "auto" }}>
          <StatsCard
            title="Inward Records"
            count={stats.inwardCount}
            icon={<InputIcon sx={{ fontSize: isMobile ? 20 : 24 }} />}
            description="📥 Documents received and stored"
            onClick={handleInwardRecordsClick}
            animationKey="inward"
            cardType="inward-card"
            delay={0}
          />
          <StatsCard
            title="Outward Records"
            count={stats.outwardCount}
            icon={<SendIcon sx={{ fontSize: isMobile ? 20 : 24 }} />}
            description="📤 Documents sent and delivered"
            onClick={handleOutwardRecordsClick}
            animationKey="outward"
            cardType="outward-card"
            delay={200}
          />
          <StatsCard
            title="Pending Returns"
            count={stats.pendingReturns}
            icon={<ScheduleIcon sx={{ fontSize: isMobile ? 20 : 24 }} />}
            description="⏰ Items awaiting return"
            onClick={handlePendingReturnsClick}
            hasNotification={stats.pendingReturns > 0}
            animationKey="pending"
            cardType="pending-card"
            delay={400}
          />
          {userData.isAdmin && (
            <StatsCard
              title="Admin Approvals"
              count={stats.pendingApprovals}
              icon={
                stats.pendingApprovals > 0 ? (
                  <WarningIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                ) : (
                  <CheckCircleIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                )
              }
              description={
                stats.pendingApprovals > 0
                  ? "🔍 Records needing approval"
                  : "✅ All approvals complete"
              }
              onClick={handlePendingApprovalsClick}
              hasNotification={stats.pendingApprovals > 0}
              animationKey="admin"
              cardType="admin-card"
              delay={600}
            />
          )}
        </Grid>
        {/* CSS animations */}
        <style>
          {`
            @keyframes gentlePulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.9; }
            }
            @keyframes floatGentle {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-12px) rotate(2deg); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </Container>
    </div>
  );
};
export default RecordsManagementPage;
