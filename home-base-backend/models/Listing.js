const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  type: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: String, required: true },
  priceValue: { type: Number, required: true },
  location: { type: String, required: true },
  amenities: [{ type: String }],
  distance: { type: String },
  payment: { type: String },
  // How many separate units (rooms or beds) can be booked on this listing
  capacity: { type: Number, default: 1, min: 1, max: 500 },
  images: [{
    thumbnail: String,
    medium: String,
    large: String,
    original: String
  }],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  }
}, {
  timestamps: true
});

listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Listing', listingSchema);