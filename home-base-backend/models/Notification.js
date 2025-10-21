const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: {
    type: String,
    required: true,
    enum: [
      'booking_created',
      'booking_confirmed', 
      'booking_cancelled',
      'payment_success',
      'payment_failed',
      'new_review',
      'review_reply',
      'listing_approved',
      'listing_rejected',
      'system_announcement'
    ]
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedModel' },
  relatedModel: { type: String, enum: ['Booking', 'Review', 'Listing', null] },
  isRead: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: function() { return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); }
  }
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);