// ============================================================
// models/Booking.js  — FIXED VERSION
//
// Changes from the original:
//   1. FIXED: duplicate index warning — "createdAt" was both
//      defined manually in the schema AND indexed via
//      bookingSchema.index(). Removed the manual createdAt
//      field and let Mongoose's { timestamps: true } handle
//      createdAt and updatedAt automatically.
//   2. ADDED: hostId, dates, totalAmount, notes, status enum
//      that matches what routes/bookings.js actually uses.
// ============================================================

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({

  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },

  userId: {
    type: String,
    required: true,
  },

  // ── ADDED: the host (listing owner) ID
  hostId: {
    type: String,
  },

  userEmail: {
    type: String,
    required: true,
  },

  amount: {
    type: Number,
    required: true,
  },

  // ── ADDED: booking dates selected by the guest
  dates: [{ type: String }],

  // ── ADDED: total amount (routes/bookings.js uses this)
  totalAmount: {
    type: Number,
  },

  // ── ADDED: host notes on the booking
  notes: {
    type: String,
  },

  paymentReference: {
    type: String,
    required: true,
  },

  // FIXED: status now includes 'confirmed' and 'cancelled'
  // which routes/bookings.js uses when a host updates a booking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },

  paymentMethod: {
    type: String,
    default: 'card'
  },

  currency: {
    type: String,
    default: 'NGN'
  },

  paidAt: {
    type: Date
  },

  receiptData: {
    transactionId: String,
    gatewayResponse: String,
    channel: String,
    ipAddress: String
  },

}, { timestamps: true });  // ← This handles createdAt + updatedAt

// These indexes are fine — they don't conflict now
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ paymentReference: 1 });

module.exports = mongoose.model('Booking', bookingSchema);