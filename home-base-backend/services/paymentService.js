const Booking = require('../models/Booking');
const { paystack } = require('../config/paystack');
const NotificationService = require('./notificationService');

const safeNotify = async (fn) => {
  try {
    await fn();
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// Checks a reference with Paystack and updates the booking.
// Safe to call many times for the same reference.
async function confirmPayment(reference) {
  const booking = await Booking.findOne({ paymentReference: reference })
    .populate('listingId', 'name createdBy');

  if (!booking) return { outcome: 'not_found' };
  if (booking.status === 'completed' || booking.status === 'confirmed') {
    return { outcome: 'success', booking };
  }
  if (booking.status === 'refunded') return { outcome: 'refunded', booking };

  const verification = await paystack.transaction.verify({ reference });
  const data = verification && verification.data;
  if (!data) throw new Error('Empty verification response from Paystack');

  const listingName = booking.listingId ? booking.listingId.name : 'your booking';
  const hostId = booking.hostId || (booking.listingId && booking.listingId.createdBy);

  if (data.status === 'success') {
    const expectedKobo = Math.round(booking.amount * 100);
    if (data.amount !== expectedKobo || data.currency !== (booking.currency || 'NGN')) {
      console.error('Payment amount mismatch', {
        reference,
        expected: expectedKobo,
        paid: data.amount,
        currency: data.currency,
      });
      await Booking.updateOne(
        { _id: booking._id, status: { $nin: ['completed', 'confirmed', 'refunded'] } },
        { $set: { status: 'failed' } }
      );
      return { outcome: 'mismatch', booking };
    }

    // Only one caller wins this update, so notifications go out once
    const updated = await Booking.findOneAndUpdate(
      { _id: booking._id, status: { $nin: ['completed', 'confirmed', 'refunded'] } },
      {
        $set: {
          status: 'completed',
          hostId,
          totalAmount: booking.totalAmount || booking.amount,
          paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
          paymentMethod: data.channel,
          receiptData: {
            transactionId: data.id,
            gatewayResponse: data.gateway_response,
            channel: data.channel,
            ipAddress: data.ip_address,
          },
        },
      },
      { new: true }
    );

    if (updated) {
      await safeNotify(() => NotificationService.notifyPaymentSuccess(updated, listingName));
      if (hostId) {
        await safeNotify(() =>
          NotificationService.notifyListingOwnerBooking(updated, hostId, listingName)
        );
      }
    }
    return { outcome: 'success', booking: updated || booking };
  }

  if (data.status === 'failed' || data.status === 'reversed') {
    const updated = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'pending' },
      { $set: { status: 'failed' } },
      { new: true }
    );
    if (updated) {
      await safeNotify(() => NotificationService.notifyPaymentFailed(updated, listingName));
    }
    return { outcome: 'failed', booking: updated || booking };
  }

  // abandoned, ongoing, pending: not paid yet, leave the booking as it is
  return { outcome: 'pending', paystackStatus: data.status, booking };
}

module.exports = { confirmPayment };