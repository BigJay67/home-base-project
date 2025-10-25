const dotenv = require('dotenv');
dotenv.config();

const requiredEnvVars = [
  'MONGO_URI', 'PAYSTACK_SECRET_KEY', 
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY'
];

const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.0.192:3000',
  'https://home-base-project.vercel.app'
];

const getCallbackUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://yourapp.com/payment-callback';
  }
  if (process.env.FRONTEND_URL) {
    return `${process.env.FRONTEND_URL}/payment-callback`;
  }
  return 'http://localhost:3000/payment-callback';
};

module.exports = { requiredEnvVars, allowedOrigins, getCallbackUrl };