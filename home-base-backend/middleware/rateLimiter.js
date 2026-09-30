const rateLimit = require('express-rate-limit');

// General ceiling for all API traffic — generous enough that no real user
// ever notices it, but stops a script from hammering the API.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a few minutes.' },
});

// Tighter limit for the actions worth protecting specifically: starting a
// payment (creates a real Paystack transaction each time) and sending
// messages (spam vector beyond what socket auth already covers).
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please slow down and try again shortly.' },
});

module.exports = { generalLimiter, writeLimiter };