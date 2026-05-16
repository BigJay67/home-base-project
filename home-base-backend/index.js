require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');

// ── NEW: Initialize Firebase Admin first (before auth middleware uses it)
require('./config/firebase');

const { initializeWebSocket } = require('./server/websocket');
const { requiredEnvVars, allowedOrigins } = require('./config/constants');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const { verifyToken } = require('./middleware/auth');  // ← NEW import

const listingsRouter = require('./routes/listings');
const bookingsRouter = require('./routes/bookings');
const usersRouter = require('./routes/users');
const reviewsRouter = require('./routes/reviews');
const notificationsRouter = require('./routes/notifications');
const conversationsRouter = require('./routes/conversations');
const paymentsRouter = require('./routes/payments');
const adminRouter = require('./routes/admin');
const EmailService = require('./services/emailService');
const PDFService = require('./services/pdfService');
const Analytics = require('./models/Analytics');

const emailService = new EmailService();

// ── Check required env vars
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

// ── Connect to MongoDB
// FIXED: removed useNewUrlParser and useUnifiedTopology
// (they were deprecated and causing the warnings you saw)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => {
    console.error('MongoDB connection error:', {
      message: err.message,
      mongoUri: process.env.MONGO_URI ? 'Set' : 'Missing',
    });
    process.exit(1);
  });

const app = express();
const server = http.createServer(app);
initializeWebSocket(server);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// ── Public routes (no auth needed)
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Home Base API!' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// ── Protected routes (verifyToken checks the Firebase JWT)
// All requests to these routes must include:
//   Authorization: Bearer <firebase-id-token>
app.use('/api/listings', listingsRouter);          // some public, some protected
app.use('/api/bookings', verifyToken, bookingsRouter);
app.use('/api/users', verifyToken, usersRouter);
app.use('/api/reviews', reviewsRouter);             // GET is public, POST checks inside
app.use('/api/notifications', verifyToken, notificationsRouter);
app.use('/api/conversations', verifyToken, conversationsRouter);
app.use('/api/payments', verifyToken, paymentsRouter);
app.use('/api/admin', adminRouter);                 // adminAuth is applied inside

// ── Test email routes (development only)
app.get('/api/test-email', async (req, res) => {
  try {
    const requiredVars = ['SMTP_USER', 'SMTP_PASS'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      return res.status(500).json({
        success: false,
        message: 'Missing email configuration',
        missing: missingVars,
      });
    }

    const isConfigured = await emailService.testEmailConfig();
    if (isConfigured) {
      res.json({ success: true, message: '✅ Email service is properly configured and ready!' });
    } else {
      res.status(500).json({ success: false, message: '❌ Email service configuration test failed' });
    }
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ success: false, message: 'Email test failed', error: error.message });
  }
});

app.post('/api/test-email/send', async (req, res) => {
  try {
    const { toEmail = process.env.SMTP_USER } = req.body;
    const testPaymentData = {
      receiptId: 'HB-TEST-123',
      payment: {
        paymentReference: 'TEST-REF-123',
        amount: 50000,
        currency: 'NGN',
        userEmail: toEmail,
        paidAt: new Date(),
        status: 'completed',
        listingId: { name: 'Test Luxury Apartment', location: 'Test Location, Lagos' }
      },
      company: {
        name: 'Home Base',
        address: '123 Test Street, Lagos, Nigeria',
        phone: '+234 800 000 0000',
        email: 'support@homebase.com'
      }
    };

    const pdfBuffer = await PDFService.generateReceiptForEmail(testPaymentData);
    await emailService.sendReceiptEmail(toEmail, testPaymentData, pdfBuffer);
    res.json({ success: true, message: `Test email sent successfully to ${toEmail}` });
  } catch (error) {
    console.error('Test email send error:', error);
    res.status(500).json({ success: false, message: 'Failed to send test email', error: error.message });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔌 WebSocket server initialized`);
});