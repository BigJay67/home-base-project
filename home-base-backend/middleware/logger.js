const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  info: (message, meta = {}) => {
    if (isDev) {
      console.log(JSON.stringify({ level: 'info', message, ...meta }));
    } else {
      // In production, skip meta to avoid leaking sensitive fields
      console.log(JSON.stringify({ level: 'info', message }));
    }
  },

  error: (message, error = {}) => {
    // Always log errors — but in production don't log the full stack
    if (isDev) {
      console.error(JSON.stringify({ level: 'error', message, error: error.message, stack: error.stack }));
    } else {
      console.error(JSON.stringify({ level: 'error', message, error: error.message }));
    }
  }
};

const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();

  if (isDev) {
    // Development: show everything so you can debug easily
    console.log(`[${timestamp}] ${req.method} ${req.url}`);

    // Don't log body for image uploads — they're huge base64 strings
    const hasImages = req.body?.images || req.body?.profilePicture;
    if (hasImages) {
      console.log('Body: [contains image data — skipped]');
    } else {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
  } else {
    // Production: log only method + URL — no body, no tokens
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
  }

  next();
};

module.exports = { logger, requestLogger };