const express = require('express');
const router = express.Router();
const Payment = require('../server_models/Payment');
const Invoice = require('../server_models/Invoice');

// GET /api/payments - List all payments with filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      invoiceId,
      status,
      paymentMethod,
      receivedBy,
      startDate,
      endDate
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (invoiceId) filter.invoiceId = invoiceId;
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (receivedBy) filter.receivedBy = receivedBy;
    
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    const payments = await Payment.find(filter)
      .populate('invoiceId', 'invoiceNumber clientName grandTotal')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Payment.countDocuments(filter);
    
    res.json({
      payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/payments/:id - Get specific payment details
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('invoiceId', 'invoiceNumber clientName grandTotal totalPaid balance');
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// POST /api/payments - Record new payment
router.post('/', async (req, res) => {
  try {
    const {
      invoiceId,
      paymentAmount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      bankName,
      receivedBy,
      remarks
    } = req.body;
    
    // Validate required fields
    if (!invoiceId || !paymentAmount || !paymentDate || !paymentMethod || !receivedBy) {
      return res.status(400).json({ 
        error: 'Invoice ID, payment amount, payment date, payment method, and received by are required' 
      });
    }
    
    // Verify invoice exists
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Validate payment amount
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }
    
    // Check if payment amount exceeds remaining balance
    const remainingBalance = invoice.grandTotal - invoice.totalPaid;
    if (paymentAmount > remainingBalance) {
      return res.status(400).json({ 
        error: `Payment amount (₹${paymentAmount}) exceeds remaining balance (₹${remainingBalance})` 
      });
    }
    
    // Create payment record
    const payment = new Payment({
      invoiceId,
      paymentAmount: parseFloat(paymentAmount),
      paymentDate: new Date(paymentDate),
      paymentMethod,
      referenceNumber,
      bankName,
      receivedBy,
      remarks
    });
    
    await payment.save();
    
    // The payment model's post-save hook will automatically update the invoice
    
    // Fetch updated invoice
    const updatedInvoice = await Invoice.findById(invoiceId);
    
    res.status(201).json({
      payment,
      invoice: updatedInvoice,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// PUT /api/payments/:id - Update payment
router.put('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const {
      paymentAmount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      bankName,
      status,
      remarks
    } = req.body;
    
    // Store old amount for invoice update calculation
    const oldAmount = payment.paymentAmount;
    const oldStatus = payment.status;
    
    // Update payment fields
    if (paymentAmount !== undefined) {
      if (paymentAmount <= 0) {
        return res.status(400).json({ error: 'Payment amount must be greater than zero' });
      }
      payment.paymentAmount = parseFloat(paymentAmount);
    }
    if (paymentDate) payment.paymentDate = new Date(paymentDate);
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (referenceNumber !== undefined) payment.referenceNumber = referenceNumber;
    if (bankName !== undefined) payment.bankName = bankName;
    if (status) payment.status = status;
    if (remarks !== undefined) payment.remarks = remarks;
    
    await payment.save();
    
    // Manually update invoice totals since the amount or status might have changed
    const totalPaid = await Payment.getTotalPaid(payment.invoiceId);
    const invoice = await Invoice.findById(payment.invoiceId);
    if (invoice) {
      invoice.totalPaid = totalPaid;
      invoice.balance = invoice.grandTotal - totalPaid;
      invoice.updateStatus();
      await invoice.save();
    }
    
    res.json({
      payment,
      invoice,
      message: 'Payment updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const invoiceId = payment.invoiceId;
    
    await Payment.findByIdAndDelete(req.params.id);
    
    // Update invoice payment totals
    const totalPaid = await Payment.getTotalPaid(invoiceId);
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      invoice.totalPaid = totalPaid;
      invoice.balance = invoice.grandTotal - totalPaid;
      invoice.updateStatus();
      await invoice.save();
    }
    
    res.json({ 
      message: 'Payment deleted successfully',
      invoice
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// GET /api/payments/invoice/:invoiceId - Get all payments for specific invoice
router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const payments = await Payment.find({ invoiceId: req.params.invoiceId })
      .sort({ createdAt: -1 });
    
    const totalPaid = payments
      .filter(p => p.status === 'cleared')
      .reduce((total, payment) => total + payment.paymentAmount, 0);
    
    res.json({
      payments,
      totalPaid
    });
  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    res.status(500).json({ error: 'Failed to fetch invoice payments' });
  }
});

// GET /api/payments/reports/summary - Payment summary report
router.get('/reports/summary', async (req, res) => {
  try {
    const { startDate, endDate, receivedBy, paymentMethod } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }
    if (receivedBy) filter.receivedBy = receivedBy;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    
    // Payment method wise summary
    const methodSummary = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paymentAmount' }
        }
      }
    ]);
    
    // User wise summary (who received payments)
    const userSummary = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$receivedBy',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paymentAmount' }
        }
      }
    ]);
    
    // Status wise summary
    const statusSummary = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paymentAmount' }
        }
      }
    ]);
    
    // Overall summary
    const overall = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$paymentAmount' },
          clearedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'cleared'] }, '$paymentAmount', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$paymentAmount', 0]
            }
          }
        }
      }
    ]);
    
    res.json({
      methodSummary,
      userSummary,
      statusSummary,
      overall: overall[0] || {
        totalPayments: 0,
        totalAmount: 0,
        clearedAmount: 0,
        pendingAmount: 0
      }
    });
  } catch (error) {
    console.error('Error generating payment summary:', error);
    res.status(500).json({ error: 'Failed to generate payment summary' });
  }
});

// GET /api/payments/reports/outstanding - Outstanding invoices report
router.get('/reports/outstanding', async (req, res) => {
  try {
    const { clientCode, overdueDays } = req.query;
    
    const filter = {
      balance: { $gt: 0 },
      status: { $in: ['sent', 'overdue'] }
    };
    
    if (clientCode) filter.clientCode = clientCode;
    
    if (overdueDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(overdueDays));
      filter.dueDate = { $lt: cutoffDate };
    }
    
    const outstandingInvoices = await Invoice.find(filter)
      .select('invoiceNumber clientName firmName grandTotal totalPaid balance dueDate invoiceDate')
      .sort({ dueDate: 1 });
    
    // Calculate aging buckets
    const agingBuckets = {
      current: 0,      // Not due yet
      '1-30': 0,       // 1-30 days overdue
      '31-60': 0,      // 31-60 days overdue
      '61-90': 0,      // 61-90 days overdue
      '90+': 0         // More than 90 days overdue
    };
    
    const today = new Date();
    
    outstandingInvoices.forEach(invoice => {
      const daysOverdue = Math.floor((today - invoice.dueDate) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue <= 0) {
        agingBuckets.current += invoice.balance;
      } else if (daysOverdue <= 30) {
        agingBuckets['1-30'] += invoice.balance;
      } else if (daysOverdue <= 60) {
        agingBuckets['31-60'] += invoice.balance;
      } else if (daysOverdue <= 90) {
        agingBuckets['61-90'] += invoice.balance;
      } else {
        agingBuckets['90+'] += invoice.balance;
      }
    });
    
    const totalOutstanding = outstandingInvoices.reduce((total, inv) => total + inv.balance, 0);
    
    res.json({
      outstandingInvoices,
      agingBuckets,
      totalOutstanding,
      count: outstandingInvoices.length
    });
  } catch (error) {
    console.error('Error generating outstanding report:', error);
    res.status(500).json({ error: 'Failed to generate outstanding report' });
  }
});

module.exports = router;
