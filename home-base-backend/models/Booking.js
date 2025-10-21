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
   
    userEmail: {
        type: String,
        required: true,
    },
    
    amount: {
        type: Number,
        required: true,
    },
   
    paymentReference: {
        type: String,
        required: true,
    },
    
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
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
   
    createdAt: {
        type: Date,
        default: Date.now,
    },
});


bookingSchema.index({ userId: 1, createdAt: -1 });

bookingSchema.index({ paymentReference: 1 });


module.exports = mongoose.model('Booking', bookingSchema);