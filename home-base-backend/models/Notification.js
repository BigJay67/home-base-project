const mongoose = require('mongoose');

// Schema for user notifications
const notificationSchema = new mongoose.Schema({
  // ID of the user receiving the notification
  userId: { type: String, required: true, index: true },
  // Type of notification (e.g., booking, payment, review)
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
  // Notification title
  title: { type: String, required: true },
  // Notification message content
  message: { type: String, required: true },
  // Reference to related document (dynamic model)
  relatedId: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedModel' },
  // Model type for relatedId reference
  relatedModel: { type: String, enum: ['Booking', 'Review', 'Listing', null] },
  // Tracks if notification is read
  isRead: { type: Boolean, default: false },
  // Notification priority level
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  // Creation timestamp
  createdAt: { type: Date, default: Date.now },
  // Auto-expiry after 30 days
  expiresAt: {
    type: Date,
    default: function() { return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); }
  }
});

// Index for user-specific notifications by creation time
notificationSchema.index({ userId: 1, createdAt: -1 });
// Index for user read/unread notifications
notificationSchema.index({ userId: 1, isRead: 1 });
// TTL index for auto-deletion after expiry
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export Notification model
module.exports = mongoose.model('Notification', notificationSchema);