const express = require('express');
const User = require('../models/User');
const { requireVerifiedEmail } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { listBanks, resolveAccount, createSubaccount, updateSubaccount } = require('../services/paystackPayoutService');
const router = express.Router();

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT) || 10;

router.get('/banks', async (req, res) => {
  try {
    res.json(await listBanks());
  } catch (err) {
    console.error('Error fetching bank list:', err.message);
    res.status(500).json({ error: 'Could not load bank list right now' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.userId }).select('payout');
    const payout = (user && user.payout) || {};
    res.json({
      isSetUp: Boolean(payout.subaccountCode),
      bankName: payout.bankName || null,
      accountName: payout.accountName || null,
      accountNumberMasked: payout.accountNumber ? `•••${payout.accountNumber.slice(-4)}` : null,
      platformFeePercent: PLATFORM_FEE_PERCENT,
    });
  } catch (err) {
    console.error('Error fetching payout status:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Confirms an account number resolves to a real account before the user commits to it
router.post('/resolve', writeLimiter, requireVerifiedEmail, async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'Account number and bank are required' });
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'Account number must be 10 digits' });
    }

    const resolved = await resolveAccount(accountNumber, bankCode);
    res.json(resolved);
  } catch (err) {
    console.error('Error resolving account:', err.message);
    res.status(400).json({ error: 'Could not verify that account. Check the number and bank, then try again.' });
  }
});

// Creates (or updates) the Paystack subaccount that bookings on this user's
// listings will split to. The account name is resolved again here, server-side —
// never trusted from the request body — so it can't be spoofed.
router.post('/setup', writeLimiter, requireVerifiedEmail, async (req, res) => {
  try {
    const { accountNumber, bankCode, bankName } = req.body;
    if (!accountNumber || !bankCode || !bankName) {
      return res.status(400).json({ error: 'Account number, bank code and bank name are required' });
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'Account number must be 10 digits' });
    }

    const resolved = await resolveAccount(accountNumber, bankCode);

    const user = await User.findOne({ userId: req.userId });
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const businessName = user.displayName || resolved.accountName || 'HomeBase Host';

    let subaccountCode = user.payout && user.payout.subaccountCode;
    if (subaccountCode) {
      await updateSubaccount(subaccountCode, {
        bankCode,
        accountNumber,
        percentageCharge: PLATFORM_FEE_PERCENT,
      });
    } else {
      const created = await createSubaccount({
        businessName,
        bankCode,
        accountNumber,
        percentageCharge: PLATFORM_FEE_PERCENT,
      });
      subaccountCode = created.subaccountCode;
    }

    user.payout = {
      subaccountCode,
      bankCode,
      bankName,
      accountNumber,
      accountName: resolved.accountName,
      setupAt: new Date(),
    };
    await user.save();

    res.json({
      message: 'Payout details saved',
      accountName: resolved.accountName,
      platformFeePercent: PLATFORM_FEE_PERCENT,
    });
  } catch (err) {
    console.error('Error setting up payout:', err.message);
    res.status(400).json({ error: 'Could not save payout details. Please check your details and try again.' });
  }
});

module.exports = router;