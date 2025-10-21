const User = require('../models/User');

const adminAuth = async (req, res, next) => {
  try {
    const userId = req.headers.authorization;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const user = await User.findOne({ userId });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('Admin auth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { adminAuth };