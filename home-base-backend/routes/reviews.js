const { verifyToken } = require('../middleware/auth');
const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Listing = require('../models/Listing');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const router = express.Router();

const validateReviewInput = (rating, comment) => {
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return { error: 'Rating must be a whole number between 1 and 5' };
  }
  const text = typeof comment === 'string' ? comment.trim() : '';
  if (!text) return { error: 'Please write a comment' };
  if (text.length > 500) return { error: 'Comment must be 500 characters or fewer' };
  return { ratingNum, text };
};

router.get('/', async (req, res) => {
  try {
    const { userId, listingId } = req.query;
    const query = {};

    if (typeof userId === 'string' && userId) query.userId = userId;
    if (typeof listingId === 'string' && listingId) {
      if (!mongoose.isValidObjectId(listingId)) return res.json([]);
      query.listingId = listingId;
    }

    const reviews = await Review.find(query)
      .select('-userEmail')
      .populate('listingId', 'name location')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return res.json({ reviews: [], averageRating: 0, totalReviews: 0 });
    }

    const reviews = await Review.find({ listingId })
      .select('-userEmail')
      .sort({ createdAt: -1 });
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    res.json({
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length
    });
  } catch (err) {
    console.error('Error fetching reviews:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:listingId/average', async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return res.json({ averageRating: 0, totalReviews: 0 });
    }

    const reviews = await Review.find({ listingId }).select('rating');

    if (reviews.length === 0) {
      return res.json({ averageRating: 0, totalReviews: 0 });
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    res.json({
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length
    });
  } catch (err) {
    console.error('Error in average rating endpoint:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { listingId, rating, comment } = req.body;
    const userId = req.userId;

    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return res.status(400).json({ error: 'A valid listing is required' });
    }

    const checked = validateReviewInput(rating, comment);
    if (checked.error) {
      return res.status(400).json({ error: checked.error });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.createdBy === userId) {
      return res.status(400).json({ error: 'You cannot review your own listing' });
    }

    const existingReview = await Review.findOne({ listingId, userId });
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this listing' });
    }

    // Identity comes from the verified token and the database, never from the request body
    const profile = await User.findOne({ userId });
    const userEmail = req.userEmail || (profile && profile.email) || '';
    const userName =
      (profile && profile.displayName) ||
      req.userName ||
      (userEmail ? userEmail.split('@')[0] : 'Guest');

    const review = new Review({
      listingId,
      userId,
      userEmail,
      userName,
      rating: checked.ratingNum,
      comment: checked.text
    });

    await review.save();

    try {
      await NotificationService.notifyNewReview(review, listing.createdBy, listing.name);
    } catch (notifErr) {
      console.error('Review notification error:', notifErr);
    }

    const safeReview = review.toObject();
    delete safeReview.userEmail;
    res.status(201).json(safeReview);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'You have already reviewed this listing' });
    }
    console.error('Error creating review:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    const checked = validateReviewInput(req.body.rating, req.body.comment);
    if (checked.error) {
      return res.status(400).json({ error: checked.error });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (review.userId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own reviews' });
    }

    review.rating = checked.ratingNum;
    review.comment = checked.text;
    await review.save();

    const safeReview = review.toObject();
    delete safeReview.userEmail;
    res.json(safeReview);
  } catch (err) {
    console.error('Error updating review:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

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
    console.error('Error deleting review:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;