import React, { useState, useEffect } from "react";
import {
  Typography,
  Container,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import ClientSearchBar from "../components/ClientSearchBar";
import "../styles/ClientInfoPage.css";
const ClientInfoPage = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
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
  const handleClientSelect = (client) => {
    setSelectedClient(client);
  };
  return (
    <Container maxWidth="lg" className="client-info-container">
      <Box className="client-info-box">
        <Typography variant="h4" gutterBottom>
          Client Info
        </Typography>
        <ClientSearchBar onSelect={handleClientSelect} clients={clients} />
        {selectedClient && (
          <Box marginTop={4}>
            <Typography variant="h6" gutterBottom>
              Client Details
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <strong>Client Code</strong>
                    </TableCell>
                    <TableCell>{selectedClient.clientCode}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Client Name</strong>
                    </TableCell>
                    <TableCell>{selectedClient.clientName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Firm Name</strong>
                    </TableCell>
                    <TableCell>{selectedClient.firmName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Address</strong>
                    </TableCell>
                    <TableCell>{selectedClient.address}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>GSTIN</strong>
                    </TableCell>
                    <TableCell>{selectedClient.gstin || "N/A"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Contact</strong>
                    </TableCell>
                    <TableCell>{selectedClient.contact}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Email</strong>
                    </TableCell>
                    <TableCell>{selectedClient.email || "N/A"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>With Us Since</strong>
                    </TableCell>
                    <TableCell>{selectedClient.withUsSince || "N/A"}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="h6" gutterBottom marginTop={4}>
              Tasks/Services
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>SL</TableCell>
                    <TableCell>Service/Task Name</TableCell>
                    <TableCell>Team Member</TableCell>
                    <TableCell>Work Status</TableCell>
                    <TableCell>Service Assigned At</TableCell>
                    <TableCell>Service Completed At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6}>
                      No tasks available (Task Management module coming soon)
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </Container>
  );
};
export default ClientInfoPage;
