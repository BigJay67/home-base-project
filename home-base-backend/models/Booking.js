const mongoose = require('mongoose');

// Schema for tracking booking-related data
const bookingSchema = new mongoose.Schema({
    // Reference to the associated Listing via ObjectId
    listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        required: true,
    },
    // ID of the user making the booking
    userId: {
        type: String,
        required: true,
    },
    // Email of the user for communication
    userEmail: {
        type: String,
        required: true,
    },
    // Booking amount 
    amount: {
        type: Number,
        required: true,
    },
    // Unique payment reference for tracking
    paymentReference: {
        type: String,
        required: true,
    },
    // Status of the booking 
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
    },
    // Payment method used 
    paymentMethod: {
        type: String,
        default: 'card'
    },
    // Currency of the payment 
    currency: {
        type: String,
        default: 'NGN'
    },
    // Timestamp when payment was completed
    paidAt: {
        type: Date
    },
    // Payment receipt details
    receiptData: {
        transactionId: String, // Transaction ID from payment gateway
        gatewayResponse: String, // Response from payment gateway
        channel: String, // Payment channel (e.g., card, bank)
        ipAddress: String // IP address of the user during payment
    },
    // Booking creation timestamp
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Index for user-specific booking history (sorted by recency)
bookingSchema.index({ userId: 1, createdAt: -1 });
// Index for fast lookup by payment reference
bookingSchema.index({ paymentReference: 1 });

// Export Booking model
module.exports = mongoose.model('Booking', bookingSchema);