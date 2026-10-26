const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const routePath = path.resolve(__dirname, '../routes/payments.js');
const listingId = '507f1f77bcf86cd799439011';
let payoutCode = null;
let createdBooking;
let paystackPayload;

const listing = { _id: listingId, name: 'Test stay', status: 'active', createdBy: 'host-1', priceValue: 1500000, capacity: 1 };
const mocks = {
  '../models/Booking': {
    updateMany: async () => {},
    create: async data => {
      createdBooking = data;
      return { ...data, _id: '507f1f77bcf86cd799439022', createdAt: new Date(), save: async () => {} };
    },
  },
  '../models/Listing': { findById: async () => listing },
  '../models/User': { findOne: () => ({ select: async () => payoutCode ? { payout: { subaccountCode: payoutCode } } : null }) },
  '../services/bookingService': { getAvailability: async () => ({ isFull: false }), countHoldsAhead: async () => 0 },
  '../services/paymentService': { confirmPayment: async () => ({ outcome: 'pending' }) },
  '../config/paystack': { paystack: { transaction: { initialize: async payload => {
    paystackPayload = payload;
    return { status: true, data: { authorization_url: 'https://checkout.paystack.test/booking' } };
  } } } },
  '../services/pdfService': class {},
  '../services/emailService': class {},
  '../services/analyticsService': class {},
  '../middleware/rateLimiter': { writeLimiter: (_req, _res, next) => next() },
  '../middleware/auth': { requireVerifiedEmail: (_req, _res, next) => next() },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent?.filename === routePath && Object.hasOwn(mocks, request)) return mocks[request];
  return originalLoad.call(this, request, parent, isMain);
};
let router;
try { router = require(routePath); }
finally { Module._load = originalLoad; }

const initialize = router.stack.find(layer => layer.route?.path === '/paystack/initialize').route.stack.at(-1).handle;

test('booking initialization creates a checkout with the resolved host payout', async () => {
  const moveInDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const checkOutDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  for (const code of [null, 'ACCT_test_host']) {
    payoutCode = code;
    createdBooking = undefined;
    paystackPayload = undefined;
    let status = 200;
    let payload;
    const response = { status(value) { status = value; return this; }, json(value) { payload = value; return this; } };
    await initialize({ body: { listingId, moveInDate, checkOutDate }, userId: 'guest-1', userEmail: 'guest@example.com' }, response);
    assert.equal(status, 200);
    assert.equal(payload.authorization_url, 'https://checkout.paystack.test/booking');
    assert.equal(createdBooking.amount, 1500000);
    assert.equal(createdBooking.hostSubaccountCode, code);
    assert.equal(createdBooking.platformFeePercent, code ? 10 : null);
    assert.equal(paystackPayload.amount, 150000000);
    assert.equal(paystackPayload.subaccount, code || undefined);
  }
});
