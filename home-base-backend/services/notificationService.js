const Notification = require('../models/Notification');

class NotificationService {
  static async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      console.log('Notification created:', notification.title);
      return notification;
    } catch (err) {
      console.error('Error creating notification:', err);
      throw err;
    }
  }

  static async notifyBookingCreated(booking, listingName) {
    return this.createNotification({
      userId: booking.userId,
      type: 'booking_created',
      title: 'Booking Created',
      message: `Your booking for "${listingName}" has been created successfully.`,
      relatedId: booking._id,
      relatedModel: 'Booking',
      priority: 'medium'
    });
  }

  static async notifyPaymentSuccess(booking, listingName) {
    return this.createNotification({
      userId: booking.userId,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Payment for "${listingName}" was successful. Your booking is confirmed!`,
      relatedId: booking._id,
      relatedModel: 'Booking',
      priority: 'high'
    });
  }

  static async notifyPaymentFailed(booking, listingName) {
    return this.createNotification({
      userId: booking.userId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Payment for "${listingName}" failed. Please try again.`,
      relatedId: booking._id,
      relatedModel: 'Booking',
      priority: 'high'
    });
  }

  static async notifyNewReview(review, listingOwnerId, listingName) {
    return this.createNotification({
      userId: listingOwnerId,
      type: 'new_review',
      title: 'New Review',
      message: `You have a new review for your listing "${listingName}".`,
      relatedId: review._id,
      relatedModel: 'Review',
      priority: 'medium'
    });
  }

  static async notifyListingOwnerBooking(booking, listingOwnerId, listingName) {
    return this.createNotification({
      userId: listingOwnerId,
      type: 'booking_created',
      title: 'New Booking',
      message: `Your listing "${listingName}" has a new booking from ${booking.userEmail}.`,
      relatedId: booking._id,
      relatedModel: 'Booking',
      priority: 'high'
    });
  }
  static async notifyNewMessage(conversation, recipientId, senderName) {
    return this.createNotification({
      userId: recipientId,
      type: 'new_message',
      title: 'New Message',
      message: `${senderName} sent you a message about "${conversation.listingName}"`,
      relatedId: conversation._id,
      relatedModel: 'Conversation',
      priority: 'medium'
    });
  }
}

module.exports = NotificationService;