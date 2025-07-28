// client/src/pages/UserManagementPage.js
import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  InputAdornment,
  Switch,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Home as HomeIcon,
  People as UsersIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config"; // ✅ Correct import

const UserManagementPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "",
    isAdmin: false,
    teamMemberId: "",
  });
  const roles = ["Manager", "Executive", "Admin", "Staff"];

  const getAuthToken = () => localStorage.getItem("token");

  const fetchUsers = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const result = await response.json();
        setUsers(result.data || []);
        setFilteredUsers(result.data || []);
      } else {
        throw new Error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      showSnackbar("Error fetching users", "error");
    }
  };

  const fetchTeamMembers = async (editingUserId = null) => {
    try {
      const token = getAuthToken();
      const url = editingUserId
        ? `${API_BASE_URL}/api/users/team-members/available?editingUserId=${editingUserId}`
        : `${API_BASE_URL}/api/users/team-members/available`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const result = await response.json();
        setTeamMembers(result.data || []);
      } else {
        throw new Error("Failed to fetch team members");
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchTeamMembers()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    let filtered = users;
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.teamMemberInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterRole) {
      filtered = filtered.filter((user) => user.role === filterRole);
    }
    setFilteredUsers(filtered);
  }, [users, searchTerm, filterRole]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = async (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: "",
        role: user.role,
        isAdmin: user.isAdmin,
        teamMemberId: user.teamMemberId || "",
      });
      await fetchTeamMembers(user._id);
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        password: "",
        role: "",
        isAdmin: false,
        teamMemberId: "",
      });
      await fetchTeamMembers();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      username: "",
      password: "",
      role: "",
      isAdmin: false,
      teamMemberId: "",
    });
    setShowPassword(false);
  };

  const handleSubmit = async () => {
    try {
      const token = getAuthToken();
      const method = editingUser ? "PUT" : "POST";
      const url = editingUser
        ? `${API_BASE_URL}/api/users/${editingUser._id}`
        : `${API_BASE_URL}/api/users`;

      const submitData = { ...formData };
      if (editingUser && !submitData.password) {
        delete submitData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        await fetchUsers();
        await fetchTeamMembers();
        handleCloseDialog();
        showSnackbar(`User ${editingUser ? "updated" : "created"} successfully`);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to save user");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      showSnackbar(error.message, "error");
    }
  };

  // Handle user deletion
const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        await fetchUsers();
        await fetchTeamMembers();
        showSnackbar("User deleted successfully");
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showSnackbar(error.message, "error");
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      Admin: "#f44336",
      Manager: "#2196f3",
      Executive: "#4caf50",
      Staff: "#ff9800",
    };
    return colors[role] || "#757575";
  };
  
  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Typography variant="h6">Loading users...</Typography>
        </Box>
      </Container>
    );
  }
  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h3" sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <UsersIcon sx={{ fontSize: 48, mr: 2 }} />
              User Management
            </Typography>
            <Typography variant="h6" color="textSecondary">
              Manage user accounts, roles, and permissions
            </Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => navigate("/admin")}
              sx={{ mr: 2 }}
            >
              Back to Admin
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              color="primary"
            >
              Add User
            </Button>
          </Box>
        </Box>
      </Box>
      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon sx={{ fontSize: 40, mr: 2, color: "#2196f3" }} />
                <Box>
                  <Typography variant="h4">{users.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AdminIcon sx={{ fontSize: 40, mr: 2, color: "#f44336" }} />
                <Box>
                  <Typography variant="h4">
                    {users.filter(user => user.isAdmin).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Administrators
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <UsersIcon sx={{ fontSize: 40, mr: 2, color: "#4caf50" }} />
                <Box>
                  <Typography variant="h4">
                    {users.filter(user => user.teamMemberId).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Linked to Team
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon sx={{ fontSize: 40, mr: 2, color: "#ff9800" }} />
                <Box>
                  <Typography variant="h4">
                    {teamMembers.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Available Team Members
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search Users"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth sx={{ minWidth: 150 }}>
                <InputLabel>Filter by Role</InputLabel>
                <Select
                  value={filterRole}
                  label="Filter by Role"
                  onChange={(e) => setFilterRole(e.target.value)}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        width: 'auto',
                        minWidth: 200,
                      },
                    },
                  }}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="textSecondary">
                Showing {filteredUsers.length} of {users.length} users
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {/* Users Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Username</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Admin</strong></TableCell>
                  <TableCell><strong>Team Member</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <PersonIcon sx={{ mr: 1, color: "text.secondary" }} />
                        {user.username}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        sx={{
                          backgroundColor: getRoleColor(user.role),
                          color: "white",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Chip
                          label="Admin"
                          size="small"
                          color="error"
                          icon={<AdminIcon />}
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          User
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.teamMemberInfo ? (
                        <Box>
                          <Typography variant="body2">
                            {user.teamMemberInfo.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {user.teamMemberInfo.designation}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          Not linked
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit User">
                        <IconButton
                          onClick={() => handleOpenDialog(user)}
                          color="primary"
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete User">
                        <IconButton
                          onClick={() => handleDelete(user._id)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body1" color="textSecondary" py={4}>
                        No users found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      {/* Create/Edit User Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {editingUser ? "Edit User" : "Create New User"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              {/* Team Member Selection - First */}
              <Grid item xs={12}>
                <FormControl fullWidth sx={{ minWidth: 200 }}>
                  <InputLabel>Link to Team Member</InputLabel>
                  <Select
                    value={formData.teamMemberId}
                    label="Link to Team Member"
                    onChange={(e) =>
                      setFormData({ ...formData, teamMemberId: e.target.value })
                    }
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                          width: 'auto',
                          minWidth: 300,
                        },
                      },
                    }}
                  >
                    <MenuItem value="">No team member</MenuItem>
                    {teamMembers.map((member) => (
                      <MenuItem key={member._id} value={member.teamMemberId}>
                        {member.name} - {member.designation}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Role Selection - Second */}
              <Grid item xs={12}>
                <FormControl fullWidth required sx={{ minWidth: 200 }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={formData.role}
                    label="Role"
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                          width: 'auto',
                          minWidth: 200,
                        },
                      },
                    }}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Username - Third */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
              </Grid>
              
              {/* Password - Fourth */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!editingUser}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              {/* Admin privileges switch */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isAdmin}
                      onChange={(e) =>
                        setFormData({ ...formData, isAdmin: e.target.checked })
                      }
                    />
                  }
                  label="Grant Administrator Privileges"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.username || !formData.role || (!editingUser && !formData.password)}
          >
            {editingUser ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
export default UserManagementPage;