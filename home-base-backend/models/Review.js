const mongoose = require('mongoose');

// Schema for user reviews of listings
const reviewSchema = new mongoose.Schema({
  // Reference to the associated listing
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  // ID of the user submitting the review
  userId: { type: String, required: true },
  // Email of the reviewing user
  userEmail: { type: String, required: true },
  // Display name of the reviewer
  userName: { type: String, required: true },
  // Rating score (1 to 5)
  rating: { type: Number, required: true, min: 1, max: 5 },
  // Review comment with character limit
  comment: { type: String, required: true, maxlength: 500 },
  // Creation timestamp
  createdAt: { type: Date, default: Date.now }
});

// Unique index to prevent multiple reviews by the same user for the same listing
reviewSchema.index({ listingId: 1, userId: 1 }, { unique: true });

// Export Review model
module.exports = mongoose.model('Review', reviewSchema);