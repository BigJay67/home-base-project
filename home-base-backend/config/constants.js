const dotenv = require('dotenv');
dotenv.config();

const requiredEnvVars = [
  'MONGO_URI', 'PAYSTACK_SECRET_KEY',
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY'
];

const allowedOrigins = [
  ...new Set(
    [
      'http://localhost:3000',
      'https://home-base-project.vercel.app',
      process.env.FRONTEND_URL,
      ...(process.env.EXTRA_ORIGINS || '').split(',')
    ]
      .map(origin => (origin || '').trim().replace(/\/$/, ''))
      .filter(Boolean)
  )
];

const getCallbackUrl = () => {
  if (process.env.FRONTEND_URL) {
    return `${process.env.FRONTEND_URL}/payment-callback`;
  }
  return 'http://localhost:3000/payment-callback';
};

module.exports = { requiredEnvVars, allowedOrigins, getCallbackUrl };