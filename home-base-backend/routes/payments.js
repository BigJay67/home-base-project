const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const NotificationService = require('../services/notificationService');
const PDFService = require('../services/pdfService');
const EmailService = require('../services/emailService');
const AnalyticsService = require('../services/analyticsService');
const { paystack } = require('../config/paystack');
const router = express.Router();
const emailService = new EmailService();

router.post('/paystack/initialize', async (req, res) => {
  try {
    const { listingId, userId, userEmail, amount } = req.body;

    if (!listingId || !userId || !userEmail || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ error: 'Invalid listing ID' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const callbackUrl = `${frontendUrl}/payment-callback`;

    const payment = await paystack.transaction.initialize({
      email: userEmail,
      amount: amount * 100,
      callback_url: callbackUrl,
      metadata: { listingId, userId },
    });

    if (!payment.status) {
      throw new Error('Paystack initialization failed');
    }

    const booking = new Booking({
      listingId,
      userId,
      userEmail,
      amount,
      paymentReference: payment.data.reference,
    });

    await booking.save();

    try {
      await NotificationService.notifyBookingCreated(booking, listing.name);
      await NotificationService.notifyListingOwnerBooking(booking, listing.createdBy, listing.name);
    } catch (notifErr) {
      console.error('Notification error:', notifErr);
    }

    res.json({
      authorization_url: payment.data.authorization_url,
      reference: payment.data.reference,
    });
  } catch (err) {
    console.error('Error initializing payment:', err);
    res.status(500).json({ error: 'Payment initialization failed', details: err.message });
  }
});

router.get('/paystack/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.headers.authorization;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const verification = await paystack.transaction.verify({ reference });

    const booking = await Booking.findOne({ paymentReference: reference }).populate(
      'listingId',
      'name createdBy'
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (verification.data.status === 'success') {
      await Booking.updateOne(
        { paymentReference: reference },
        {
          status: 'completed',
          paidAt: new Date(verification.data.paid_at),
          paymentMethod: verification.data.channel,
          receiptData: {
            transactionId: verification.data.id,
            gatewayResponse: verification.data.gateway_response,
            channel: verification.data.channel,
            ipAddress: verification.data.ip_address,
          },
        }
      );

      try {
        await NotificationService.notifyPaymentSuccess(booking, booking.listingId.name);
      } catch (notifErr) {
        console.error('Payment success notification error:', notifErr);
      }

      res.json({ status: 'success', message: 'Payment verified' });
    } else {
      await Booking.updateOne({ paymentReference: reference }, { status: 'failed' });

      try {
        await NotificationService.notifyPaymentFailed(booking, booking.listingId.name);
      } catch (notifErr) {
        console.error('Payment failed notification error:', notifErr);
      }

      res.json({ status: 'failed', message: 'Payment failed' });
    }
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ error: 'Payment verification failed', details: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const userId = req.headers.authorization;
    const { status } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let query = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const payments = await Booking.find(query)
      .populate('listingId', 'name location images')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (err) {
    console.error('Error fetching payment history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:paymentId/receipt', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.headers.authorization;
    const { format = 'pdf', template = 'auto' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payment = await Booking.findById(paymentId).populate('listingId', 'name location type');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Receipt only available for completed payments' });
    }

    const receiptData = {
      receiptId: `HB-${payment.paymentReference}`,
      issueDate: new Date().toISOString(),
      payment: payment.toObject(),
      company: {
        name: 'Home Base',
        address: '123 Accommodation Street, Lagos, Nigeria',
        phone: '+234 800 000 0000',
        email: 'support@homebase.com',
      },
    };

    await AnalyticsService.trackReceiptDownload(paymentId, userId, req.get('User-Agent'));

    if (format === 'json') {
      return res.json(receiptData);
    }

    let receiptTemplate = template;
    if (template === 'auto') {
      receiptTemplate = PDFService.getTemplateForPayment(payment);
    }

    const pdfBuffer = await PDFService.generateReceipt(receiptData, receiptTemplate);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.paymentReference}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating receipt:', err);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

router.post('/:paymentId/email-receipt', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.headers.authorization;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payment = await Booking.findById(paymentId).populate('listingId', 'name location');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Receipt only available for completed payments' });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const receiptData = {
      receiptId: `HB-${payment.paymentReference}`,
      issueDate: new Date().toISOString(),
      payment: payment.toObject(),
      company: {
        name: 'Home Base',
        address: '123 Accommodation Street, Lagos, Nigeria',
        phone: '+234 800 000 0000',
        email: 'support@homebase.com',
      },
    };

    const pdfBuffer = await PDFService.generateReceiptForEmail(receiptData);

    await emailService.sendReceiptEmail(payment.userEmail, receiptData, pdfBuffer);
    res.json({ message: 'Receipt sent to your email successfully' });
  } catch (err) {
    console.error('Error emailing receipt:', err);
    res.status(500).json({ error: 'Failed to send receipt email' });
  }
});

router.post('/:paymentId/share', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.headers.authorization;
    const { expiresIn = '7d' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payment = await Booking.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shareToken = Buffer.from(`${paymentId}:${Date.now() + 7 * 24 * 60 * 60 * 1000}`).toString(
      'base64'
    );
    const shareableLink = `${process.env.FRONTEND_URL}/shared-receipt/${shareToken}`;

    res.json({
      shareableLink,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: 'Shareable link created successfully',
    });
  } catch (err) {
    console.error('Error creating share link:', err);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

router.get('/shared-receipt/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = Buffer.from(token, 'base64').toString('ascii');
    const [paymentId, expiry] = decoded.split(':');

    if (Date.now() > parseInt(expiry)) {
      return res.status(410).json({ error: 'This share link has expired' });
    }

    const payment = await Booking.findById(paymentId).populate('listingId', 'name location');

    if (!payment) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const publicReceiptData = {
      receiptId: `HB-${payment.paymentReference}`,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
      listingName: payment.listingId?.name,
      status: payment.status,
    };

    res.json(publicReceiptData);
  } catch (err) {
    console.error('Error accessing shared receipt:', err);
    res.status(500).json({ error: 'Invalid share link' });
  }
});

router.get('/:paymentId/analytics', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.headers.authorization;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payment = await Booking.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await AnalyticsService.getReceiptStats(paymentId);

    res.json(stats);
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/:paymentId/expiry', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.headers.authorization;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payment = await Booking.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const paymentDate = new Date(payment.paidAt || payment.createdAt);
    const expiryDate = new Date(paymentDate);
    expiryDate.setDate(expiryDate.getDate() + 90);
    const now = new Date();
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    res.json({
      paymentId,
      expiryDate,
      daysRemaining,
      isExpired: daysRemaining <= 0,
      canExtend: daysRemaining > 0 && daysRemaining <= 30,
    });
  } catch (err) {
    console.error('Error checking receipt expiry:', err);
    res.status(500).json({ error: 'Failed to check receipt expiry' });
  }
});

router.post('/:paymentId/extend-expiry', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.headers.authorization;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payment = await Booking.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const paymentDate = new Date(payment.paidAt || payment.createdAt);
    const expiryDate = new Date(paymentDate);
    expiryDate.setDate(expiryDate.getDate() + 90);
    const now = new Date();
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysRemaining > 30) {
      return res.status(400).json({
        error: 'Receipt extension is only available within 30 days of expiry',
      });
    }

    if (daysRemaining <= 0) {
      return res.status(400).json({
        error: 'Receipt has already expired and cannot be extended',
      });
    }

    const newExpiryDate = new Date(expiryDate);
    newExpiryDate.setDate(newExpiryDate.getDate() + 90);

    res.json({
      message: 'Receipt expiry extended successfully',
      oldExpiryDate: expiryDate,
      newExpiryDate,
      extendedByDays: 90,
    });
  } catch (err) {
    console.error('Error extending receipt expiry:', err);
    res.status(500).json({ error: 'Failed to extend receipt expiry' });
  }
});

module.exports = router;