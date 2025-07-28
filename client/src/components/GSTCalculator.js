import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Alert,
  Chip
} from '@mui/material';

const GSTCalculator = ({ 
  lineItems = [], 
  clientState = '', 
  companyState = 'Maharashtra', // This should come from GST config
  onTotalsChange,
  showBreakdown = true 
}) => {
  const [totals, setTotals] = useState({
    subtotal: 0,
    cgstRate: 0,
    sgstRate: 0,
    igstRate: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalTax: 0,
    grandTotal: 0
  });

  useEffect(() => {
    calculateGST();
  }, [lineItems, clientState, companyState]);

  const calculateGST = () => {
    if (lineItems.length === 0) {
      const emptyTotals = {
        subtotal: 0,
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
        grandTotal: 0
      };
      setTotals(emptyTotals);
      onTotalsChange?.(emptyTotals);
      return;
    }

    const subtotal = lineItems.reduce((total, item) => 
      total + ((item.quantity || 1) * (item.rate || 0)), 0
    );

    // Default GST rate
    const gstRate = 18; // This should come from GST config
    
    let gstCalculation;
    
    if (clientState && clientState.trim().toLowerCase() === companyState.trim().toLowerCase()) {
      // Intra-state: CGST + SGST
      const cgstRate = gstRate / 2;
      const sgstRate = gstRate / 2;
      const cgstAmount = (subtotal * cgstRate) / 100;
      const sgstAmount = (subtotal * sgstRate) / 100;
      
      gstCalculation = {
        cgstRate,
        sgstRate,
        igstRate: 0,
        cgstAmount: Math.round(cgstAmount * 100) / 100,
        sgstAmount: Math.round(sgstAmount * 100) / 100,
        igstAmount: 0,
        totalTax: Math.round((cgstAmount + sgstAmount) * 100) / 100
      };
    } else {
      // Inter-state: IGST
      const igstAmount = (subtotal * gstRate) / 100;
      
      gstCalculation = {
        cgstRate: 0,
        sgstRate: 0,
        igstRate: gstRate,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: Math.round(igstAmount * 100) / 100,
        totalTax: Math.round(igstAmount * 100) / 100
      };
    }

    const newTotals = {
      subtotal: Math.round(subtotal * 100) / 100,
      ...gstCalculation,
      grandTotal: Math.round((subtotal + gstCalculation.totalTax) * 100) / 100
    };

    setTotals(newTotals);
    onTotalsChange?.(newTotals);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatAmountInWords = (amount) => {
    // Simple implementation - you can enhance this
    if (amount === 0) return 'Zero Rupees Only';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    // Simplified conversion for demonstration
    const integerPart = Math.floor(amount);
    if (integerPart < 1000) {
      return `${integerPart} Rupees Only`;
    }
    
    return `${integerPart.toLocaleString('en-IN')} Rupees Only`;
  };

  if (lineItems.length === 0) {
    return (
      <Alert severity="info">
        Add line items to see GST calculation
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Invoice Summary
      </Typography>

      {/* GST Type Indicator */}
      <Box mb={2}>
        <Chip
          size="small"
          label={
            clientState && clientState.trim().toLowerCase() === companyState.trim().toLowerCase()
              ? `Intra-state (${clientState})`
              : `Inter-state (${clientState || 'Unknown'} ↔ ${companyState})`
          }
          color={
            clientState && clientState.trim().toLowerCase() === companyState.trim().toLowerCase()
              ? 'primary'
              : 'secondary'
          }
        />
      </Box>

      {/* Calculation Breakdown */}
      <Box>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body1">Subtotal:</Typography>
          <Typography variant="body1" fontWeight="medium">
            {formatCurrency(totals.subtotal)}
          </Typography>
        </Box>

        {showBreakdown && (
          <>
            {totals.cgstAmount > 0 && (
              <>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="textSecondary">
                    CGST ({totals.cgstRate}%):
                  </Typography>
                  <Typography variant="body2">
                    {formatCurrency(totals.cgstAmount)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="textSecondary">
                    SGST ({totals.sgstRate}%):
                  </Typography>
                  <Typography variant="body2">
                    {formatCurrency(totals.sgstAmount)}
                  </Typography>
                </Box>
              </>
            )}

            {totals.igstAmount > 0 && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="textSecondary">
                  IGST ({totals.igstRate}%):
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(totals.igstAmount)}
                </Typography>
              </Box>
            )}

            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="body1" color="textSecondary">
                Total Tax:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {formatCurrency(totals.totalTax)}
              </Typography>
            </Box>
          </>
        )}

        <Divider sx={{ my: 1 }} />

        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="h6" color="primary">
            Total Amount:
          </Typography>
          <Typography variant="h6" color="primary" fontWeight="bold">
            {formatCurrency(totals.grandTotal)}
          </Typography>
        </Box>

        {/* Amount in Words */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Amount in Words:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {formatAmountInWords(totals.grandTotal)}
          </Typography>
        </Box>

        {/* Additional Information */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="textSecondary">
            * GST calculated at {totals.cgstAmount > 0 ? '9% CGST + 9% SGST' : '18% IGST'}
          </Typography>
          <br />
          <Typography variant="caption" color="textSecondary">
            * All amounts are in Indian Rupees (INR)
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default GSTCalculator;
