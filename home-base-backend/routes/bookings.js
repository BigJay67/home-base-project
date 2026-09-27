const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const NotificationService = require('../services/notificationService');
const router = express.Router();

// Bookings are created only through /api/payments/paystack/initialize.
// Payment states (completed, failed, refunded) are set only by Paystack confirmation or an admin.
const HOST_TRANSITIONS = {
  pending: ['cancelled'],
  completed: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
};
const GUEST_TRANSITIONS = {
  pending: ['cancelled'],
};

router.get('/', async (req, res) => {
  try {
    const { userId } = req;
    const { role } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);

    let filter = { $or: [{ userId }, { hostId: userId }] };
    if (role === 'guest') filter = { userId };
    if (role === 'host') filter = { hostId: userId };

    const bookings = await Booking.find(filter)
      .populate('listingId', 'name location price type images')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(id)
      .populate('listingId', 'name location price type images createdBy');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.userId !== userId && booking.hostId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to booking' });
    }

    res.json(booking);
  } catch (err) {
    console.error('Error fetching booking:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const { status, notes } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(id).populate('listingId', 'name');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const isHost = booking.hostId === userId;
    const isGuest = booking.userId === userId;
    if (!isHost && !isGuest) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (notes !== undefined && isHost) {
      booking.notes = String(notes).slice(0, 500);
    }

    let changedTo = null;
    if (status && status !== booking.status) {
      const allowed = (isHost ? HOST_TRANSITIONS : GUEST_TRANSITIONS)[booking.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: `A ${booking.status} booking cannot be changed to ${status}`,
        });
      }
      booking.status = status;
      if (status === 'confirmed') booking.hostConfirmedAt = new Date();
      changedTo = status;
    }

    await booking.save();

    // Tell the other side
    if (changedTo) {
      const listingName = booking.listingId ? booking.listingId.name : 'the property';
      const recipientId = isHost ? booking.userId : booking.hostId;
      if (recipientId) {
        try {
          await NotificationService.createNotification({
            userId: recipientId,
            type: changedTo === 'confirmed' ? 'booking_confirmed' : 'booking_cancelled',
            title: changedTo === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled',
            message: `The booking for "${listingName}" was ${changedTo}.`,
            relatedId: booking._id,
            relatedModel: 'Booking',
            priority: 'high',
          });
        } catch (notifErr) {
          console.error('Booking notification error:', notifErr.message);
        }
      }
    }

    res.json(booking);
  } catch (err) {
    console.error('Error updating booking:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

router.put('/:id/status', updateBooking);
router.put('/:id', updateBooking);

// Guests can clear out unpaid, failed or cancelled attempts. Paid records are never deleted here.
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete booking' });
    }
    if (!['pending', 'failed', 'cancelled'].includes(booking.status) || booking.paidAt) {
      return res.status(400).json({ error: 'Paid bookings cannot be deleted. Contact support instead.' });
    }

    await Booking.findByIdAndDelete(id);
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error('Error deleting booking:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;