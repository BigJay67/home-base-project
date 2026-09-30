const express = require('express');
const rateLimit = require('express-rate-limit');
const { parseSearchQuery } = require('../services/aiSearchService');
const router = express.Router();

// Each call may cost money (Anthropic API), so this gets its own tighter limit
// on top of the general API rate limiter already applied globally.
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many searches. Please wait a few minutes and try again.' },
});

router.post('/parse', searchLimiter, async (req, res) => {
  try {
    const { query } = req.body;
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'A search query is required' });
    }
    if (query.length > 200) {
      return res.status(400).json({ error: 'Search query is too long' });
    }

    const filters = await parseSearchQuery(query.trim());
    res.json(filters);
  } catch (err) {
    console.error('Error parsing search query:', err.message);
    res.status(500).json({ error: 'Could not process that search right now' });
  }
});

module.exports = router;