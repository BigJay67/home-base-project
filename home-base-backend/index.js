const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { initializeWebSocket } = require('./server/webSockets');
const { requiredEnvVars, allowedOrigins } = require('./config/constants');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const listingsRouter = require('./routes/listings');
const bookingsRouter = require('./routes/bookings');
const usersRouter = require('./routes/users');
const reviewsRouter = require('./routes/reviews');
const notificationsRouter = require('./routes/notifications');
const conversationsRouter = require('./routes/conversations');
const paymentsRouter = require('./routes/payments');
const adminRouter = require('./routes/admin');
const EmailService = require('./services/emailService');
const Analytics = require('./models/Analytics');

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

if (!process.env.PAYSTACK_SECRET_KEY) {
  console.error('Error: PAYSTACK_SECRET_KEY is not set in .env');
  process.exit(1);
}
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_UPLOAD_PRESET) {
  console.error('Error: Cloudinary credentials are not set in .env');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);
initializeWebSocket(server);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Home Base API!' });
});

app.use('/api/listings', listingsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/users', usersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV 
  });
});

app.get('/api/test-email', async (req, res) => {
    try {
        console.log('Testing email configuration...');
        
        
        const requiredVars = ['SMTP_USER', 'SMTP_PASS'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            return res.status(500).json({ 
                success: false, 
                message: 'Missing email configuration',
                missing: missingVars,
                currentConfig: {
                    SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Missing',
                    SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Missing',
                    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com (default)',
                    SMTP_PORT: process.env.SMTP_PORT || '587 (default)'
                }
            });
        }

        
        const isConfigured = await emailService.testEmailConfig();
        
        if (isConfigured) {
            res.json({ 
                success: true, 
                message: '✅ Email service is properly configured and ready!',
                config: {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    user: process.env.SMTP_USER
                }
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: '❌ Email service configuration test failed' 
            });
        }
    } catch (error) {
        console.error('Email test error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Email test failed',
            error: error.message,
            tip: 'Check your SMTP credentials and make sure 2-factor authentication is enabled with an app password for Gmail'
        });
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
                listingId: {
                    name: 'Test Luxury Apartment',
                    location: 'Test Location, Lagos'
                }
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
        
        res.json({ 
            success: true, 
            message: `Test email sent successfully to ${toEmail}` 
        });
    } catch (error) {
        console.error('Test email send error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send test email',
            error: error.message 
        });
    }
});

const handleSMSCalls = (req, res) => {
    res.status(501).json({
        error: 'SMS service is no longer available. Please use email or download options.',
        availableOptions: ['Email receipt', 'PDF download', 'Shareable link']
    });
};

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔌 WebSocket server initialized`);
});