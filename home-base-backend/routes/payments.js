const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const PDFService = require('../services/pdfService');
const EmailService = require('../services/emailService');
const AnalyticsService = require('../services/analyticsService');
const { getAvailability, countHoldsAhead } = require('../services/bookingService');
const { confirmPayment } = require('../services/paymentService');
const { paystack } = require('../config/paystack');
const router = express.Router();
const emailService = new EmailService();

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const { writeLimiter } = require('../middleware/rateLimiter');

const { requireVerifiedEmail } = require('../middleware/auth');

const MAX_STAY_DAYS = 365;

router.post('/paystack/initialize', requireVerifiedEmail, async (req, res) => {
  try {
    const { listingId, moveInDate, checkOutDate } = req.body;
    const userId = req.userId;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ error: 'A valid listing is required' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'This listing is not available for booking' });
    }
    if (listing.createdBy === userId) {
      return res.status(400).json({ error: 'You cannot book your own listing' });
    }

    // Move-in and check-out dates: both required, check-out after move-in,
    // move-in not in the past, and the whole stay within the next 12 months
    const moveIn = new Date(moveInDate);
    const checkOut = new Date(checkOutDate);
    if (!moveInDate || Number.isNaN(moveIn.getTime())) {
      return res.status(400).json({ error: 'Please choose your move-in date' });
    }
    if (!checkOutDate || Number.isNaN(checkOut.getTime())) {
      return res.status(400).json({ error: 'Please choose your check-out date' });
    }
    if (checkOut <= moveIn) {
      return res.status(400).json({ error: 'Check-out date must be after your move-in date' });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const latest = new Date(today);
    latest.setUTCFullYear(latest.getUTCFullYear() + 1);
    if (moveIn < today) {
      return res.status(400).json({ error: 'Move-in date cannot be in the past' });
    }
    if (moveIn > latest) {
      return res.status(400).json({ error: 'Move-in date must be within the next 12 months' });
    }

    const stayDays = Math.round((checkOut - moveIn) / (1000 * 60 * 60 * 24));
    if (stayDays > MAX_STAY_DAYS) {
      return res.status(400).json({ error: `Stays longer than ${MAX_STAY_DAYS} days are not supported yet.` });
    }

    // Email comes from the verified token. Phone-login users have none, so accept a valid one they typed.
    const userEmail =
      req.userEmail ||
      (typeof req.body.userEmail === 'string' && EMAIL_RE.test(req.body.userEmail)
        ? req.body.userEmail
        : null);
    if (!userEmail) {
      return res.status(400).json({ error: 'A valid email is required to pay. Please add one to your profile.' });
    }

    // The price always comes from the listing, never from the browser.
    // Note: this charges the listing's flat price regardless of stay length —
    // per-night/per-month proration isn't implemented yet.
    const amount = listing.priceValue;
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'This listing has an invalid price' });
    }

    // Release this user's own earlier unpaid attempts so they do not block themselves
    await Booking.updateMany(
      { listingId, userId, status: 'pending' },
      { $set: { status: 'cancelled' } }
    );

    const availability = await getAvailability(listing, moveIn, checkOut);
    if (availability.isFull) {
      return res.status(409).json({ error: 'This property is fully booked for those dates. Try different dates.' });
    }

    // Create the booking first so it holds a unit while the user pays
    const reference = `HB-${crypto.randomBytes(9).toString('hex')}`;
    const booking = await Booking.create({
      listingId,
      userId,
      hostId: listing.createdBy,
      userEmail,
      amount,
      totalAmount: amount,
      moveInDate: moveIn,
      checkOutDate: checkOut,
      paymentReference: reference,
    });

    // If two people started at the same moment for overlapping dates, the earlier holds win
    const holdsAhead = await countHoldsAhead(booking);
    if (holdsAhead >= (listing.capacity || 1)) {
      booking.status = 'cancelled';
      await booking.save();
      return res.status(409).json({ error: 'Someone else just booked those dates.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    let payment;
    try {
      payment = await paystack.transaction.initialize({
        email: userEmail,
        amount: Math.round(amount * 100),
        reference,
        callback_url: `${frontendUrl}/payment-callback`,
        metadata: { listingId, userId },
      });
      if (!payment.status) {
        throw new Error('Paystack initialization failed');
      }
    } catch (payErr) {
      booking.status = 'failed';
      await booking.save();
      throw payErr;
    }

    res.json({
      authorization_url: payment.data.authorization_url,
      reference,
    });
  } catch (err) {
    console.error('Error initializing payment:', err);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

router.get('/paystack/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    const booking = await Booking.findOne({ paymentReference: reference }).select('userId');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await confirmPayment(reference);

    switch (result.outcome) {
      case 'success':
        return res.json({ status: 'success', message: 'Payment verified' });
      case 'failed':
        return res.json({ status: 'failed', message: 'Payment failed' });
      case 'refunded':
        return res.json({ status: 'failed', message: 'This payment was refunded' });
      case 'mismatch':
        return res.status(400).json({
          error: 'The amount paid does not match this booking. Please contact support.',
        });
      default:
        return res.json({
          status: 'pending',
          message: `Payment is ${result.paystackStatus || 'pending'}`,
        });
    }
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const userId = req.userId;
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
    const userId = req.userId;
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
    const userId = req.userId;

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

const shareSecret = () => process.env.SHARE_TOKEN_SECRET || process.env.PAYSTACK_SECRET_KEY;

const signShareToken = (paymentId, expiresAt) => {
  const payload = `${paymentId}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', shareSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
};

const readShareToken = (token) => {
  try {
    const decoded = Buffer.from(String(token), 'base64url').toString('utf8');
    const [paymentId, expiresAt, sig] = decoded.split('.');
    if (!paymentId || !expiresAt || !sig) return null;
    const expected = crypto
      .createHmac('sha256', shareSecret())
      .update(`${paymentId}.${expiresAt}`)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return { paymentId, expiresAt: parseInt(expiresAt, 10) };
  } catch (err) {
    return null;
  }
};

router.post('/:paymentId/share', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(paymentId)) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    const payment = await Booking.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (payment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed payments can be shared' });
    }

    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const shareToken = signShareToken(paymentId, expiresAt);
    const shareableLink = `${process.env.FRONTEND_URL}/shared-receipt/${shareToken}`;

    res.json({
      shareableLink,
      expiresAt: new Date(expiresAt).toISOString(),
      message: 'Shareable link created successfully',
    });
  } catch (err) {
    console.error('Error creating share link:', err);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

router.get('/shared-receipt/:token', async (req, res) => {
  try {
    const parsed = readShareToken(req.params.token);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid share link' });
    }
    if (Date.now() > parsed.expiresAt) {
      return res.status(410).json({ error: 'This share link has expired' });
    }

    const payment = await Booking.findById(parsed.paymentId).populate('listingId', 'name location');
    if (!payment) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({
      receiptId: `HB-${payment.paymentReference}`,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
      listingName: payment.listingId ? payment.listingId.name : null,
      status: payment.status,
    });
  } catch (err) {
    console.error('Error accessing shared receipt:', err);
    res.status(500).json({ error: 'Invalid share link' });
  }
});

router.get('/:paymentId/analytics', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.userId;

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
    const userId = req.userId;

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
    const userId = req.userId;

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