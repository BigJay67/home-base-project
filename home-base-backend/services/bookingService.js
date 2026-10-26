const Booking = require('../models/Booking');

const PENDING_HOLD_MINUTES = 30;

// A unit is held by a paid booking, or by an unpaid one still inside its checkout window.
// Bookings without both dates predate date-range availability and are ignored here —
// they still show up in booking history, just not in this math.
const activeHoldFilter = (listingId) => ({
  listingId,
  moveInDate: { $ne: null },
  checkOutDate: { $ne: null },
  $or: [
    { status: { $in: ['completed', 'confirmed'] } },
    {
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000) },
    },
  ],
});

// Counts existing holds on this listing whose [moveIn, checkOut) range overlaps
// the given range. Standard interval-overlap test: two ranges overlap unless
// one ends before or exactly when the other starts.
const countOverlapping = (listingId, moveIn, checkOut) =>
  Booking.countDocuments({
    ...activeHoldFilter(listingId),
    moveInDate: { $lt: checkOut },
    checkOutDate: { $gt: moveIn },
  });

const getAvailability = async (listing, moveIn, checkOut) => {
  const capacity = listing.capacity || 1;
  const taken = await countOverlapping(listing._id, moveIn, checkOut);
  return {
    capacity,
    taken,
    available: Math.max(0, capacity - taken),
    isFull: taken >= capacity,
  };
};

// Holds that overlap this booking's own date range and were created first.
// The ID breaks ties when two requests land in the same millisecond.
const countHoldsAhead = (booking) =>
  Booking.countDocuments({
    ...activeHoldFilter(booking.listingId),
    _id: { $ne: booking._id },
    moveInDate: { $lt: booking.checkOutDate },
    checkOutDate: { $gt: booking.moveInDate },
    $and: [
      { $or: [
        { createdAt: { $lt: booking.createdAt } },
        { createdAt: booking.createdAt, _id: { $lt: booking._id } },
      ] },
    ],
  });

module.exports = { PENDING_HOLD_MINUTES, getAvailability, countHoldsAhead };
