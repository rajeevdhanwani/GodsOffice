import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Autocomplete,
  Typography,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const InvoiceForm = ({ 
  invoice, 
  onInvoiceChange, 
  clients, 
  selectedClient, 
  onClientChange,
  errors = {} 
}) => {
  const [useExistingClient, setUseExistingClient] = useState(true);

  const handleInvoiceFieldChange = (field, value) => {
    onInvoiceChange({
      ...invoice,
      [field]: value
    });
  };

  const handleClientSelection = (newClient) => {
    onClientChange(newClient);
  };

  const handleInvoiceTypeChange = (isSun) => {
    handleInvoiceFieldChange('invoiceType', isSun ? 'sun' : 'moon');
  };

  return (
    <Box>
      {/* Invoice Type and Basic Details */}
      <Typography variant="h6" gutterBottom>
        Invoice Details
      </Typography>
      
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <FormControlLabel
            control={
              <Switch
                checked={invoice.invoiceType === 'sun'}
                onChange={(e) => handleInvoiceTypeChange(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">
                  Invoice Type: {invoice.invoiceType === 'sun' ? 'Sun (Compliance)' : 'Moon (Internal)'}
                </Typography>
                <Chip 
                  size="small" 
                  label={invoice.invoiceType === 'sun' ? 'GST Eligible' : 'Internal Use'} 
                  color={invoice.invoiceType === 'sun' ? 'primary' : 'secondary'}
                />
              </Box>
            }
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <DatePicker
            label="Invoice Date"
            value={invoice.invoiceDate}
            onChange={(date) => handleInvoiceFieldChange('invoiceDate', date)}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <DatePicker
            label="Due Date"
            value={invoice.dueDate}
            onChange={(date) => handleInvoiceFieldChange('dueDate', date)}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </Grid>
      </Grid>

      {/* Client Selection */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Client Information
      </Typography>
      
      <FormControlLabel
        control={
          <Switch
            checked={useExistingClient}
            onChange={(e) => setUseExistingClient(e.target.checked)}
          />
        }
        label="Use Existing Client"
        sx={{ mb: 2 }}
      />

      {useExistingClient ? (
        <Autocomplete
          options={clients}
          getOptionLabel={(client) => `${client.clientCode} - ${client.clientName}`}
          value={selectedClient}
          onChange={(event, newValue) => handleClientSelection(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Client"
              error={!!errors.client}
              helperText={errors.client}
              fullWidth
            />
          )}
          sx={{ mb: 2 }}
        />
      ) : (
        <Typography color="textSecondary" sx={{ mb: 2 }}>
          Manual client entry will be available in future updates
        </Typography>
      )}

      {selectedClient && (
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Client Details:
          </Typography>
          <Typography variant="body2">
            <strong>Name:</strong> {selectedClient.clientName}
          </Typography>
          <Typography variant="body2">
            <strong>Firm:</strong> {selectedClient.firmName}
          </Typography>
          <Typography variant="body2">
            <strong>Address:</strong> {selectedClient.address}
          </Typography>
          {selectedClient.gstin && (
            <Typography variant="body2">
              <strong>GSTIN:</strong> {selectedClient.gstin}
            </Typography>
          )}
        </Box>
      )}

      {/* Notes */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Additional Information
      </Typography>
      
      <TextField
        label="Notes"
        multiline
        rows={3}
        fullWidth
        value={invoice.notes || ''}
        onChange={(e) => handleInvoiceFieldChange('notes', e.target.value)}
        placeholder="Add any additional notes for this invoice..."
      />
    </Box>
  );
};

export default InvoiceForm;
