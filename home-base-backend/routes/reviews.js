const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Listing = require('../models/Listing');
const NotificationService = require('../services/notificationService');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { userId, listingId } = req.query;
    
    let query = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (listingId) {
      query.listingId = listingId;
    }
    
    const reviews = await Review.find(query)
      .populate('listingId', 'name location')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    console.log('Fetching reviews for listingId:', listingId);

    if (!listingId || listingId === ':id' || !mongoose.isValidObjectId(listingId)) {
      return res.json({ reviews: [], averageRating: 0, totalReviews: 0 });
    }

    const reviews = await Review.find({ listingId: listingId }).sort({ createdAt: -1 });
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;
    
    res.json({
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length
    });
  } catch (err) {
    console.error('Error fetching reviews:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/:listingId/average', async (req, res) => {
  try {
    const { listingId } = req.params;
    console.log('Calculating average rating for listing:', listingId);
    
    if (!listingId || listingId === ':id' || !mongoose.isValidObjectId(listingId)) {
      return res.json({ averageRating: 0, totalReviews: 0 });
    }
    
    const reviews = await Review.find({ listingId });
    console.log('Found reviews:', reviews.length);
    
    if (reviews.length === 0) {
      console.log('No reviews found, returning 0');
      return res.json({ averageRating: 0, totalReviews: 0 });
    }
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    console.log('Calculated average:', averageRating);
    
    res.json({ 
      averageRating: Math.round(averageRating * 10) / 10, 
      totalReviews: reviews.length 
    });
  } catch (err) {
    console.error('ERROR in average rating endpoint:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      error: 'Server error', 
      details: err.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { listingId, userId, userEmail, userName, rating, comment } = req.body;
    
    if (!listingId || !userId || !userEmail || !userName || !rating || !comment) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const existingReview = await Review.findOne({ listingId, userId });
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this listing' });
    }
    
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const review = new Review({
      listingId,
      userId,
      userEmail,
      userName,
      rating,
      comment
    });
    
    await review.save();

    try {
      await NotificationService.notifyNewReview(review, listing.createdBy, listing.name);
    } catch (notifErr) {
      console.error('Review notification error:', notifErr);
    }

    res.status(201).json(review);
  } catch (err) {
    console.error('Error creating review:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, rating, comment } = req.body;
    
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (review.userId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own reviews' });
    }
    
    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { rating, comment },
      { new: true }
    );
    
    res.json(updatedReview);
  } catch (err) {
    console.error('Error updating review:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (review.userId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }
    
    await Review.findByIdAndDelete(id);
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;