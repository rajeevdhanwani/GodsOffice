import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Avatar,
  Chip,
  Fade,
  Grow,
} from "@mui/material";
import {
  People as UsersIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Storage as DatabaseIcon,
  Assessment as ReportsIcon,
  CloudUpload as UploadIcon,
  AdminPanelSettings as AdminIcon,
  Home as HomeIcon,
  Build as SystemIcon,
  Backup as BackupIcon,
  Update as UpdateIcon,
  Receipt as InvoiceIcon,
  AutoAwesome as AIIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import "../styles/AdminAreaPage.css";

const AdminAreaPage = () => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const adminModules = [
    {
      title: "User Management",
      icon: <UsersIcon />,
      description: "Manage user accounts, roles and permissions",
      color: "#2196F3",
      stats: "24 Users",
      path: "/admin/users",
    },
    {
      title: "System Settings",
      icon: <SettingsIcon />,
      description: "Configure application settings, including invoice preferences",
      color: "#4CAF50",
      stats: "12 Settings",
      path: "/admin/settings",
    },
    {
      title: "Security & Access",
      icon: <SecurityIcon />,
      description: "Manage security policies and access controls",
      color: "#FF9800",
      stats: "Active",
      path: "/admin/security",
    },
    {
      title: "Database Management",
      icon: <DatabaseIcon />,
      description: "Database operations and maintenance",
      color: "#9C27B0",
      stats: "Healthy",
      path: "/admin/database",
    },
    {
      title: "Invoice Management",
      icon: <InvoiceIcon />,
      description:
        "Configure invoice settings, AI pricing, and service providers",
      color: "#E91E63",
      stats: "AI Enabled",
      path: "/admin/invoice-settings",
      isNew: true,
    },
    {
      title: "System Reports",
      icon: <ReportsIcon />,
      description: "View system analytics and performance reports",
      color: "#6610f2",
      stats: "5 Reports",
      path: "/admin/reports",
    },
    {
      title: "File Management",
      icon: <UploadIcon />,
      description: "Upload and manage master files",
      color: "#607D8B",
      stats: "Ready",
      path: "/admin/upload",
    },
    {
      title: "Service Options",
      icon: <SystemIcon />,
      description: "Configure available service options",
      color: "#795548",
      stats: "15 Services",
      path: "/admin/services",
    },
    {
      title: "Workflow Stages",
      icon: <UpdateIcon />,
      description: "Manage workflow stages and processes",
      color: "#FF5722",
      stats: "8 Stages",
      path: "/admin/stages",
    },
    {
      title: "Backup & Restore",
      icon: <BackupIcon />,
      description: "System backup and restore operations",
      color: "#3F51B5",
      stats: "Last: Today",
      path: "/admin/backup",
    },
  ];

  const handleModuleClick = (module) => {
    const moduleElement = document.querySelector(
      `[data-admin-module="${module.title}"]`
    );
    if (moduleElement) {
      moduleElement.classList.add("clicking");
    }
    setTimeout(() => {
      navigate(module.path);
    }, 300);
  };

  const handleCardHover = (index) => {
    setHoveredCard(index);
  };

  const handleCardLeave = () => {
    setHoveredCard(null);
  };

  const handleHomeClick = () => {
    navigate("/");
  };

  return (
    <div className="admin-area-container">
      <Container maxWidth="xl">
        <Fade in={loaded} timeout={800}>
          <Box className="admin-header" mb={4}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
            >
              <Box>
                <Typography variant="h3" className="admin-title">
                  <AdminIcon
                    sx={{ fontSize: 48, mr: 2, verticalAlign: "middle" }}
                  />
                  Administrator Area
                </Typography>
                <Typography variant="h6" color="textSecondary">
                  Global system administration and configuration
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={handleHomeClick}
                className="home-button"
                size="large"
              >
                Back to Home
              </Button>
            </Box>
          </Box>
        </Fade>

        <Fade in={loaded} timeout={1000}>
          <Box className="admin-stats" mb={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card className="stat-card">
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: "#2196F3", mr: 2 }}>
                        <UsersIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h4">24</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total Users
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card className="stat-card">
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: "#4CAF50", mr: 2 }}>
                        <SystemIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h4">99.9%</Typography>
                        <Typography variant="body2" color="textSecondary">
                          System Uptime
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card className="stat-card">
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: "#FF9800", mr: 2 }}>
                        <DatabaseIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h4">2.4GB</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Database Size
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card className="stat-card">
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: "#E91E63", mr: 2 }}>
                        <InvoiceIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h4">
                          <AIIcon sx={{ fontSize: 20, mr: 0.5 }} />
                          AI
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Invoice AI Status
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Fade>

        <Fade in={loaded} timeout={1400}>
          <Box className="admin-modules">
            <Typography variant="h4" gutterBottom className="section-title">
              Administration Modules
            </Typography>
            <Grid container spacing={3}>
              {adminModules.map((module, index) => (
                <Grid item xs={12} sm={6} lg={4} key={index}>
                  <Grow in={loaded} timeout={1000 + index * 150}>
                    <Card
                      className={`admin-card ${
                        hoveredCard === index ? "hovered" : ""
                      }`}
                      onMouseEnter={() => handleCardHover(index)}
                      onMouseLeave={handleCardLeave}
                      onClick={() => handleModuleClick(module)}
                      data-admin-module={module.title}
                      style={{ "--module-color": module.color }}
                      sx={{
                        cursor: "pointer",
                        minHeight: 200,
                        position: "relative",
                        border: module.isNew ? "2px solid #ff4081" : "none",
                      }}
                    >
                      {module.isNew && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            backgroundColor: "#ff4081",
                            color: "white",
                            borderRadius: "12px",
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            zIndex: 1,
                          }}
                        >
                          NEW
                        </Box>
                      )}
                      <CardContent>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          mb={2}
                        >
                          <Avatar
                            sx={{
                              backgroundColor: module.color,
                              width: 56,
                              height: 56,
                            }}
                          >
                            {module.icon}
                          </Avatar>
                          <Chip
                            label={module.stats}
                            size="small"
                            sx={{
                              backgroundColor: module.color + "20",
                              color: module.color,
                              fontWeight: "bold",
                            }}
                          />
                        </Box>
                        <Typography variant="h5" gutterBottom>
                          {module.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          mb={3}
                        >
                          {module.description}
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          className="admin-button"
                          sx={{
                            backgroundColor: module.color,
                            "&:hover": {
                              backgroundColor: module.color + "dd",
                            },
                          }}
                        >
                          Open {module.title}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grow>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Fade>

        <Box mt={6} textAlign="center">
          <Typography variant="body2" color="textSecondary">
            Administrator Access Only • Handle with Care
          </Typography>
        </Box>
      </Container>
    </div>
  );
};

export default AdminAreaPage;