const express = require('express');
const { adminAuth } = require('../middleware/auth');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const NotificationService = require('../services/notificationService');
const AnalyticsService = require('../services/analyticsService');
const router = express.Router();

router.get('/listings', adminAuth, async (req, res) => {
  try {
    const listings = await Listing.find().sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    console.error('Error fetching admin listings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('listingId', 'name')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching admin bookings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/listings/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    
    await Review.deleteMany({ listingId: id });
    await Booking.deleteMany({ listingId: id });
    
    await Listing.findByIdAndDelete(id);
    
    res.json({ message: 'Listing and associated data deleted successfully' });
  } catch (err) {
    console.error('Error deleting listing:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/listings/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "active" or "inactive"' });
    }

    const listing = await Listing.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    try {
      await NotificationService.createNotification({
        userId: listing.createdBy,
        type: status === 'active' ? 'listing_approved' : 'listing_suspended',
        title: status === 'active' ? 'Listing Approved' : 'Listing Suspended',
        message: status === 'active' 
          ? `Your listing "${listing.name}" has been approved and is now active.` 
          : `Your listing "${listing.name}" has been suspended and is no longer visible to users.`,
        relatedId: listing._id,
        relatedModel: 'Listing',
        priority: 'medium'
      });
    } catch (notifErr) {
      console.error('Status change notification error:', notifErr);
    }

    res.json({ 
      message: `Listing status updated to ${status}`,
      listing 
    });
  } catch (err) {
    console.error('Error updating listing status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/listings/bulk-status', adminAuth, async (req, res) => {
  try {
    const { listingIds, status } = req.body;

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({ error: 'Listing IDs array is required' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await Listing.updateMany(
      { _id: { $in: listingIds } },
      { status }
    );

    res.json({ 
      message: `Updated ${result.modifiedCount} listings to ${status}`,
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    console.error('Error bulk updating listing status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId })
      .select('-__v'); 

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    const listingsCount = await Listing.countDocuments({ createdBy: userId });

    const bookingsCount = await Booking.countDocuments({ userId });
    
    
    const reviewsCount = await Review.countDocuments({ userId });

    const userWithStats = {
      ...user.toObject(),
      stats: {
        listingsCount,
        bookingsCount,
        reviewsCount
      }
    };

    res.json(userWithStats);
  } catch (err) {
    console.error('Error fetching user details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, email, phoneNumber, status, role } = req.body;
    const currentAdminId = req.headers.authorization;

    
    const currentAdmin = await User.findOne({ userId: currentAdminId });
    if (!currentAdmin || currentAdmin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    if (userId === currentAdminId && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot remove your own admin privileges' });
    }

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = role;

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true }
    );

    
    console.log(`Admin ${currentAdminId} updated user ${userId}:`, updateData);

    res.json({ 
      message: 'User updated successfully',
      user: updatedUser 
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentAdminId = req.headers.authorization;

    
    if (userId === currentAdminId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await Listing.updateMany(
      { createdBy: userId },
      { 
        createdBy: 'deleted_user',
        status: 'inactive'
      }
    );

    await Review.updateMany(
      { userId },
      { 
        userName: 'Deleted User',
        userEmail: 'deleted@example.com'
      }
    );

    
    await User.findOneAndDelete({ userId });

   
    console.log(`Admin ${currentAdminId} deleted user ${userId}`);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users/:userId/make-admin', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentAdminId = req.headers.authorization;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'User is already an admin' });
    }
    user.role = 'admin';
    await user.save();
    console.log(`Admin ${currentAdminId} promoted user ${userId} to admin`);
    try {
      await NotificationService.createNotification({
        userId: userId,
        type: 'admin_promotion',
        title: 'Admin Privileges Granted',
        message: 'You have been granted admin privileges on Home Base.',
        priority: 'high'
      });
    } catch (notifErr) {
      console.error('Admin promotion notification error:', notifErr);
    }

    res.json({ 
      message: 'User promoted to admin successfully',
      user 
    });
  } catch (err) {
    console.error('Error making user admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/bookings/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('listingId', 'name location type price amenities images');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (err) {
    console.error('Error fetching admin booking details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/bookings/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['completed', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('listingId', 'name');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

   
    try {
      await NotificationService.createNotification({
        userId: booking.userId,
        type: 'booking_updated',
        title: 'Booking Status Updated',
        message: `Your booking for "${booking.listingId.name}" has been ${status}.`,
        relatedId: booking._id,
        relatedModel: 'Booking',
        priority: 'medium'
      });
    } catch (notifErr) {
      console.error('Booking status notification error:', notifErr);
    }

    res.json({ message: 'Booking status updated', booking });
  } catch (err) {
    console.error('Error updating booking status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bookings/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByIdAndDelete(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/bookings/:id/export', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('listingId', 'name location type');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=booking-${id}.json`);
    res.json(booking);
    
  } catch (err) {
    console.error('Error exporting booking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/analytics/receipts/popular', adminAuth, async (req, res) => {
    try {
        const { limit = 10, days = 30 } = req.query;
        
        const popularReceipts = await AnalyticsService.getPopularReceipts(
            parseInt(limit), 
            parseInt(days)
        );

        
        const populatedReceipts = await Promise.all(
            popularReceipts.map(async (receipt) => {
                const payment = await Booking.findById(receipt._id)
                    .populate('listingId', 'name location');
                return {
                    ...receipt,
                    payment: payment
                };
            })
        );

        res.json(populatedReceipts);
    } catch (err) {
        console.error('Error fetching popular receipts:', err);
        res.status(500).json({ error: 'Failed to fetch popular receipts' });
    }
});

module.exports = router;