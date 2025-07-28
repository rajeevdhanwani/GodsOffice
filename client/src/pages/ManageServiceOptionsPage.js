import React, { useState, useEffect } from "react";
import {
  Button,
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/ManageServiceOptionsPage.css";

// Styled components
const ProfessionalCard = styled(Box)(({ theme }) => ({
  borderRadius: 16,
  background: "rgba(255, 255, 255, 0.98)",
  backdropFilter: "blur(20px)",
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(4),
  boxShadow: theme.shadows[3],
  transition: theme.transitions.create(["transform", "box-shadow"]),
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: theme.shadows[5],
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  fontWeight: 600,
  textTransform: "none",
  padding: "12px 24px",
  transition: theme.transitions.create(["transform", "box-shadow"]),
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

const ManageServiceOptionsPage = () => {
  const [services, setServices] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editService, setEditService] = useState(null);
  const [formData, setFormData] = useState({
    serviceCode: "",
    serviceName: "",
    sacCode: "",
    serviceGroup: "",
    frequency: "Monthly",
    assignmentDates: [""],
    dueDate: "",
    shiftNextPeriod: true,
    repetitive: true,
    priority: "Medium",
    remarks: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Admin check on component mount
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/auth");
          return;
        }
        const response = await fetch("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const user = await response.json();
          setIsAdmin(user.isAdmin);
          if (!user.isAdmin) {
            navigate("/");
            return;
          }
        } else {
          const data = await response.json();
          if (
            data.message === "Invalid token" ||
            data.message === "Token expired"
          ) {
            localStorage.removeItem("token");
            navigate("/auth");
          }
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
        localStorage.removeItem("token");
        navigate("/auth");
      }
    };
    fetchUserDetails();
  }, [navigate]);

  // Fetch services on component mount
  useEffect(() => {
    if (!isAdmin) return;
    const fetchServices = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "http://localhost:5000/api/tasks/services",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch services");
        }
        setServices(data);
      } catch (err) {
        setErrors({ server: err.message || "Failed to load services" });
      }
    };
    fetchServices();
  }, [isAdmin]);

  // Clear errors/success after 5 seconds
  useEffect(() => {
    if (Object.keys(errors).length > 0 || success) {
      const timer = setTimeout(() => {
        setErrors({});
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errors, success]);

  const handleOpenDialog = (service = null) => {
    if (service) {
      setEditService(service);
      setFormData({
        serviceCode: service.serviceCode,
        serviceName: service.serviceName,
        sacCode: service.sacCode || "",
        serviceGroup: service.serviceGroup || "",
        frequency: service.frequency,
        assignmentDates: Array.isArray(service.assignmentDates)
          ? service.assignmentDates
          : [service.assignmentDates || ""],
        dueDate: service.dueDate || "",
        shiftNextPeriod: service.shiftNextPeriod || false,
        repetitive: service.repetitive || false,
        priority: service.priority || "Medium",
        remarks: service.remarks || "",
      });
    } else {
      setEditService(null);
      setFormData({
        serviceCode: "",
        serviceName: "",
        sacCode: "",
        serviceGroup: "",
        frequency: "Monthly",
        assignmentDates: [""],
        dueDate: "",
        shiftNextPeriod: true,
        repetitive: true,
        priority: "Medium",
        remarks: "",
      });
    }
    setErrors({});
    setSuccess("");
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditService(null);
    setFormData({
      serviceCode: "",
      serviceName: "",
      sacCode: "",
      serviceGroup: "",
      frequency: "Monthly",
      assignmentDates: [""],
      dueDate: "",
      shiftNextPeriod: true,
      repetitive: true,
      priority: "Medium",
      remarks: "",
    });
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFrequencyChange = (e) => {
    const frequency = e.target.value;
    setFormData((prev) => ({
      ...prev,
      frequency,
      assignmentDates:
        frequency === "On Demand" ? ["On Task Generation"] : [""],
      dueDate:
        frequency === "Weekly" || frequency === "On Demand" ? "7 days" : "",
      shiftNextPeriod:
        frequency === "Weekly" || frequency === "On Demand" ? false : true,
    }));
    setErrors((prev) => ({
      ...prev,
      frequency: "",
      assignmentDates: "",
      dueDate: "",
      shiftNextPeriod: "",
    }));
  };

  const handleAssignmentDateChange = (index, value) => {
    setFormData((prev) => {
      const newDates = [...prev.assignmentDates];
      newDates[index] = value;
      return { ...prev, assignmentDates: newDates };
    });
    setErrors((prev) => ({ ...prev, assignmentDates: "" }));
  };

  const addAssignmentDate = () => {
    setFormData((prev) => ({
      ...prev,
      assignmentDates: [...prev.assignmentDates, ""],
    }));
  };

  const removeAssignmentDate = (index) => {
    setFormData((prev) => ({
      ...prev,
      assignmentDates: prev.assignmentDates.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.serviceCode.trim()) {
      newErrors.serviceCode = "Service code is required";
    }
    if (!formData.serviceName.trim()) {
      newErrors.serviceName = "Service name is required";
    }
    if (
      !["Yearly", "Quarterly", "Monthly", "Weekly", "On Demand"].includes(
        formData.frequency
      )
    ) {
      newErrors.frequency = "Frequency is required";
    }
    if (
      formData.assignmentDates.length === 0 ||
      formData.assignmentDates.some((d) => !d)
    ) {
      newErrors.assignmentDates = "All assignment dates must be filled";
    } else if (formData.frequency === "Yearly") {
      if (
        formData.assignmentDates.some((d) => !d.match(/^\d{1,2}-[A-Za-z]{3}$/))
      ) {
        newErrors.assignmentDates =
          "Assignment dates must be in DD-MMM format (e.g., 01-Jun)";
      }
    } else if (
      formData.frequency === "Monthly" ||
      formData.frequency === "Quarterly"
    ) {
      if (
        formData.assignmentDates.some(
          (d) => isNaN(parseInt(d)) || parseInt(d) < 1 || parseInt(d) > 31
        )
      ) {
        newErrors.assignmentDates =
          "Assignment dates must be day numbers (1–31)";
      }
    } else if (formData.frequency === "Weekly") {
      if (
        formData.assignmentDates.some(
          (d) => isNaN(parseInt(d)) || parseInt(d) < 1 || parseInt(d) > 31
        )
      ) {
        newErrors.assignmentDates =
          "Weekly assignment dates must be day numbers (1–31)";
      }
    } else if (
      formData.frequency === "On Demand" &&
      formData.assignmentDates[0] !== "On Task Generation"
    ) {
      newErrors.assignmentDates =
        "On-Demand assignment dates must be 'On Task Generation'";
    }
    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    } else if (
      formData.frequency === "Yearly" &&
      !formData.dueDate.match(/^\d{1,2}-[A-Za-z]{3}$/)
    ) {
      newErrors.dueDate = "Due date must be in DD-MMM format (e.g., 31-Jul)";
    } else if (
      (formData.frequency === "Monthly" ||
        formData.frequency === "Quarterly") &&
      (isNaN(parseInt(formData.dueDate)) ||
        parseInt(formData.dueDate) < 1 ||
        parseInt(formData.dueDate) > 31)
    ) {
      newErrors.dueDate = "Due date must be a day number (1–31)";
    } else if (
      (formData.frequency === "Weekly" || formData.frequency === "On Demand") &&
      !formData.dueDate.match(/^\d+ days$/)
    ) {
      newErrors.dueDate = "Due date must be in 'N days' format (e.g., 7 days)";
    }
    if (formData.frequency === "Weekly" && formData.shiftNextPeriod) {
      newErrors.shiftNextPeriod = "Weekly services cannot shift to next period";
    }
    if (formData.frequency === "On Demand" && formData.shiftNextPeriod) {
      newErrors.shiftNextPeriod =
        "On-Demand services cannot shift to next period";
    }
    if (!["Low", "Medium", "High", "Critical"].includes(formData.priority)) {
      newErrors.priority = "Priority must be Low, Medium, High, or Critical";
    }
    if (formData.sacCode && !/^\d{6}$/.test(formData.sacCode)) {
      newErrors.sacCode = "SAC code must be 6 digits";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem("token");
      const method = editService ? "PUT" : "POST";
      const url = editService
        ? `http://localhost:5000/api/tasks/services/${editService._id}`
        : "http://localhost:5000/api/tasks/services";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save service");
      }

      setSuccess(
        editService
          ? "Service updated successfully!"
          : "Service created successfully!"
      );

      // Refresh services list
      const updatedServices = await fetch(
        "http://localhost:5000/api/tasks/services",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const servicesData = await updatedServices.json();
      setServices(servicesData);

      handleCloseDialog();
    } catch (err) {
      setErrors({ server: err.message || "Failed to save service" });
    }
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm("Are you sure you want to delete this service?"))
      return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/tasks/services/${serviceId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete service");
      }

      setServices((prev) =>
        prev.filter((service) => service._id !== serviceId)
      );
      setSuccess("Service deleted successfully!");
    } catch (err) {
      setErrors({ server: err.message || "Failed to delete service" });
    }
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4">Access Denied</Typography>
        <Typography>Only administrators can access this page.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <ProfessionalCard>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4" component="h1">
            Manage Service Options
          </Typography>
          <Box>
            <StyledButton
              variant="contained"
              color="primary"
              onClick={() => handleOpenDialog()}
              sx={{ mr: 2 }}
            >
              Add New Service
            </StyledButton>
            <StyledButton
              component={Link}
              to="/admin"
              variant="outlined"
              color="secondary"
            >
              Back to Admin Panel
            </StyledButton>
          </Box>
        </Box>

        <AnimatePresence>
          {errors.server && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.server}
              </Alert>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Service Code</TableCell>
                <TableCell>Service Name</TableCell>
                <TableCell>SAC Code</TableCell>
                <TableCell>Service Group</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Assignment Dates</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Shift Next Period</TableCell>
                <TableCell>Repetitive</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service._id}>
                  <TableCell>{service.serviceCode}</TableCell>
                  <TableCell>{service.serviceName}</TableCell>
                  <TableCell>{service.sacCode}</TableCell>
                  <TableCell>{service.serviceGroup}</TableCell>
                  <TableCell>{service.frequency}</TableCell>
                  <TableCell>
                    {Array.isArray(service.assignmentDates)
                      ? service.assignmentDates.join(", ")
                      : service.assignmentDates}
                  </TableCell>
                  <TableCell>{service.dueDate}</TableCell>
                  <TableCell>{service.priority}</TableCell>
                  <TableCell>
                    {service.shiftNextPeriod ? "Yes" : "No"}
                  </TableCell>
                  <TableCell>{service.repetitive ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <StyledButton
                      size="small"
                      onClick={() => handleOpenDialog(service)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </StyledButton>
                    <StyledButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(service._id)}
                    >
                      Delete
                    </StyledButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Service Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editService ? "Edit Service" : "Add New Service"}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
              <TextField
                name="serviceCode"
                label="Service Code"
                value={formData.serviceCode}
                onChange={handleInputChange}
                error={!!errors.serviceCode}
                helperText={errors.serviceCode}
                disabled={!!editService}
                fullWidth
              />
              <TextField
                name="serviceName"
                label="Service Name"
                value={formData.serviceName}
                onChange={handleInputChange}
                error={!!errors.serviceName}
                helperText={errors.serviceName}
                fullWidth
              />
              <TextField
                name="sacCode"
                label="SAC Code"
                value={formData.sacCode}
                onChange={handleInputChange}
                error={!!errors.sacCode}
                helperText={errors.sacCode || "6-digit code (optional)"}
                fullWidth
              />
              <TextField
                name="serviceGroup"
                label="Service Group"
                value={formData.serviceGroup}
                onChange={handleInputChange}
                fullWidth
              />
              <FormControl fullWidth error={!!errors.frequency}>
                <InputLabel>Frequency</InputLabel>
                <Select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleFrequencyChange}
                  label="Frequency"
                >
                  <MenuItem value="Yearly">Yearly</MenuItem>
                  <MenuItem value="Quarterly">Quarterly</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                  <MenuItem value="Weekly">Weekly</MenuItem>
                  <MenuItem value="On Demand">On Demand</MenuItem>
                </Select>
                {errors.frequency && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.frequency}
                  </Typography>
                )}
              </FormControl>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Assignment Dates
                  {formData.frequency === "Yearly" && " (DD-MMM, e.g., 01-Jun)"}
                  {(formData.frequency === "Monthly" ||
                    formData.frequency === "Quarterly") &&
                    " (Day of Month, e.g., 1)"}
                  {formData.frequency === "Weekly" &&
                    " (Days of Month, e.g., 1,8,15)"}
                  {formData.frequency === "On Demand" &&
                    " (On Task Generation)"}
                </Typography>
                {formData.frequency !== "On Demand" ? (
                  formData.assignmentDates.map((date, index) => (
                    <Box
                      key={index}
                      display="flex"
                      alignItems="center"
                      gap={1}
                      mb={1}
                    >
                      <TextField
                        value={date}
                        onChange={(e) =>
                          handleAssignmentDateChange(index, e.target.value)
                        }
                        placeholder={
                          formData.frequency === "Yearly"
                            ? "DD-MMM"
                            : formData.frequency === "Weekly"
                            ? "Day (1–31)"
                            : "Day (1–31)"
                        }
                        error={!!errors.assignmentDates}
                        helperText={index === 0 ? errors.assignmentDates : ""}
                        fullWidth
                      />
                      {formData.frequency === "Weekly" &&
                        formData.assignmentDates.length > 1 && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => removeAssignmentDate(index)}
                          >
                            Remove
                          </Button>
                        )}
                    </Box>
                  ))
                ) : (
                  <TextField
                    value={formData.assignmentDates[0]}
                    disabled
                    fullWidth
                    helperText={errors.assignmentDates}
                  />
                )}
                {formData.frequency === "Weekly" && (
                  <Button size="small" onClick={addAssignmentDate}>
                    Add Another Date
                  </Button>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Due Date
                  {formData.frequency === "Yearly" && " (DD-MMM, e.g., 31-Jul)"}
                  {(formData.frequency === "Monthly" ||
                    formData.frequency === "Quarterly") &&
                    " (Day of Month, e.g., 11)"}
                  {(formData.frequency === "Weekly" ||
                    formData.frequency === "On Demand") &&
                    " (N days, e.g., 7 days)"}
                </Typography>
                <TextField
                  value={formData.dueDate}
                  onChange={(e) =>
                    handleInputChange({
                      target: { name: "dueDate", value: e.target.value },
                    })
                  }
                  placeholder={
                    formData.frequency === "Yearly"
                      ? "DD-MMM"
                      : formData.frequency === "Monthly" ||
                        formData.frequency === "Quarterly"
                      ? "Day (1–31)"
                      : "N days"
                  }
                  error={!!errors.dueDate}
                  helperText={errors.dueDate}
                  fullWidth
                />
              </Box>
              <FormControl fullWidth error={!!errors.priority}>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  label="Priority"
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
                {errors.priority && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.priority}
                  </Typography>
                )}
              </FormControl>
              <Box>
                <Tooltip
                  title={
                    formData.frequency === "Weekly" ||
                    formData.frequency === "On Demand"
                      ? "Weekly and On-Demand services cannot shift to next period"
                      : "Allow tasks to shift to next period if missed"
                  }
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="shiftNextPeriod"
                        checked={formData.shiftNextPeriod}
                        onChange={handleInputChange}
                        disabled={
                          formData.frequency === "Weekly" ||
                          formData.frequency === "On Demand"
                        }
                      />
                    }
                    label="Shift to Next Period"
                  />
                </Tooltip>
                {errors.shiftNextPeriod && (
                  <Typography variant="caption" color="error" display="block">
                    {errors.shiftNextPeriod}
                  </Typography>
                )}
                <FormControlLabel
                  control={
                    <Checkbox
                      name="repetitive"
                      checked={formData.repetitive}
                      onChange={handleInputChange}
                    />
                  }
                  label="Repetitive Service"
                />
              </Box>
              <TextField
                name="remarks"
                label="Remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <StyledButton onClick={handleCloseDialog}>Cancel</StyledButton>
            <StyledButton onClick={handleSubmit} variant="contained">
              {editService ? "Update" : "Create"}
            </StyledButton>
          </DialogActions>
        </Dialog>
      </ProfessionalCard>
    </Container>
  );
};

export default ManageServiceOptionsPage;
