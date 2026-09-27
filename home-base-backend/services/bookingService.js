const Booking = require('../models/Booking');

const PENDING_HOLD_MINUTES = 30;

// A unit is held by a paid booking, or by an unpaid one still inside its checkout window.
// Bookings without a moveInDate were made before availability existed, so they are ignored.
const holdFilter = (listingId) => ({
  listingId,
  moveInDate: { $ne: null },
  $or: [
    { status: { $in: ['completed', 'confirmed'] } },
    {
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000) },
    },
  ],
});

const getAvailability = async (listing) => {
  const capacity = listing.capacity || 1;
  const taken = await Booking.countDocuments(holdFilter(listing._id));
  return {
    capacity,
    taken,
    available: Math.max(0, capacity - taken),
    isFull: taken >= capacity,
  };
};

// Holds created before (or at the same moment as) this booking.
// Used to settle races: the earliest holds win.
const countHoldsAhead = (booking) =>
  Booking.countDocuments({
    ...holdFilter(booking.listingId),
    _id: { $ne: booking._id },
    createdAt: { $lte: booking.createdAt },
  });

module.exports = { PENDING_HOLD_MINUTES, getAvailability, countHoldsAhead };