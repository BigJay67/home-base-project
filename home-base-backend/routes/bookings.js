const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const router = express.Router();


const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  

  const userId = token.replace('Bearer ', '').trim();
  if (!userId) {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  
  req.userId = userId;
  next();
};


router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { userId } = req;
    console.log('Fetching bookings for user:', userId);
    
    const bookings = await Booking.find({ 
      $or: [{ userId }, { hostId: userId }] 
    })
    .populate('listingId', 'name location price type images')
    .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    
    console.log('Fetching booking:', id, 'for user:', userId);
    
    if (!id || id === ':id' || !mongoose.isValidObjectId(id)) {
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
    console.error('Error fetching booking:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId } = req;
    const { listingId, dates, totalAmount, paymentMethod } = req.body;
    
    console.log('Creating booking:', { listingId, userId, dates, totalAmount });
    
    if (!mongoose.isValidObjectId(listingId)) {
      return res.status(400).json({ error: 'Invalid listing ID' });
    }
    
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    
    if (listing.createdBy === userId) {
      return res.status(400).json({ error: 'Cannot book your own listing' });
    }
    
    const booking = new Booking({
      listingId,
      userId,
      hostId: listing.createdBy,
      dates: dates || [],
      totalAmount: parseFloat(totalAmount) || 0,
      paymentMethod: paymentMethod || 'card',
      status: 'confirmed'
    });
    
    await booking.save();
    console.log('Booking created:', booking._id);
    
    res.status(201).json(booking);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const { status, notes } = req.body;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    
    if (booking.hostId !== userId) {
      return res.status(403).json({ error: 'Only host can update booking' });
    }
    
    if (status) booking.status = status;
    if (notes) booking.notes = notes;
    
    await booking.save();
    res.json(booking);
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const { status } = req.body;
    
    console.log('Updating booking status:', id, status, 'by user:', userId);
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }
    
    const booking = await Booking.findById(id).populate('listingId', 'createdBy');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    
    if (booking.hostId !== userId) {
      return res.status(403).json({ error: 'Only host can update booking status' });
    }
    
  
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    booking.status = status;
    await booking.save();
    
    res.json(booking);
  } catch (err) {
    console.error('Error updating booking status:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

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
    
    if (booking.userId !== userId && booking.hostId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete booking' });
    }
    
    await Booking.findByIdAndDelete(id);
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;