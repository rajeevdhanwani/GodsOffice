import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Alert,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import "../styles/AdminAreaPage.css";

const AdminStages = () => {
  const [stages, setStages] = useState([]);
  const [newStage, setNewStage] = useState({ name: "", color: "#757575" });
  const [editStage, setEditStage] = useState(null);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErrors({ server: "Please log in to access this page" });
      navigate("/login");
      return null;
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // Fetch stages
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setErrors({ server: "Please log in to access this page" });
          navigate("/login");
          return;
        }

        const response = await fetch(
          "http://localhost:5000/api/action-stages",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            setErrors({ server: "Session expired. Please log in again." });
            localStorage.removeItem("token");
            navigate("/login");
            return;
          }
          throw new Error(data.message || "Failed to fetch stages");
        }

        setStages(data);
        setErrors({});
      } catch (err) {
        setErrors({ server: err.message || "Failed to load stages" });
      }
    };
    fetchStages();
  }, [navigate]);

  // Handle stage creation
  const handleCreateStage = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      if (!newStage.name.trim()) {
        setErrors({ newStage: "Stage name is required" });
        return;
      }

      const response = await fetch("http://localhost:5000/api/action-stages", {
        method: "POST",
        headers,
        body: JSON.stringify(newStage),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setErrors({ server: "Session expired. Please log in again." });
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        if (response.status === 403) {
          setErrors({ server: "Admin access required for this action." });
          return;
        }
        throw new Error(data.message || "Failed to create stage");
      }

      setStages([...stages, data]);
      setNewStage({ name: "", color: "#757575" });
      setErrors({});
    } catch (err) {
      setErrors({ server: err.message || "Failed to create stage" });
    }
  };

  // Handle stage update
  const handleUpdateStage = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      if (!editStage.name.trim()) {
        setErrors({ editStage: "Stage name is required" });
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/action-stages/${editStage._id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(editStage),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setErrors({ server: "Session expired. Please log in again." });
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        if (response.status === 403) {
          setErrors({ server: "Admin access required for this action." });
          return;
        }
        throw new Error(data.message || "Failed to update stage");
      }

      setStages(stages.map((s) => (s._id === data._id ? data : s)));
      setEditStage(null);
      setErrors({});
    } catch (err) {
      setErrors({ server: err.message || "Failed to update stage" });
    }
  };

  // Handle stage deletion
  const handleDeleteStage = async (id) => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      if (!window.confirm("Are you sure you want to delete this stage?")) {
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/action-stages/${id}`,
        {
          method: "DELETE",
          headers,
        }
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setErrors({ server: "Session expired. Please log in again." });
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        if (response.status === 403) {
          setErrors({ server: "Admin access required for this action." });
          return;
        }
        throw new Error(data.message || "Failed to delete stage");
      }

      setStages(stages.filter((s) => s._id !== id));
      setErrors({});
    } catch (err) {
      setErrors({ server: err.message || "Failed to delete stage" });
    }
  };

  return (
    <Container className="admin-area-container">
      <Box className="admin-area-box">
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
          <Typography variant="h4" className="admin-area-title">
            🎯 Manage Action Stages
          </Typography>
          <Button
            component={Link}
            to="/admin"
            variant="outlined"
            sx={{ ml: "auto" }}
          >
            Back to Admin
          </Button>
        </Box>

        {/* Error Messages */}
        {errors.server && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.server}
          </Alert>
        )}

        {/* Create New Stage */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Create New Action Stage
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Stage Name"
                  value={newStage.name}
                  onChange={(e) =>
                    setNewStage({ ...newStage, name: e.target.value })
                  }
                  fullWidth
                  error={!!errors.newStage}
                  helperText={errors.newStage}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Color"
                  type="color"
                  value={newStage.color}
                  onChange={(e) =>
                    setNewStage({ ...newStage, color: e.target.value })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button
                  variant="contained"
                  onClick={handleCreateStage}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  Create Stage
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Stages List */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Existing Action Stages ({stages.length})
            </Typography>
            {stages.length === 0 ? (
              <Typography color="text.secondary">
                No action stages found. Create one above.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {stages.map((stage) => (
                  <Grid item xs={12} sm={6} md={4} key={stage._id}>
                    <Card
                      variant="outlined"
                      sx={{
                        border: `2px solid ${stage.color}`,
                        backgroundColor: `${stage.color}10`,
                      }}
                    >
                      <CardContent>
                        {editStage && editStage._id === stage._id ? (
                          // Edit Mode
                          <Box>
                            <TextField
                              label="Stage Name"
                              value={editStage.name}
                              onChange={(e) =>
                                setEditStage({
                                  ...editStage,
                                  name: e.target.value,
                                })
                              }
                              fullWidth
                              sx={{ mb: 2 }}
                              error={!!errors.editStage}
                              helperText={errors.editStage}
                            />
                            <TextField
                              label="Color"
                              type="color"
                              value={editStage.color}
                              onChange={(e) =>
                                setEditStage({
                                  ...editStage,
                                  color: e.target.value,
                                })
                              }
                              fullWidth
                              sx={{ mb: 2 }}
                            />
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={handleUpdateStage}
                                sx={{ flex: 1 }}
                              >
                                Save
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setEditStage(null)}
                                sx={{ flex: 1 }}
                              >
                                Cancel
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          // View Mode
                          <Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  backgroundColor: stage.color,
                                  mr: 2,
                                }}
                              />
                              <Typography variant="subtitle1" fontWeight="bold">
                                {stage.name}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Color: {stage.color}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => setEditStage(stage)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteStage(stage._id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default AdminStages;
