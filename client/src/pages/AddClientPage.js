import React, { useState } from 'react';
import {
  Button,
  TextField,
  Typography,
  Container,
  Box,
} from '@mui/material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/AddClientPage.css';

const AddClientPage = () => {
  const [formData, setFormData] = useState({
    clientCode: '',
    groupCode: '',
    clientName: '',
    firmName: '',
    address: '',
    gstin: '',
    contact: '',
    email: '',
    withUsSince: null,
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  const validateGSTIN = (gstin) => {
    if (!gstin) return true; // GSTIN is optional
    const gstinRegex = /^[A-Z0-9]{15}$/;
    return gstinRegex.test(gstin);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, withUsSince: date });
    setErrors({ ...errors, withUsSince: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');

    if (formData.gstin && !validateGSTIN(formData.gstin)) {
      setErrors({ gstin: 'GSTIN should be in prescribed format' });
      return;
    }

    try {
      // ✅ FIX: Get token from localStorage (same pattern as other pages)
      const token = localStorage.getItem("token");
      
      const response = await fetch('http://localhost:5000/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ✅ FIX: Add Authorization header to prevent 401 error
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          withUsSince: formData.withUsSince
            ? formData.withUsSince.toISOString()
            : null,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Client added successfully!');
        setFormData({
          clientCode: '',
          groupCode: '',
          clientName: '',
          firmName: '',
          address: '',
          gstin: '',
          contact: '',
          email: '',
          withUsSince: null,
        });
      } else {
        setErrors({ server: data.message || 'Failed to add client' });
      }
    } catch (err) {
      setErrors({ server: 'Server error' });
    }
  };

  return (
    <Container maxWidth="sm" className="add-client-container">
      <Box className="add-client-box">
        <Typography variant="h4" gutterBottom>
          Add New Client
        </Typography>
        {errors.server && (
          <Typography color="error" gutterBottom>
            {errors.server}
          </Typography>
        )}
        {success && (
          <Typography color="success" gutterBottom>
            {success}
          </Typography>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Client Code"
            name="clientCode"
            value={formData.clientCode}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            error={!!errors.clientCode}
            helperText={errors.clientCode}
          />
          <TextField
            label="Group Code"
            name="groupCode"
            value={formData.groupCode}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            error={!!errors.groupCode}
            helperText={errors.groupCode}
          />
          <TextField
            label="Client Name"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            error={!!errors.clientName}
            helperText={errors.clientName}
          />
          <TextField
            label="Firm Name"
            name="firmName"
            value={formData.firmName}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            error={!!errors.firmName}
            helperText={errors.firmName}
          />
          <TextField
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            error={!!errors.address}
            helperText={errors.address}
          />
          <TextField
            label="GSTIN"
            name="gstin"
            value={formData.gstin}
            onChange={handleChange}
            fullWidth
            margin="normal"
            error={!!errors.gstin}
            helperText={errors.gstin || 'GSTIN should be in prescribed format'}
          />
          <TextField
            label="Contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            error={!!errors.contact}
            helperText={errors.contact}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            fullWidth
            margin="normal"
            error={!!errors.email}
            helperText={errors.email}
          />
          <Box marginY={2}>
            <Typography variant="body1">With Us Since</Typography>
            <DatePicker
              selected={formData.withUsSince}
              onChange={handleDateChange}
              dateFormat="dd-MM-yyyy"
              placeholderText="Select date"
              className="date-picker"
            />
          </Box>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            className="submit-button"
          >
            Add Client
          </Button>
        </form>
      </Box>
    </Container>
  );
};

export default AddClientPage;
