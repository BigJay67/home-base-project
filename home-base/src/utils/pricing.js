export const billingLabels = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }
export const billingLimits = { daily: 365, weekly: 52, monthly: 12, yearly: 3 }

export function getBillingPeriod(listing) {
  if (billingLabels[listing?.billingPeriod]) return listing.billingPeriod
  const legacy = `${listing?.payment || ''} ${listing?.price || ''}`.toLowerCase()
  if (/\b(daily|per day|\/day)\b/.test(legacy)) return 'daily'
  if (/\b(weekly|per week|\/week)\b/.test(legacy)) return 'weekly'
  if (/\b(monthly|per month|\/month)\b/.test(legacy)) return 'monthly'
  if (/\b(yearly|annually|annual|per year|\/year)\b/.test(legacy)) return 'yearly'
  return null
}

export const naira = amount => `₦${Number(amount || 0).toLocaleString('en-NG')}`
