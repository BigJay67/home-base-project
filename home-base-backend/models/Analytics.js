const mongoose = require('mongoose');


const analyticsSchema = new mongoose.Schema({
    
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
    
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    
    userId: {
        type: String, 
        required: true
    },
   
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
     
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 365 * 24 * 60 * 60 
    }
});

analyticsSchema.index({ paymentId: 1, type: 1 });

analyticsSchema.index({ userId: 1, createdAt: -1 });

analyticsSchema.index({ createdAt: 1 });

analyticsSchema.index({ type: 1, createdAt: -1 });


module.exports = mongoose.model('Analytics', analyticsSchema);