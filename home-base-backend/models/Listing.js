const mongoose = require('mongoose');

// Schema for listings 
const listingSchema = new mongoose.Schema({
  // Type of listing 
  type: { type: String, required: true },
  // Name or title of the listing
  name: { type: String, required: true },
  // Price as a string 
  price: { type: String, required: true },
  // Numeric price value for calculations
  priceValue: { type: Number, required: true },
  // Location of the listing 
  location: { type: String, required: true },
  // Array of amenities offered 
  amenities: [{ type: String }],
  // Distance info 
  distance: { type: String },
  // Payment details or terms
  payment: { type: String },
  // Array of image objects with different sizes
  images: [{
    thumbnail: String, // Small image for previews
    medium: String,    // Medium-sized image
    large: String,     // Large image for detailed views
    original: String   // Original full-size image
  }],
  // ID of the user who created the listing
  createdBy: { type: String, required: true },
  // Creation timestamp
  createdAt: { type: Date, default: Date.now },
  // Status of the listing (e.g., active, inactive)
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'pending'], 
    default: 'active'
  }
}, { 
  timestamps: true // Auto-generates createdAt and updatedAt fields
});

// Export Listing model
module.exports = mongoose.model('Listing', listingSchema);