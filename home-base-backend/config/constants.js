const dotenv = require('dotenv');
dotenv.config();

const requiredEnvVars = [
  'MONGO_URI', 'PAYSTACK_SECRET_KEY', 
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY'
];

const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.0.192:3000',
  'https://your-app-name.netlify.app'
];

app.use(cors({
  origin: function (origin, callback) {
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

const getCallbackUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return `${process.env.FRONTEND_URL}/payment-callback`;
  }
  return 'http://localhost:3000/payment-callback';
};

module.exports = { requiredEnvVars, allowedOrigins, getCallbackUrl };