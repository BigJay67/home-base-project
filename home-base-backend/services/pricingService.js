const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];
const MAX_COUNT = { daily: 365, weekly: 52, monthly: 12, yearly: 3 };
const LABELS = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };

class PricingError extends Error {
  constructor(message) { super(message); this.name = 'PricingError'; }
}

function inferBillingPeriod(listing) {
  if (PERIODS.includes(listing?.billingPeriod)) return listing.billingPeriod;
  const legacy = `${listing?.payment || ''} ${listing?.price || ''}`.toLowerCase();
  if (/\b(daily|per day|\/day)\b/.test(legacy)) return 'daily';
  if (/\b(weekly|per week|\/week)\b/.test(legacy)) return 'weekly';
  if (/\b(monthly|per month|\/month)\b/.test(legacy)) return 'monthly';
  if (/\b(yearly|annually|annual|per year|\/year)\b/.test(legacy)) return 'yearly';
  return null;
}

function parseDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PricingError('Choose a valid move-in date');
  const day = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value) throw new PricingError('Choose a valid move-in date');
  return day;
}

function addCalendarMonths(start, months) {
  const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  return first;
}

function getQuote(listing, moveInDate, durationCount) {
  const billingPeriod = inferBillingPeriod(listing);
  if (!billingPeriod) throw new PricingError('The host needs to set a daily, weekly, monthly, or yearly rate before this property can be booked');
  const unitRate = listing.priceValue;
  if (!Number.isSafeInteger(unitRate) || unitRate <= 0) throw new PricingError('This property has an invalid rate');
  const count = Number(durationCount);
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT[billingPeriod]) {
    throw new PricingError(`Choose 1 to ${MAX_COUNT[billingPeriod]} ${LABELS[billingPeriod]}${MAX_COUNT[billingPeriod] === 1 ? '' : 's'}`);
  }
  const start = parseDay(moveInDate);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const latest = new Date(today);
  latest.setUTCFullYear(latest.getUTCFullYear() + 1);
  if (start < today) throw new PricingError('Move-in date cannot be in the past');
  if (start > latest) throw new PricingError('Move-in date must be within the next 12 months');
  const end = billingPeriod === 'daily' ? new Date(start.getTime() + count * 86400000)
    : billingPeriod === 'weekly' ? new Date(start.getTime() + count * 7 * 86400000)
      : addCalendarMonths(start, billingPeriod === 'monthly' ? count : count * 12);
  const amount = unitRate * count;
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new PricingError('The total for this stay is too large to process');
  return {
    billingPeriod,
    durationCount: count,
    durationLabel: `${count} ${LABELS[billingPeriod]}${count === 1 ? '' : 's'}`,
    unitRate,
    amount,
    moveInDate,
    checkOutDate: end.toISOString().slice(0, 10),
    nights: Math.round((end - start) / 86400000),
    longStay: billingPeriod === 'monthly' || billingPeriod === 'yearly',
  };
}

module.exports = { PERIODS, MAX_COUNT, LABELS, PricingError, inferBillingPeriod, getQuote };
