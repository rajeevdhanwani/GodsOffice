import React, { useState } from "react";
import {
  Button,
  Container,
  Typography,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Box,
  Avatar,
  Fade,
  Grow,
} from "@mui/material";
import {
  People,
  Assignment,
  Folder,
  Receipt,
  Assessment,
  AdminPanelSettings,
} from "@mui/icons-material";
import "../styles/WelcomePage.css";
const WelcomePage = () => {
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [hoveredCard, setHoveredCard] = useState(null);
  const modules = [
    {
      title: "Client Management",
      icon: <People />,
      description: "Manage client relationships and details",
      color: "#0288D1",
      path: "/clients",
    },
    {
      title: "Task Management",
      icon: <Assignment />,
      description: "Track and organize work assignments",
      color: "#388E3C",
      path: "/tasks",
    },
    {
      title: "Records Management",
      icon: <Folder />,
      description: "Handle inward and outward records efficiently",
      color: "#F57C00",
      path: "/records",
    },
    {
      title: "Invoice Management",
      icon: <Receipt />,
      description: "Monitor financial transactions and invoices",
      color: "#C2185B",
      path: "/invoices", // Instead of "/records"
    },
    {
      title: "Reports Management",
      icon: <Assessment />,
      description: "Generate insights and performance reports",
      color: "#7B1FA2",
      path: "/reports",
    },
  ];
  const adminModule = {
    title: "Administrator Area",
    icon: <AdminPanelSettings />,
    description: "Configure system settings and import files",
    color: "#607D8B",
    path: "/admin",
  };
  const handleModuleClick = (module) => {
    const moduleElement = document.querySelector(
      `[data-module="${module.title}"]`
    );
    if (moduleElement) {
      moduleElement.classList.add("clicking");
    }
    setTimeout(() => {
      window.location.href = module.path;
    }, 300);
  };
  const handleCardHover = (index) => {
    setHoveredCard(index);
  };
  const handleCardLeave = () => {
    setHoveredCard(null);
  };
  return (
    <div className="welcome-page-wrapper">
      <div className="background-animation">
        <div className="floating-bubble bubble-1"></div>
        <div className="floating-bubble bubble-2"></div>
        <div className="floating-bubble bubble-3"></div>
        <div className="floating-bubble bubble-4"></div>
        <div className="floating-bubble bubble-5"></div>
      </div>
      <Container maxWidth="xl" className="welcome-container">
        <Fade in timeout={800}>
          <Box className="welcome-header">
            <Box className="header-content">
              <Box className="year-selector-container">
                <Typography variant="caption" className="year-label">
                  Financial Year
                </Typography>
                <Select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="year-select"
                  size="small"
                >
                  <MenuItem value="2024-25">2024-25</MenuItem>
                  <MenuItem value="2025-26">2025-26</MenuItem>
                </Select>
              </Box>
              <Box className="admin-button-container">
                <Button
                  className="admin-button"
                  onClick={() => handleModuleClick(adminModule)}
                  data-module={adminModule.title}
                  style={{ backgroundColor: adminModule.color }}
                >
                  <AdminPanelSettings className="admin-icon" />
                  {adminModule.title}
                </Button>
              </Box>
            </Box>
            <Box className="title-section">
              <Typography variant="h2" className="welcome-title">
                Welcome to <span className="brand-name">GodsOffice</span>
              </Typography>
              <Typography variant="h6" className="welcome-subtitle">
                Streamline your business with ease and elegance
              </Typography>
            </Box>
          </Box>
        </Fade>
        <Fade in timeout={1400}>
          <Box className="modules-section">
            <Typography variant="h4" className="main-title">
              Core Business Modules
            </Typography>
            <Grid container spacing={3} className="modules-grid">
              {modules.map((module, index) => (
                <Grid item xs={12} sm={6} lg={2.4} key={index}>
                  <Grow in timeout={1000 + index * 150}>
                    <Card
                      className={`module-card ${
                        hoveredCard === index ? "hovered" : ""
                      }`}
                      onMouseEnter={() => handleCardHover(index)}
                      onMouseLeave={handleCardLeave}
                      onClick={() => handleModuleClick(module)}
                      data-module={module.title}
                      style={{ "--module-color": module.color }}
                    >
                      <CardContent className="card-content">
                        <Box className="card-header">
                          <Avatar
                            className="module-icon"
                            style={{ backgroundColor: module.color }}
                          >
                            {module.icon}
                          </Avatar>
                        </Box>
                        <Typography variant="h5" className="module-title">
                          {module.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          className="module-description"
                        >
                          {module.description}
                        </Typography>
                        <Button
                          variant="contained"
                          className="module-button"
                          style={{ backgroundColor: module.color }}
                          fullWidth
                        >
                          Explore {module.title}
                          <span className="button-arrow">→</span>
                        </Button>
                      </CardContent>
                      <div className="card-glow"></div>
                    </Card>
                  </Grow>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Fade>
        <Box className="welcome-footer">
          <Typography variant="body2" className="footer-text">
            © 2025 GodsOffice. All rights reserved.
          </Typography>
          <Box className="footer-actions">
            <Button size="small" className="footer-link">
              Help Center
            </Button>
            <Button size="small" className="footer-link">
              Support
            </Button>
            <Button size="small" className="footer-link">
              Documentation
            </Button>
          </Box>
        </Box>
      </Container>
    </div>
  );
};
export default WelcomePage;
