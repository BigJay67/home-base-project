const mongoose = require('mongoose');

// Define the schema for Analytics model to track receipt-related events
const analyticsSchema = new mongoose.Schema({
    // Type of analytics event 
    type: {
        type: String,
        required: true,
        enum: [
            'receipt_download',
            'receipt_email', 
            'receipt_view',
            'receipt_share',
            'receipt_print'
        ]
    },
    // Reference to Booking
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    // User Id
    userId: {
        type: String, 
        required: true
    },
    // Flexible metadata storage 
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Timestamp of event creation, with automatic expiration after 1 year 
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 365 * 24 * 60 * 60 
    }
});

// Compound index for efficient queries by payment and event type
analyticsSchema.index({ paymentId: 1, type: 1 });
// Index for retrieving recent events per user (descending by creation time)
analyticsSchema.index({ userId: 1, createdAt: -1 });
// Index for time-based queries (ascending by creation time)
analyticsSchema.index({ createdAt: 1 });
// Index for event type-specific queries over time (descending by creation time)
analyticsSchema.index({ type: 1, createdAt: -1 });

// Export the compiled Mongoose model
module.exports = mongoose.model('Analytics', analyticsSchema);