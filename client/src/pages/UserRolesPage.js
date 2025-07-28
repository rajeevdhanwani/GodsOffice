// client/src/pages/UserRolesPage.js
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Select, MenuItem, FormControl, InputLabel, Chip, Alert, Snackbar,
  IconButton, Tooltip
} from '@mui/material';
import {
  Home as HomeIcon,
  Refresh as RefreshIcon,
  VpnKey as RolesIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from "../config"; // adjust path based on file depth


const UserRolesPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ users: [], roles: [], roleCounts: {} });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const API_BASE = process.env.REACT_APP_API_URL || '${API_BASE_URL}/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error fetching user data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole, isAdmin = false) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole, isAdmin })
      });
      
      if (response.ok) {
        await fetchData();
        showSnackbar(`User role updated to ${newRole}${isAdmin ? ' (Admin)' : ''}`, 'success');
      } else {
        throw new Error('Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showSnackbar('Error updating user role', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': 'error',
      'Manager': 'warning', 
      'Executive': 'info',
      'Staff': 'default'
    };
    return colors[role] || 'default';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <RolesIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            User Role Management
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={() => navigate('/admin')} sx={{ mr: 1 }}>
            <HomeIcon />
          </IconButton>
          <IconButton onClick={fetchData}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Role Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Role Summary</Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            {Object.entries(data.roleCounts).map(([role, count]) => (
              <Chip 
                key={role} 
                label={`${role}: ${count}`} 
                color={getRoleColor(role)}
                variant="outlined"
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Manage user roles and admin privileges. Admin users have full system access regardless of their role.
      </Alert>

      {/* Users Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>User Role Assignment</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Username</strong></TableCell>
                  <TableCell><strong>Current Role</strong></TableCell>
                  <TableCell><strong>Admin Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {user.username}
                      </Typography>
                      {user.teamMemberId && (
                        <Typography variant="caption" color="text.secondary">
                          Team ID: {user.teamMemberId}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.isAdmin ? 'Admin' : 'User'} 
                        color={user.isAdmin ? 'error' : 'default'} 
                        size="small"
                        variant={user.isAdmin ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>Role</InputLabel>
                          <Select
                            value={user.role}
                            label="Role"
                            onChange={(e) => updateUserRole(user._id, e.target.value, user.isAdmin)}
                          >
                            {data.roles.map(role => (
                              <MenuItem key={role} value={role}>{role}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <Tooltip title={user.isAdmin ? 'Remove admin privileges' : 'Grant admin privileges'}>
                          <Button
                            size="small"
                            variant={user.isAdmin ? "outlined" : "contained"}
                            color={user.isAdmin ? "default" : "error"}
                            onClick={() => updateUserRole(user._id, user.role, !user.isAdmin)}
                            sx={{ minWidth: 100 }}
                          >
                            {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </Button>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserRolesPage;
