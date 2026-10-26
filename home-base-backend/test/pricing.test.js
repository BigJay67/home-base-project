const test = require('node:test');
const assert = require('node:assert/strict');
const { getQuote, inferBillingPeriod, PricingError } = require('../services/pricingService');

const future = new Date();
future.setUTCDate(future.getUTCDate() + 3);
const start = future.toISOString().slice(0, 10);

test('legacy terms map to explicit units without guessing session prices', () => {
  assert.equal(inferBillingPeriod({ payment: 'Daily Rental' }), 'daily');
  assert.equal(inferBillingPeriod({ payment: 'Annually' }), 'yearly');
  assert.equal(inferBillingPeriod({ payment: 'Monthly' }), 'monthly');
  assert.equal(inferBillingPeriod({ payment: 'every session' }), null);
});

test('daily and weekly totals multiply full units', () => {
  const daily = getQuote({ priceValue: 50000, billingPeriod: 'daily' }, start, 3);
  assert.equal(daily.amount, 150000);
  assert.equal(daily.nights, 3);
  const weekly = getQuote({ priceValue: 80000, billingPeriod: 'weekly' }, start, 2);
  assert.equal(weekly.amount, 160000);
  assert.equal(weekly.nights, 14);
});

test('monthly and yearly terms use calendar boundaries', () => {
  const monthly = getQuote({ priceValue: 200000, billingPeriod: 'monthly' }, start, 2);
  assert.equal(monthly.amount, 400000);
  assert.equal(monthly.longStay, true);
  const yearly = getQuote({ priceValue: 700000, billingPeriod: 'yearly' }, start, 1);
  assert.equal(yearly.amount, 700000);
  assert.equal(yearly.checkOutDate.slice(0, 4), String(Number(start.slice(0, 4)) + 1));
});

test('invalid or unlabelled rates cannot be charged', () => {
  assert.throws(() => getQuote({ priceValue: 10000, payment: 'per session' }, start, 1), PricingError);
  assert.throws(() => getQuote({ priceValue: 10000, billingPeriod: 'daily' }, start, 0), PricingError);
});
