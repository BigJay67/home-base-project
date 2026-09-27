const admin = require('firebase-admin');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email || null;
    req.userName = decodedToken.name || null;
    req.userEmailVerified = decodedToken.email_verified || false;

    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);

    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    if (err.code === 'auth/argument-error' || err.code === 'auth/id-token-revoked') {
      return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }

    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Blocks the request unless the user's email is verified.
// Phone-only accounts (no email on the token) are exempt — they proved
// identity via SMS instead, so there is no email to verify.
const requireVerifiedEmail = (req, res, next) => {
  if (req.userEmail && !req.userEmailVerified) {
    return res.status(403).json({
      error: 'Please verify your email address before doing this. Check your inbox for the verification link, or resend it from your profile.'
    });
  }
  next();
};

// Verifies the token, then checks the user has role = 'admin' in the database
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const user = await User.findOne({ userId });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.userId = userId;
    req.userEmail = decodedToken.email || null;
    req.userName = decodedToken.name || null;
    req.userEmailVerified = decodedToken.email_verified || false;
    next();
  } catch (err) {
    console.error('Admin auth error:', err.message);

    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }

    return res.status(403).json({ error: 'Authentication failed' });
  }
};

module.exports = { verifyToken, adminAuth, requireVerifiedEmail };