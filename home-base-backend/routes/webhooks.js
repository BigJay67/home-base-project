const express = require('express');
const crypto = require('crypto');
const { confirmPayment } = require('../services/paymentService');
const router = express.Router();

// The raw body is required to check Paystack's signature
router.post('/paystack', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  try {
    const signature = req.get('x-paystack-signature');
    if (!signature || !Buffer.isBuffer(req.body)) {
      return res.sendStatus(401);
    }

    const expected = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.sendStatus(401);
    }

    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch (parseErr) {
      return res.sendStatus(400);
    }

    if (event.event === 'charge.success' && event.data && event.data.reference) {
      const result = await confirmPayment(event.data.reference);
      console.log(`Webhook processed ${event.data.reference}: ${result.outcome}`);
    }

    // 200 tells Paystack not to retry. Errors below return 500 so it does retry.
    res.sendStatus(200);
  } catch (err) {
    console.error('Paystack webhook error:', err.message);
    res.sendStatus(500);
  }
});

module.exports = router;