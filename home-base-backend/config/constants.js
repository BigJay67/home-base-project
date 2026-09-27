const dotenv = require('dotenv');
dotenv.config();

const requiredEnvVars = [
  'MONGO_URI', 'PAYSTACK_SECRET_KEY',
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY'
];

const staticAllowedOrigins = [
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

// Vercel preview deployments look like:
//   https://home-base-project-git-master-big-jay.vercel.app
//   https://home-base-project-<hash>-big-jay.vercel.app
// This matches any preview build of this specific project, without needing
// to add each one by hand. Set VERCEL_PROJECT_SLUG if your project name
// differs from "home-base-project".
const previewPattern = new RegExp(
  `^https:\\/\\/${process.env.VERCEL_PROJECT_SLUG || 'home-base-project'}-[a-z0-9-]+\\.vercel\\.app$`
);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // same-origin / server-to-server requests send no Origin header
  const clean = origin.replace(/\/$/, '');
  return staticAllowedOrigins.includes(clean) || previewPattern.test(clean);
};

const getCallbackUrl = () => {
  if (process.env.FRONTEND_URL) {
    return `${process.env.FRONTEND_URL}/payment-callback`;
  }
  return 'http://localhost:3000/payment-callback';
};

module.exports = { requiredEnvVars, isAllowedOrigin, getCallbackUrl };