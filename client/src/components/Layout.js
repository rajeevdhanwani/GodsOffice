import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  Box,
  IconButton,
} from "@mui/material";
import {
  Dashboard,
  People,
  Task,
  AdminPanelSettings,
  Home,
  Logout,
} from "@mui/icons-material";

const drawerWidth = 240;

const menuItems = [
  { text: "Home", icon: <Home />, path: "/" },
  { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
  { text: "Clients", icon: <People />, path: "/clients" },
  { text: "Tasks", icon: <Task />, path: "/tasks" },
  { text: "Admin Area", icon: <AdminPanelSettings />, path: "/admin" },
];

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      {/* AppBar on top */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" noWrap>
            GOD's Office
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Page Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar /> {/* adds space below AppBar */}
        <Outlet /> {/* renders the current route component */}
      </Box>
    </Box>
  );
};

export default Layout;
