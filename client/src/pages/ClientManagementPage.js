import React, { useState, useEffect } from "react";
import {
  Button,
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Divider,
} from "@mui/material";
import { Link } from "react-router-dom";
import {
  Home as HomeIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Phone as PhoneIcon,
} from "@mui/icons-material";
import "../styles/ClientManagementPage.css";
// import API_BASE_URL from "../config"; // adjust path based on file depth



const ClientManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    thisMonth: 0,
    recentClients: [],
    activeClients: 0,
  });
  useEffect(() => {
    fetchClientData();
  }, []);
  const fetchClientData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("${API_BASE_URL}/api/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const clientData = await response.json();
        calculateStats(clientData);
      } else {
        console.error("Error fetching clients");
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setLoading(false);
    }
  };
  const calculateStats = (clientData) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate clients added this month
    const thisMonthClients = clientData.filter((client) => {
      if (!client.withUsSince) return false;
      const clientDate = new Date(client.withUsSince);
      return (
        clientDate.getMonth() === currentMonth &&
        clientDate.getFullYear() === currentYear
      );
    });
    // Get recent clients (last 5 added)
    const sortedByDate = [...clientData]
      .filter((client) => client.withUsSince)
      .sort((a, b) => new Date(b.withUsSince) - new Date(a.withUsSince))
      .slice(0, 5);
    // Calculate active clients (clients with contact info)
    const activeClients = clientData.filter(
      (client) => client.contact || client.email
    ).length;
    setStats({
      totalClients: clientData.length,
      thisMonth: thisMonthClients.length,
      recentClients: sortedByDate,
      activeClients: activeClients,
    });
  };
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  if (loading) {
    return (
      <Container maxWidth="lg" className="client-management-container">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2, color: "white" }}>
            Loading dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }
  return (
    <Container maxWidth="lg" className="client-management-container">
      <Box className="client-management-box">
        {/* Header Section */}
        <Box className="dashboard-header">
          <Typography variant="h3" className="management-title">
            Client Management Dashboard
          </Typography>
          <Typography variant="h6" className="dashboard-subtitle">
            Welcome back! Here&apos;s what&apos;s happening with your clients
            today.
          </Typography>
        </Box>
        {/* Statistics Cards */}
        <Grid container spacing={3} className="stats-section">
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card stat-card-primary">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h4" className="stat-number">
                      {stats.totalClients}
                    </Typography>
                    <Typography variant="body2" className="stat-label">
                      Total Clients
                    </Typography>
                  </Box>
                  <Avatar className="stat-icon stat-icon-primary">
                    <PeopleIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card stat-card-success">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h4" className="stat-number">
                      {stats.thisMonth}
                    </Typography>
                    <Typography variant="body2" className="stat-label">
                      Added This Month
                    </Typography>
                  </Box>
                  <Avatar className="stat-icon stat-icon-success">
                    <TrendingUpIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card stat-card-info">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h4" className="stat-number">
                      {stats.activeClients}
                    </Typography>
                    <Typography variant="body2" className="stat-label">
                      Active Clients
                    </Typography>
                  </Box>
                  <Avatar className="stat-icon stat-icon-info">
                    <BusinessIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card stat-card-warning">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h4" className="stat-number">
                      {stats.totalClients - stats.activeClients}
                    </Typography>
                    <Typography variant="body2" className="stat-label">
                      Inactive Clients
                    </Typography>
                  </Box>
                  <Avatar className="stat-icon stat-icon-warning">
                    <ScheduleIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        {/* Main Content Area */}
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {/* Action Cards */}
          <Grid item xs={12} md={8}>
            <Typography variant="h5" className="section-title">
              Quick Actions
            </Typography>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <Card className="action-card action-card-add">
                  <CardContent className="action-card-content">
                    <PersonAddIcon className="action-icon" />
                    <Typography variant="h6" className="action-title">
                      Add New Client
                    </Typography>
                    <Typography variant="body2" className="action-description">
                      Register a new client with complete details
                    </Typography>
                    <Button
                      variant="contained"
                      component={Link}
                      to="/clients/add"
                      fullWidth
                      className="action-button action-button-add"
                      sx={{ mt: 2 }}
                    >
                      Add Client
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card className="action-card action-card-update">
                  <CardContent className="action-card-content">
                    <EditIcon className="action-icon" />
                    <Typography variant="h6" className="action-title">
                      Update Client
                    </Typography>
                    <Typography variant="body2" className="action-description">
                      Modify existing client information
                    </Typography>
                    <Button
                      variant="contained"
                      component={Link}
                      to="/clients/update"
                      fullWidth
                      className="action-button action-button-update"
                      sx={{ mt: 2 }}
                    >
                      Update Client
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card className="action-card action-card-info">
                  <CardContent className="action-card-content">
                    <InfoIcon className="action-icon" />
                    <Typography variant="h6" className="action-title">
                      Client Information
                    </Typography>
                    <Typography variant="body2" className="action-description">
                      View detailed client profiles and history
                    </Typography>
                    <Button
                      variant="contained"
                      component={Link}
                      to="/clients/info"
                      fullWidth
                      className="action-button action-button-info"
                      sx={{ mt: 2 }}
                    >
                      View Clients
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          {/* Recent Activity Sidebar */}
          <Grid item xs={12} md={4}>
            <Card className="recent-activity-card">
              <CardContent>
                <Typography variant="h6" className="section-title">
                  Recent Clients
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Latest client additions
                </Typography>

                {stats.recentClients.length > 0 ? (
                  <List dense>
                    {stats.recentClients.map((client, index) => (
                      <React.Fragment key={client._id || index}>
                        <ListItem className="recent-client-item">
                          <ListItemAvatar>
                            <Avatar className="client-avatar">
                              {getInitials(client.clientName)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography
                                  variant="subtitle2"
                                  className="client-name"
                                >
                                  {client.clientName}
                                </Typography>
                                <Chip
                                  label="NEW"
                                  size="small"
                                  className="new-client-chip"
                                />
                              </Box>
                            }
                            secondary={
                              <React.Fragment>
                                <Typography
                                  variant="caption"
                                  display="block"
                                  component="span"
                                >
                                  <BusinessIcon
                                    sx={{
                                      fontSize: 12,
                                      mr: 0.5,
                                      verticalAlign: "middle",
                                    }}
                                  />
                                  {client.firmName}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  component="span"
                                >
                                  <ScheduleIcon
                                    sx={{
                                      fontSize: 12,
                                      mr: 0.5,
                                      verticalAlign: "middle",
                                    }}
                                  />
                                  Joined: {formatDate(client.withUsSince)}
                                </Typography>
                              </React.Fragment>
                            }
                          />
                          {client.contact && (
                            <PhoneIcon
                              sx={{ fontSize: 16, color: "text.secondary" }}
                            />
                          )}
                        </ListItem>
                        {index < stats.recentClients.length - 1 && (
                          <Divider variant="inset" component="li" />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box textAlign="center" py={3}>
                    <PeopleIcon
                      sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      No recent client additions
                    </Typography>
                  </Box>
                )}
                {stats.recentClients.length > 0 && (
                  <Box mt={2}>
                    <Button
                      component={Link}
                      to="/clients/info"
                      variant="outlined"
                      size="small"
                      fullWidth
                      className="view-all-button"
                    >
                      View All Clients
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        {/* Navigation */}
        <Box className="navigation-section" sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            color="primary"
            component={Link}
            to="/"
            startIcon={<HomeIcon />}
            className="home-button"
            size="large"
          >
            Back to Home
          </Button>
        </Box>
      </Box>
    </Container>
  );
};
export default ClientManagementPage;
