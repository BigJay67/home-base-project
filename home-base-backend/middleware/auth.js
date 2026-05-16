const admin = require('firebase-admin');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    // Firebase verifies the token signature and expiry.
    // decodedToken.uid is the real, verified Firebase user ID.
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;

    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);

    // Firebase throws specific error codes — give a helpful message
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    if (err.code === 'auth/argument-error' || err.code === 'auth/id-token-revoked') {
      return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }

    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// ── adminAuth ────────────────────────────────────────────────
// Use this on admin routes. It first verifies the token (same
// as above), then also checks the user has role = 'admin' in
// the database.
//
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check the database to confirm they're an admin
    const user = await User.findOne({ userId });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.userId = userId;
    next();
  } catch (err) {
    console.error('Admin auth error:', err.message);

    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }

    return res.status(403).json({ error: 'Authentication failed' });
  }
};

module.exports = { verifyToken, adminAuth };