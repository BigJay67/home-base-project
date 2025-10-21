const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

reviewSchema.index({ listingId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);