import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Preview as PreviewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import useInvoiceNavigation from '../components/NavigationHelper';

const CreateInvoicePage = () => {
  // Navigation helper
  const { navigateToInvoices } = useInvoiceNavigation();
  
  // State management
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [billableTasks, setBillableTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [invoice, setInvoice] = useState({
    invoiceType: 'sun',
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    notes: ''
  });
  const [lineItems, setLineItems] = useState([]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalTax: 0,
    grandTotal: 0
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [useExistingClient, setUseExistingClient] = useState(true);

  // Load clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Calculate totals when line items change
  useEffect(() => {
    calculateTotals();
  }, [lineItems, selectedClient]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchBillableTasks = async (clientCode) => {
    try {
      const response = await fetch(`/api/invoices/clients/${clientCode}/billable-tasks`);
      const data = await response.json();
      setBillableTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching billable tasks:', error);
      setBillableTasks([]);
    }
  };

  const calculateTotals = async () => {
    if (!selectedClient || lineItems.length === 0) {
      setTotals({
        subtotal: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
        grandTotal: 0
      });
      return;
    }

    const subtotal = lineItems.reduce((total, item) => total + (item.quantity * item.rate), 0);
    
    // Mock GST calculation (18% total)
    const clientState = selectedClient.address?.split(',').pop()?.trim() || '';
    const companyState = 'Maharashtra'; // This should come from GST config
    
    let gstCalculation;
    if (clientState === companyState) {
      // Intra-state: CGST + SGST
      const cgstAmount = (subtotal * 9) / 100;
      const sgstAmount = (subtotal * 9) / 100;
      gstCalculation = {
        cgstAmount,
        sgstAmount,
        igstAmount: 0,
        totalTax: cgstAmount + sgstAmount
      };
    } else {
      // Inter-state: IGST
      const igstAmount = (subtotal * 18) / 100;
      gstCalculation = {
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount,
        totalTax: igstAmount
      };
    }

    setTotals({
      subtotal,
      ...gstCalculation,
      grandTotal: subtotal + gstCalculation.totalTax
    });
  };

  const handleClientChange = (newClient) => {
    setSelectedClient(newClient);
    if (newClient) {
      fetchBillableTasks(newClient.clientCode);
    } else {
      setBillableTasks([]);
      setSelectedTasks([]);
    }
  };

  const handleAddLineItem = () => {
    const newItem = {
      id: Date.now(),
      serviceCode: '',
      serviceName: '',
      description: '',
      quantity: 1,
      rate: 0,
      sacCode: '',
      servicePeriod: '',
      taskId: null
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleUpdateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleDeleteLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleAddTasksToInvoice = () => {
    const taskLineItems = selectedTasks.map(task => ({
      id: Date.now() + Math.random(),
      taskId: task._id,
      serviceCode: task.serviceCode,
      serviceName: task.serviceName,
      description: `${task.serviceName} - ${task.servicePeriod}`,
      quantity: 1,
      rate: task.billingRate || 1000,
      sacCode: task.sacCode,
      servicePeriod: task.servicePeriod
    }));

    setLineItems([...lineItems, ...taskLineItems]);
    setSelectedTasks([]);
    setShowTaskSelector(false);
  };

  const handleSaveInvoice = async (status = 'draft') => {
    setLoading(true);
    setErrors({});

    try {
      // Validation
      if (!selectedClient) {
        setErrors({ client: 'Please select a client' });
        setLoading(false);
        return;
      }

      if (lineItems.length === 0) {
        setErrors({ lineItems: 'Please add at least one line item' });
        setLoading(false);
        return;
      }

      const invoiceData = {
        clientCode: selectedClient.clientCode,
        invoiceType: invoice.invoiceType,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
        lineItems: lineItems.map(item => ({
          taskId: item.taskId,
          serviceCode: item.serviceCode,
          serviceName: item.serviceName,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          sacCode: item.sacCode,
          servicePeriod: item.servicePeriod
        })),
        taskIds: lineItems.filter(item => item.taskId).map(item => item.taskId)
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // If sending invoice, update status
        if (status === 'sent') {
          await fetch(`/api/invoices/${result.invoice._id}/send`, {
            method: 'POST'
          });
        }

        const shouldRedirect = confirm(`Invoice ${status === 'sent' ? 'created and sent' : 'saved as draft'} successfully!\n\nWould you like to go to Invoice Management page?`);
        
        if (shouldRedirect) {
          navigateToInvoices();
        } else {
          // Reset form to create another invoice
          handleResetForm();
        }
      } else {
        const errorData = await response.json();
        setErrors({ general: errorData.error || 'Failed to create invoice' });
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setErrors({ general: 'Failed to create invoice' });
    }

    setLoading(false);
  };

  const handleResetForm = () => {
    setSelectedClient(null);
    setBillableTasks([]);
    setSelectedTasks([]);
    setLineItems([]);
    setInvoice({
      invoiceType: 'sun',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: ''
    });
    setErrors({});
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Create Invoice
        </Typography>

        {errors.general && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.general}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Invoice Type and Basic Details */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Invoice Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={invoice.invoiceType === 'sun'}
                        onChange={(e) => setInvoice({
                          ...invoice,
                          invoiceType: e.target.checked ? 'sun' : 'moon'
                        })}
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
                
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="Invoice Date"
                    value={invoice.invoiceDate}
                    onChange={(date) => setInvoice({ ...invoice, invoiceDate: date })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="Due Date"
                    value={invoice.dueDate}
                    onChange={(date) => setInvoice({ ...invoice, dueDate: date })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Client Selection */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
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
                  onChange={(event, newValue) => handleClientChange(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Client"
                      error={!!errors.client}
                      helperText={errors.client}
                      fullWidth
                    />
                  )}
                />
              ) : (
                <Alert severity="info">
                  Manual client entry will be available in future updates
                </Alert>
              )}

              {selectedClient && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
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
            </Paper>
          </Grid>

          {/* Line Items */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Invoice Items
                </Typography>
                <Box>
                  {selectedClient && billableTasks.length > 0 && (
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setShowTaskSelector(true)}
                      sx={{ mr: 1 }}
                    >
                      Add from Tasks
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddLineItem}
                  >
                    Add Manual Item
                  </Button>
                </Box>
              </Box>

              {errors.lineItems && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.lineItems}
                </Alert>
              )}

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Rate</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.serviceName}
                            onChange={(e) => handleUpdateLineItem(item.id, 'serviceName', e.target.value)}
                            placeholder="Service Name"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.description}
                            onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                            placeholder="Description"
                            multiline
                            minRows={2}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleUpdateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell>
                          ₹{(item.quantity * item.rate).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteLineItem(item.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {lineItems.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No items added yet. Click "Add Manual Item" or "Add from Tasks" to get started.
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* Totals */}
          {lineItems.length > 0 && (
            <Grid item xs={12} md={6} sx={{ ml: 'auto' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Invoice Summary
                </Typography>
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Subtotal:</Typography>
                  <Typography>₹{totals.subtotal.toFixed(2)}</Typography>
                </Box>
                
                {totals.cgstAmount > 0 && (
                  <>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>CGST (9%):</Typography>
                      <Typography>₹{totals.cgstAmount.toFixed(2)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>SGST (9%):</Typography>
                      <Typography>₹{totals.sgstAmount.toFixed(2)}</Typography>
                    </Box>
                  </>
                )}
                
                {totals.igstAmount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>IGST (18%):</Typography>
                    <Typography>₹{totals.igstAmount.toFixed(2)}</Typography>
                  </Box>
                )}
                
                <Box display="flex" justifyContent="space-between" mb={2} sx={{ borderTop: 1, borderColor: 'divider', pt: 1 }}>
                  <Typography variant="h6">Total Amount:</Typography>
                  <Typography variant="h6">₹{totals.grandTotal.toFixed(2)}</Typography>
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Notes */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <TextField
                label="Notes"
                multiline
                rows={3}
                fullWidth
                value={invoice.notes}
                onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                placeholder="Add any additional notes for this invoice..."
              />
            </Paper>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={handleResetForm}
                disabled={loading}
              >
                Reset
              </Button>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={() => handleSaveInvoice('draft')}
                disabled={loading}
              >
                Save as Draft
              </Button>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => handleSaveInvoice('sent')}
                disabled={loading}
              >
                Create & Send
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Task Selector Dialog */}
        <Dialog open={showTaskSelector} onClose={() => setShowTaskSelector(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Select Billable Tasks</DialogTitle>
          <DialogContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTasks(billableTasks);
                          } else {
                            setSelectedTasks([]);
                          }
                        }}
                        checked={selectedTasks.length === billableTasks.length && billableTasks.length > 0}
                      />
                    </TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billableTasks.map((task) => (
                    <TableRow key={task._id}>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedTasks.some(t => t._id === task._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTasks([...selectedTasks, task]);
                            } else {
                              setSelectedTasks(selectedTasks.filter(t => t._id !== task._id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>{task.serviceName}</TableCell>
                      <TableCell>{task.servicePeriod}</TableCell>
                      <TableCell>{new Date(task.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>₹{task.billingRate || 1000}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTaskSelector(false)}>Cancel</Button>
            <Button
              onClick={handleAddTasksToInvoice}
              variant="contained"
              disabled={selectedTasks.length === 0}
            >
              Add Selected Tasks ({selectedTasks.length})
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default CreateInvoicePage;
