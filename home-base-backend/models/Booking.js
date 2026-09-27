const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  userId: { type: String, required: true },
  hostId: { type: String },
  userEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  totalAmount: { type: Number },

  // The date the guest plans to move in
  moveInDate: { type: Date },

  // Legacy field from the old booking form
  dates: [{ type: String }],
  notes: { type: String },

  paymentReference: { type: String, required: true, unique: true },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  hostConfirmedAt: { type: Date },

  paymentMethod: { type: String, default: 'card' },
  currency: { type: String, default: 'NGN' },
  paidAt: { type: Date },

  receiptData: {
    transactionId: String,
    gatewayResponse: String,
    channel: String,
    ipAddress: String,
  },
}, { timestamps: true });

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ hostId: 1, createdAt: -1 });
bookingSchema.index({ listingId: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);