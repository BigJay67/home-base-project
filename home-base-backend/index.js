require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');

// Firebase Admin must initialize before the auth middleware runs
require('./config/firebase');

const { initializeWebSocket } = require('./server/websocket');
const { requiredEnvVars, isAllowedOrigin } = require('./config/constants');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const { verifyToken } = require('./middleware/auth');

const listingsRouter = require('./routes/listings');
const bookingsRouter = require('./routes/bookings');
const usersRouter = require('./routes/users');
const reviewsRouter = require('./routes/reviews');
const notificationsRouter = require('./routes/notifications');
const conversationsRouter = require('./routes/conversations');
const paymentsRouter = require('./routes/payments');
const adminRouter = require('./routes/admin');
const webhooksRouter = require('./routes/webhooks');

// Check required env vars
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

const app = express();
const server = http.createServer(app);
const io = initializeWebSocket(server);
app.set('io', io);

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn('Blocked CORS request from origin:', origin);
      callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Webhooks need the raw request body to check signatures, so they go before express.json()
app.use('/api/webhooks', webhooksRouter);

app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Public routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Home Base API!' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes (verifyToken checks the Firebase JWT)
app.use('/api/listings', listingsRouter);            // some public, some protected inside
app.use('/api/bookings', verifyToken, bookingsRouter);
app.use('/api/users', verifyToken, usersRouter);
app.use('/api/reviews', reviewsRouter);              // GET public, POST/PUT/DELETE protected inside
app.use('/api/notifications', verifyToken, notificationsRouter);
app.use('/api/conversations', verifyToken, conversationsRouter);
app.use('/api/payments', verifyToken, paymentsRouter);
app.use('/api/admin', adminRouter);                  // adminAuth is applied inside

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});