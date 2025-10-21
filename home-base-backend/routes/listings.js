const express = require('express');
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Review = require('../models/Review');
const { generateImageVariants } = require('../config/cloudinary');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { type, location, maxPrice, amenities, status = 'active' } = req.query;
    const query = {};
    
    if (type) query.type = type.toLowerCase();
    if (location) query.location = { $regex: location, $options: 'i' };
    if (maxPrice) query.priceValue = { $lte: parseInt(maxPrice) };
    if (amenities) {
      const amenitiesArray = amenities.split(',').map(item => item.trim());
      query.amenities = { $all: amenitiesArray };
    }
    
    if (status) {
      query.status = status;
    }
    
    console.log('Querying listings with:', query);
    const listings = await Listing.find(query);
    res.json(listings);
  } catch (err) {
    console.error('Error fetching listings:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('POST /api/listings received:', JSON.stringify(req.body, null, 2));
    const { type, name, price, priceValue, location, amenities, distance, payment, images, createdBy } = req.body;
    if (!type || !name || !price || !priceValue || !location || !createdBy) {
      console.log('Missing required fields:', { type, name, price, priceValue, location, createdBy });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['hostel', 'apartment'].includes(type.toLowerCase())) {
      console.log('Invalid type:', type);
      return res.status(400).json({ error: 'Invalid type, must be hostel or apartment' });
    }
    let imageUrls = [];
    if (images && Array.isArray(images) && images.length > 0) {
      if (images.length > 5) {
        return res.status(400).json({ error: 'Maximum 5 images allowed' });
      }
      
      console.log('🖼️ Generating multiple image sizes for', images.length, 'images...');
      for (const image of images) {
        if (!image.startsWith('data:image/')) {
          return res.status(400).json({ error: 'Invalid image format, must be base64 with data:image/ prefix' });
        }
        try {
          const imageVariants = await generateImageVariants(image);
          imageUrls.push(imageVariants);
          console.log('✅ Image variants generated:', {
            thumbnail: imageVariants.thumbnail.substring(0, 50) + '...',
            medium: imageVariants.medium.substring(0, 50) + '...', 
            large: imageVariants.large.substring(0, 50) + '...'
          });
        } catch (uploadErr) {
          console.error('❌ Image upload error:', uploadErr.message);
          return res.status(500).json({ error: 'Failed to upload image', details: uploadErr.message });
        }
      }
    }
    const listing = new Listing({
      type: type.toLowerCase(),
      name,
      price,
      priceValue: parseInt(priceValue) || 0,
      location,
      amenities: amenities || [],
      distance: distance || '',
      payment: payment || '',
      images: imageUrls,
      createdBy, 
    });
    console.log('Attempting to save listing:', JSON.stringify(listing, null, 2));
    await listing.save();
    console.log('Listing saved successfully:', JSON.stringify(listing, null, 2));
    res.status(201).json(listing);
  } catch (err) {
    console.error('Error creating listing:', JSON.stringify(err, null, 2));
    res.status(500).json({ error: 'Failed to create listing', details: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const { type, name, price, priceValue, location, amenities, distance, payment, images } = req.body;
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.createdBy !== userId) {
      return res.status(403).json({ error: 'Unauthorized: You can only edit your own listings' });
    }
    let imageUrls = listing.images || [];
    if (images && Array.isArray(images) && images.length > 0) {
      if (images.length > 5) {
        return res.status(400).json({ error: 'Maximum 5 images allowed' });
      }
      imageUrls = [];
      console.log('🖼️ Generating multiple image sizes for update...');
      for (const image of images) {
        if (!image.startsWith('data:image/')) {
          return res.status(400).json({ error: 'Invalid image format' });
        }
        try {
          const imageVariants = await generateImageVariants(image);
          imageUrls.push(imageVariants);
          console.log('✅ Image variants generated for update');
        } catch (uploadErr) {
          console.error('❌ Image upload error:', uploadErr.message);
          return res.status(500).json({ error: 'Failed to upload image', details: uploadErr.message });
        }
      }
    }
    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      {
        type: type.toLowerCase(),
        name,
        price,
        priceValue: parseInt(priceValue) || 0,
        location,
        amenities: amenities || [],
        distance: distance || '',
        payment: payment || '',
        images: imageUrls,
      },
      { new: true }
    );
    console.log('Listing updated successfully:', updatedListing);
    res.json(updatedListing);
  } catch (err) {
    console.error('Error updating listing:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to update listing', details: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.createdBy !== userId) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own listings' });
    }
    await Listing.findByIdAndDelete(id);
    console.log('Listing deleted successfully:', id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    console.error('Error deleting listing:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to delete listing', details: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching listing ID:', id);
    
    if (!id || id === ':id' || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid listing ID' });
    }
    
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    res.json(listing);
  } catch (err) {
    console.error('Error fetching listing:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { type, location, maxPrice, amenities, minRating, reviewKeyword } = req.query;
    const query = {};
    
    if (type) query.type = type.toLowerCase();
    if (location) query.location = { $regex: location, $options: 'i' };
    if (maxPrice) query.priceValue = { $lte: parseInt(maxPrice) };
    if (amenities) {
      const amenitiesArray = amenities.split(',').map(item => item.trim());
      query.amenities = { $all: amenitiesArray };
    }

    console.log('Search query:', query);
    
    let listings = await Listing.find(query);
    
    if (minRating) {
      const minRatingNum = parseFloat(minRating);
      const listingsWithRatings = await Promise.all(
        listings.map(async (listing) => {
          const reviews = await Review.find({ listingId: listing._id });
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
          
          return {
            listing,
            averageRating: Math.round(averageRating * 10) / 10,
            reviewCount: reviews.length
          };
        })
      );
      
      listings = listingsWithRatings
        .filter(item => item.averageRating >= minRatingNum)
        .map(item => item.listing);
    }

    if (reviewKeyword) {
      const keyword = reviewKeyword.toLowerCase();
      const listingsWithMatchingReviews = await Promise.all(
        listings.map(async (listing) => {
          const matchingReviews = await Review.find({ 
            listingId: listing._id,
            $or: [
              { comment: { $regex: keyword, $options: 'i' } },
              { userName: { $regex: keyword, $options: 'i' } }
            ]
          });
          
          return {
            listing,
            matchingReviewCount: matchingReviews.length,
            matchingReviews
          };
        })
      );
      
      listings = listingsWithMatchingReviews
        .filter(item => item.matchingReviewCount > 0)
        .map(item => item.listing);
    }

    console.log(`Found ${listings.length} listings after filtering`);
    res.json(listings);
  } catch (err) {
    console.error('Error searching listings:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;