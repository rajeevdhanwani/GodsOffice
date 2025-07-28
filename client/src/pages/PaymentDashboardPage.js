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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  AccountBalance as BankIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const PaymentDashboardPage = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [payments, setPayments] = useState([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState([]);
  const [paymentSummary, setSummary] = useState(null);
  const [outstandingReport, setOutstandingReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    paymentMethod: '',
    receivedBy: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 20,
    total: 0
  });
  const [paymentDialog, setPaymentDialog] = useState({
    open: false,
    invoice: null,
    payment: null
  });
  const [paymentForm, setPaymentForm] = useState({
    paymentAmount: '',
    paymentDate: new Date(),
    paymentMethod: 'cash',
    referenceNumber: '',
    bankName: '',
    receivedBy: '',
    remarks: ''
  });

  // Load data on component mount
  useEffect(() => {
    if (activeTab === 0) {
      fetchPayments();
      fetchPaymentSummary();
    } else {
      fetchOutstandingInvoices();
      fetchOutstandingReport();
    }
  }, [activeTab, pagination.page, pagination.limit, filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page + 1,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => 
            value !== '' && value !== null
          )
        )
      });

      const response = await fetch(`/api/payments?${queryParams}`);
      const data = await response.json();
      
      setPayments(data.payments || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
    setLoading(false);
  };

  const fetchPaymentSummary = async () => {
    try {
      const queryParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => 
            value !== '' && value !== null
          )
        )
      );

      const response = await fetch(`/api/payments/reports/summary?${queryParams}`);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching payment summary:', error);
    }
  };

  const fetchOutstandingInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/reports/outstanding');
      const data = await response.json();
      setOutstandingInvoices(data.outstandingInvoices || []);
      setOutstandingReport(data);
    } catch (error) {
      console.error('Error fetching outstanding invoices:', error);
    }
    setLoading(false);
  };

  const fetchOutstandingReport = async () => {
    try {
      const response = await fetch('/api/payments/reports/outstanding');
      const data = await response.json();
      setOutstandingReport(data);
    } catch (error) {
      console.error('Error fetching outstanding report:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (event) => {
    setPagination(prev => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 0
    }));
  };

  const openPaymentDialog = (invoice = null, payment = null) => {
    if (payment) {
      // Edit mode
      setPaymentForm({
        paymentAmount: payment.paymentAmount,
        paymentDate: new Date(payment.paymentDate),
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber || '',
        bankName: payment.bankName || '',
        receivedBy: payment.receivedBy,
        remarks: payment.remarks || ''
      });
    } else {
      // New payment mode
      setPaymentForm({
        paymentAmount: invoice?.balance || '',
        paymentDate: new Date(),
        paymentMethod: 'cash',
        referenceNumber: '',
        bankName: '',
        receivedBy: '',
        remarks: ''
      });
    }
    
    setPaymentDialog({
      open: true,
      invoice,
      payment
    });
  };

  const closePaymentDialog = () => {
    setPaymentDialog({
      open: false,
      invoice: null,
      payment: null
    });
    setPaymentForm({
      paymentAmount: '',
      paymentDate: new Date(),
      paymentMethod: 'cash',
      referenceNumber: '',
      bankName: '',
      receivedBy: '',
      remarks: ''
    });
  };

  const handleSavePayment = async () => {
    try {
      const paymentData = {
        ...paymentForm,
        invoiceId: paymentDialog.invoice._id
      };

      const url = paymentDialog.payment 
        ? `/api/payments/${paymentDialog.payment._id}`
        : '/api/payments';
      
      const method = paymentDialog.payment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        alert(`Payment ${paymentDialog.payment ? 'updated' : 'recorded'} successfully!`);
        closePaymentDialog();
        
        if (activeTab === 0) {
          fetchPayments();
          fetchPaymentSummary();
        } else {
          fetchOutstandingInvoices();
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to save payment');
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Failed to save payment');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Payment deleted successfully!');
        fetchPayments();
        fetchPaymentSummary();
      } else {
        alert('Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Failed to delete payment');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'bank':
      case 'neft':
      case 'rtgs':
        return <BankIcon />;
      case 'cash':
        return <PaymentIcon />;
      default:
        return <ReceiptIcon />;
    }
  };

  const getOverdueDays = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Payment Dashboard
        </Typography>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Payment Tracking" />
          <Tab label="Outstanding Invoices" />
        </Tabs>

        {/* Payment Tracking Tab */}
        {activeTab === 0 && (
          <>
            {/* Payment Summary */}
            {paymentSummary && (
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center">
                        <PaymentIcon color="primary" sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="h6" color="primary">
                            {paymentSummary.overall.totalPayments}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Total Payments
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
                        <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="h6" color="success.main">
                            {formatCurrency(paymentSummary.overall.totalAmount)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Total Amount
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
                        <ReceiptIcon color="info" sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="h6" color="info.main">
                            {formatCurrency(paymentSummary.overall.clearedAmount)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Cleared Amount
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
                        <WarningIcon color="warning" sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="h6" color="warning.main">
                            {formatCurrency(paymentSummary.overall.pendingAmount)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Pending Amount
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Filters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={2}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <DatePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={filters.paymentMethod}
                      onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                      label="Payment Method"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="cheque">Cheque</MenuItem>
                      <MenuItem value="neft">NEFT</MenuItem>
                      <MenuItem value="rtgs">RTGS</MenuItem>
                      <MenuItem value="upi">UPI</MenuItem>
                      <MenuItem value="card">Card</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    label="Received By"
                    fullWidth
                    value={filters.receivedBy}
                    onChange={(e) => handleFilterChange('receivedBy', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="cleared">Cleared</MenuItem>
                      <MenuItem value="bounced">Bounced</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Payments Table */}
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Reference</TableCell>
                      <TableCell>Received By</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment._id} hover>
                          <TableCell>
                            {payment.invoiceId?.invoiceNumber || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {payment.invoiceId?.clientName || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(payment.paymentAmount)}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {getPaymentMethodIcon(payment.paymentMethod)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {payment.paymentMethod.toUpperCase()}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{payment.referenceNumber || '-'}</TableCell>
                          <TableCell>{payment.receivedBy}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                              color={payment.status === 'cleared' ? 'success' : payment.status === 'bounced' ? 'error' : 'warning'}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => openPaymentDialog(payment.invoiceId, payment)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeletePayment(payment._id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                component="div"
                count={pagination.total}
                page={pagination.page}
                onPageChange={handlePageChange}
                rowsPerPage={pagination.limit}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </Paper>
          </>
        )}

        {/* Outstanding Invoices Tab */}
        {activeTab === 1 && (
          <>
            {/* Outstanding Summary */}
            {outstandingReport && (
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="success.main">
                        {formatCurrency(outstandingReport.agingBuckets.current)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Current (Not Due)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="warning.main">
                        {formatCurrency(outstandingReport.agingBuckets['1-30'])}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        1-30 Days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="error.main">
                        {formatCurrency(outstandingReport.agingBuckets['31-60'])}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        31-60 Days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="error.main">
                        {formatCurrency(outstandingReport.agingBuckets['61-90'])}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        61-90 Days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="error.dark">
                        {formatCurrency(outstandingReport.agingBuckets['90+'])}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        90+ Days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Outstanding Invoices Table */}
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Invoice Date</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Total Amount</TableCell>
                      <TableCell>Paid Amount</TableCell>
                      <TableCell>Balance</TableCell>
                      <TableCell>Days Overdue</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : outstandingInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          No outstanding invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      outstandingInvoices.map((invoice) => {
                        const overdueDays = getOverdueDays(invoice.dueDate);
                        return (
                          <TableRow key={invoice._id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {invoice.invoiceNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {invoice.clientName}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {invoice.firmName}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                            <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                            <TableCell>{formatCurrency(invoice.grandTotal)}</TableCell>
                            <TableCell>{formatCurrency(invoice.totalPaid)}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="error.main" fontWeight="medium">
                                {formatCurrency(invoice.balance)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={overdueDays > 0 ? `${overdueDays} days` : 'Not due'}
                                color={overdueDays > 90 ? 'error' : overdueDays > 30 ? 'warning' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PaymentIcon />}
                                onClick={() => openPaymentDialog(invoice)}
                              >
                                Record Payment
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        {/* Payment Dialog */}
        <Dialog open={paymentDialog.open} onClose={closePaymentDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {paymentDialog.payment ? 'Edit Payment' : 'Record Payment'}
            {paymentDialog.invoice && (
              <Typography variant="body2" color="textSecondary">
                Invoice: {paymentDialog.invoice.invoiceNumber} - {paymentDialog.invoice.clientName}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Payment Amount"
                  type="number"
                  fullWidth
                  required
                  value={paymentForm.paymentAmount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: e.target.value })}
                  inputProps={{ step: "0.01", min: "0" }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Payment Date"
                  value={paymentForm.paymentDate}
                  onChange={(date) => setPaymentForm({ ...paymentForm, paymentDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    label="Payment Method"
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="neft">NEFT</MenuItem>
                    <MenuItem value="rtgs">RTGS</MenuItem>
                    <MenuItem value="upi">UPI</MenuItem>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Reference Number"
                  fullWidth
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  placeholder="Cheque/Transaction number"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Bank Name"
                  fullWidth
                  value={paymentForm.bankName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Received By"
                  fullWidth
                  required
                  value={paymentForm.receivedBy}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receivedBy: e.target.value })}
                  placeholder="User name or ID"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Remarks"
                  multiline
                  rows={3}
                  fullWidth
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  placeholder="Additional notes about this payment..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={closePaymentDialog}>Cancel</Button>
            <Button onClick={handleSavePayment} variant="contained">
              {paymentDialog.payment ? 'Update Payment' : 'Record Payment'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default PaymentDashboardPage;
