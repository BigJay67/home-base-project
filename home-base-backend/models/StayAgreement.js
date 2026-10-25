const mongoose = require('mongoose');

const stayAgreementSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  guestId: { type: String, required: true },
  hostId: { type: String, required: true },
  terms: { type: String, required: true, maxlength: 8000 },
  houseRules: { type: String, default: '', maxlength: 3000 },
  moveInInstructions: { type: String, default: '', maxlength: 2000 },
  version: { type: Number, default: 1 },
  history: [{
    version: Number,
    terms: String,
    houseRules: String,
    moveInInstructions: String,
    guestAcceptedAt: Date,
    hostAcceptedAt: Date,
    supersededAt: Date,
  }],
  guestAcceptedAt: Date,
  hostAcceptedAt: Date,
  status: { type: String, enum: ['awaiting_guest', 'awaiting_host', 'agreed'], default: 'awaiting_guest' },
}, { timestamps: true, optimisticConcurrency: true });

stayAgreementSchema.index({ guestId: 1, updatedAt: -1 });
stayAgreementSchema.index({ hostId: 1, updatedAt: -1 });

module.exports = mongoose.model('StayAgreement', stayAgreementSchema);
