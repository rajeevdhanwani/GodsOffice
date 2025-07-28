import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Grid,
  Chip
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Add as AddIcon,
  List as ListIcon,
  Payment as PaymentIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import useInvoiceNavigation from './NavigationHelper';

/**
 * Invoice Module Card for Welcome Page
 * Provides quick access to invoice management features
 */
const InvoiceModuleCard = ({ showStats = false, stats = null }) => {
  const { 
    navigateToInvoices, 
    navigateToCreateInvoice, 
    navigateToPayments 
  } = useInvoiceNavigation();

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <ReceiptIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              Invoice Management
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Create, manage, and track invoices with automatic GST calculation
            </Typography>
          </Box>
        </Box>

        {/* Features List */}
        <Box mb={2}>
          <Chip 
            label="Sun/Moon Billing" 
            size="small" 
            sx={{ mr: 1, mb: 1 }} 
            color="primary" 
          />
          <Chip 
            label="Auto GST Calculation" 
            size="small" 
            sx={{ mr: 1, mb: 1 }} 
            color="secondary" 
          />
          <Chip 
            label="Task Integration" 
            size="small" 
            sx={{ mr: 1, mb: 1 }} 
            color="info" 
          />
          <Chip 
            label="Payment Tracking" 
            size="small" 
            sx={{ mr: 1, mb: 1 }} 
            color="success" 
          />
        </Box>

        {/* Quick Stats (if provided) */}
        {showStats && stats && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary">
                  {stats.totalInvoices || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Total Invoices
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">
                  ₹{(stats.totalAmount || 0).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Total Amount
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={navigateToCreateInvoice}
          variant="contained"
          color="primary"
        >
          Create Invoice
        </Button>
        <Button
          size="small"
          startIcon={<ListIcon />}
          onClick={navigateToInvoices}
          variant="outlined"
        >
          Manage
        </Button>
        <Button
          size="small"
          startIcon={<PaymentIcon />}
          onClick={navigateToPayments}
          variant="outlined"
        >
          Payments
        </Button>
      </CardActions>
    </Card>
  );
};

/**
 * Compact Invoice Module Button for Navigation Menu
 */
export const InvoiceModuleButton = ({ variant = "contained" }) => {
  const { navigateToInvoices } = useInvoiceNavigation();

  return (
    <Button
      variant={variant}
      startIcon={<ReceiptIcon />}
      onClick={navigateToInvoices}
      fullWidth
    >
      Invoice Management
    </Button>
  );
};

/**
 * Quick Actions Component for Dashboard
 */
export const InvoiceQuickActions = () => {
  const { 
    navigateToInvoices, 
    navigateToCreateInvoice, 
    navigateToPayments 
  } = useInvoiceNavigation();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Invoice Quick Actions
      </Typography>
      <Grid container spacing={1}>
        <Grid item xs={12} sm={4}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={navigateToCreateInvoice}
            size="small"
          >
            New Invoice
          </Button>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ListIcon />}
            onClick={navigateToInvoices}
            size="small"
          >
            View All
          </Button>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<PaymentIcon />}
            onClick={navigateToPayments}
            size="small"
          >
            Payments
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvoiceModuleCard;
