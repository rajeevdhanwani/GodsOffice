import React, { useState, useEffect } from "react";
import { Button, TextField, Typography, Container, Box } from "@mui/material";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ClientSearchBar from "../components/ClientSearchBar";
import "../styles/UpdateClientPage.css";
import API_BASE_URL from "../config"; // adjust path based on file depth



const UpdateClientPage = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({
    clientCode: "",
    groupCode: "",
    clientName: "",
    firmName: "",
    address: "",
    gstin: "",
    contact: "",
    email: "",
    withUsSince: null,
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("${API_BASE_URL}/api/clients", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setClients(data);
        } else {
          console.error("Error fetching clients:", data.message);
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    fetchClients();
  }, []);
  const validateGSTIN = (gstin) => {
    if (!gstin) return true; // GSTIN is optional
    const gstinRegex = /^[A-Z0-9]{15}$/;
    return gstinRegex.test(gstin);
  };
  const handleClientSelect = (client) => {
    setSelectedClient(client);
    if (client) {
      setFormData({
        clientCode: client.clientCode,
        groupCode: client.groupCode,
        clientName: client.clientName,
        firmName: client.firmName,
        address: client.address,
        gstin: client.gstin || "",
        contact: client.contact,
        email: client.email || "",
        withUsSince: client.withUsSince ? new Date(client.withUsSince) : null,
      });
      setErrors({});
      setSuccess("");
    } else {
      setFormData({
        clientCode: "",
        groupCode: "",
        clientName: "",
        firmName: "",
        address: "",
        gstin: "",
        contact: "",
        email: "",
        withUsSince: null,
      });
    }
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };
  const handleDateChange = (date) => {
    setFormData({ ...formData, withUsSince: date });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess("");
    if (!selectedClient) {
      setErrors({ server: "Please select a client" });
      return;
    }
    if (formData.gstin && !validateGSTIN(formData.gstin)) {
      setErrors({ gstin: "GSTIN should be in prescribed format" });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/clients/${selectedClient.clientCode}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            withUsSince: formData.withUsSince
              ? formData.withUsSince.toISOString()
              : null,
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setSuccess("Client updated successfully!");
        // Update client list
        setClients((prev) =>
          prev.map((client) =>
            client.clientCode === selectedClient.clientCode
              ? { ...client, ...formData }
              : client
          )
        );
        setSelectedClient(null);
        setFormData({
          clientCode: "",
          groupCode: "",
          clientName: "",
          firmName: "",
          address: "",
          gstin: "",
          contact: "",
          email: "",
          withUsSince: null,
        });
      } else {
        setErrors({ server: data.message || "Failed to update client" });
      }
    } catch (err) {
      setErrors({ server: "Server error" });
    }
  };
  return (
    <Container maxWidth="sm" className="update-client-container">
      <Box className="update-client-box">
        <Typography variant="h4" gutterBottom>
          Update Client
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
        <ClientSearchBar onSelect={handleClientSelect} clients={clients} />
        {selectedClient && (
          <form onSubmit={handleSubmit}>
            <TextField
              label="Client Code"
              name="clientCode"
              value={formData.clientCode}
              onChange={handleChange}
              fullWidth
              margin="normal"
              disabled
            />
            <TextField
              label="Group Code"
              name="groupCode"
              value={formData.groupCode}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Client Name"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Firm Name"
              name="firmName"
              value={formData.firmName}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="GSTIN"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              fullWidth
              margin="normal"
              error={!!errors.gstin}
              helperText={
                errors.gstin || "GSTIN should be in prescribed format"
              }
            />
            <TextField
              label="Contact"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              margin="normal"
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
              Update Client
            </Button>
          </form>
        )}
      </Box>
    </Container>
  );
};
export default UpdateClientPage;
