const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const Paystack = require('paystack-api');
const cloudinary = require('cloudinary').v2;
const Listing = require('./models/Listing');
const Booking = require('./models/Booking');
const User = require('./models/User');
const Review = require('./models/Review');
const Notification = require('./models/Notification');
const NotificationService = require('./services/notificationService');
const Conversation = require('./models/Conversation');
const PDFService = require('./services/pdfService');
const EmailService = require('./services/emailService')
const AnalyticsService = require('./services/analyticsService');
const Analytics = require('./models/Analytics')

dotenv.config();

const generateImageVariants = async (image) => {
  try {
    const uploadPromises = [
      // Thumbnail (for cards - 400x300)
      cloudinary.uploader.upload(image, {
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        folder: 'home-base-listings/thumbnails',
        transformation: [
          { width: 400, height: 300, crop: 'fill', gravity: 'auto', quality: 'auto:good' },
          { format: 'webp' }
        ]
      }),
      // Medium (for detail view - 800x600)
      cloudinary.uploader.upload(image, {
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        folder: 'home-base-listings/medium',
        transformation: [
          { width: 800, height: 600, crop: 'fill', gravity: 'auto', quality: 'auto:best' },
          { format: 'webp' }
        ]
      }),
      // Large (for full view - 1200x800)
      cloudinary.uploader.upload(image, {
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        folder: 'home-base-listings/large',
        transformation: [
          { width: 1200, height: 800, crop: 'fill', gravity: 'auto', quality: 'auto:best' },
          { format: 'webp' }
        ]
      })
    ];

    const results = await Promise.all(uploadPromises);
    return {
      thumbnail: results[0].secure_url,
      medium: results[1].secure_url,
      large: results[2].secure_url,
      original: results[2].secure_url // Use large as original for compatibility
    };
  } catch (error) {
    console.error('Error generating image variants:', error);
    throw error;
  }
};

// Initialize email service
const emailService = new EmailService();

const handleSMSCalls = (req, res) => {
    res.status(501).json({
        error: 'SMS service is no longer available. Please use email or download options.',
        availableOptions: ['Email receipt', 'PDF download', 'Shareable link']
    });
};

const getCallbackUrl = () => {
  // For production
  if (process.env.NODE_ENV === 'production') {
    return 'https://yourapp.com/payment-callback';
  }
  
  // For development - use HTTP
  if (process.env.FRONTEND_URL) {
    return `${process.env.FRONTEND_URL}/payment-callback`;
  }
  
  // Default to localhost with HTTP
  return 'http://localhost:3000/payment-callback';
};

// Initialize express app FIRST
const app = express();
// In index.js - Add these changes
const http = require('http');
const { initializeWebSocket } = require('./server/webSocket');

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket
initializeWebSocket(server);

// Add structured logging
const logger = {
  info: (message, meta = {}) => console.log(JSON.stringify({ level: 'info', message, ...meta })),
  error: (message, error = {}) => console.error(JSON.stringify({ level: 'error', message, error: error.message }))
};

// Add more environment validation
const requiredEnvVars = [
  'MONGO_URI', 'PAYSTACK_SECRET_KEY', 
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

// Create a unified error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      details: err.message 
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      error: 'Invalid ID format' 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

app.use(errorHandler);


app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://192.168.0.192:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

if (!process.env.PAYSTACK_SECRET_KEY) {
  console.error('Error: PAYSTACK_SECRET_KEY is not set in .env');
  process.exit(1);
}
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_UPLOAD_PRESET) {
  console.error('Error: Cloudinary credentials are not set in .env');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const adminAuth = async (req, res, next) => {
  try {
    const userId = req.headers.authorization;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const user = await User.findOne({ userId });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('Admin auth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Home Base API!' });
});


app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
});

// In index.js - update the GET /api/listings endpoint
app.get('/api/listings', async (req, res) => {
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
    
    // Add status filtering
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

app.post('/api/listings', async (req, res) => {
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
      createdBy, // Updated: Store Firebase UID for ownership
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

app.put('/api/listings/:id', async (req, res) => {
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

app.delete('/api/listings/:id', async (req, res) => {
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


app.get('/api/reviews', async (req, res) => {
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

app.get('/api/bookings', async (req, res) => {
  try {
    const { userId, status } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Build query - only show user's bookings
    const query = { userId };
    
    // Add status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const bookings = await Booking.find(query).populate({
      path: 'listingId',
      select: 'name price location',
      options: { lean: true }
    });
    
    // Handle cases where listing was deleted
    const bookingsWithFallback = bookings.map(booking => {
      if (!booking.listingId) {
        return {
          ...booking.toObject(),
          listingId: {
            name: "Deleted Listing",
            price: "N/A",
            location: "N/A"
          }
        };
      }
      return booking;
    });
    
    res.json(bookingsWithFallback);
  } catch (err) {
    console.error('Error fetching bookings:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get single booking details
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers.authorization;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const booking = await Booking.findById(id)
      .populate('listingId', 'name location type price amenities images');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(booking);
  } catch (err) {
    console.error('Error fetching booking details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Paystack payment initialization
app.post('/api/paystack/initialize', async (req, res) => {
  try {
    const { listingId, userId, userEmail, amount } = req.body;
    
    if (!listingId || !userId || !userEmail || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ error: 'Invalid listing ID' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    // FORCE HTTP for development
    const frontendUrl = 'http://192.168.0.192:3000';
    const callbackUrl = `${frontendUrl}/payment-callback`;
    
    console.log('🔒 Using HTTP callback URL:', callbackUrl);
    
    const payment = await paystack.transaction.initialize({
      email: userEmail,
      amount: amount * 100,
      callback_url: callbackUrl,
      metadata: { listingId, userId },
    });

    if (!payment.status) {
      throw new Error('Paystack initialization failed');
    }

    const booking = new Booking({
      listingId,
      userId,
      userEmail,
      amount,
      paymentReference: payment.data.reference,
    });
    
    await booking.save();

    // Send notifications
    try {
      await NotificationService.notifyBookingCreated(booking, listing.name);
      await NotificationService.notifyListingOwnerBooking(booking, listing.createdBy, listing.name);
    } catch (notifErr) {
      console.error('Notification error:', notifErr);
    }

    res.json({ 
      authorization_url: payment.data.authorization_url, 
      reference: payment.data.reference 
    });
  } catch (err) {
    console.error('Error initializing payment:', err);
    res.status(500).json({ error: 'Payment initialization failed', details: err.message });
  }
});

// Paystack payment verification
app.get('/api/paystack/verify/:reference', async (req, res) => {
    try {
        const { reference } = req.params;
        const verification = await paystack.transaction.verify({ reference });
        
        const booking = await Booking.findOne({ paymentReference: reference })
            .populate('listingId', 'name createdBy');
        
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (verification.data.status === 'success') {
            // Store receipt data
            await Booking.updateOne(
                { paymentReference: reference },
                { 
                    status: 'completed',
                    paidAt: new Date(verification.data.paid_at),
                    paymentMethod: verification.data.channel,
                    receiptData: {
                        transactionId: verification.data.id,
                        gatewayResponse: verification.data.gateway_response,
                        channel: verification.data.channel,
                        ipAddress: verification.data.ip_address
                    }
                }
            );

            try {
                await NotificationService.notifyPaymentSuccess(booking, booking.listingId.name);
            } catch (notifErr) {
                console.error('Payment success notification error:', notifErr);
            }

            res.json({ status: 'success', message: 'Payment verified' });
        } else {
            await Booking.updateOne(
                { paymentReference: reference },
                { status: 'failed' }
            );

            try {
                await NotificationService.notifyPaymentFailed(booking, booking.listingId.name);
            } catch (notifErr) {
                console.error('Payment failed notification error:', notifErr);
            }

            res.json({ status: 'failed', message: 'Payment failed' });
        }
    } catch (err) {
        console.error('Error verifying payment:', err);
        res.status(500).json({ error: 'Payment verification failed', details: err.message });
    }
});

// Added: Endpoint to get or create user profile
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching profile for userId:', userId);
    let user = await User.findOne({ userId });
    if (!user) {
      console.log('User profile not found, creating new...');
      user = new User({
        userId,
        email: 'unknown@example.com' // Default, frontend will update
      });
      await user.save();
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
});

// Added: Endpoint to update user profile
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, profilePicture, email } = req.body;
    console.log('Updating profile for userId:', userId, { displayName, profilePicture: profilePicture ? 'image provided' : 'no image' });
    let profilePictureUrl = '';
    if (profilePicture) {
      console.log('Attempting Cloudinary upload for profile picture...');
      console.log('Profile picture data (first 50 chars):', profilePicture.substring(0, 50));
      try {
        if (!profilePicture.startsWith('data:image/')) {
          console.log('Invalid profile picture format:', profilePicture.substring(0, 50));
          return res.status(400).json({ error: 'Invalid image format, must be base64 with data:image/ prefix' });
        }
        const uploadResult = await cloudinary.uploader.upload(profilePicture, {
          upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
          folder: 'home-base-profiles',
        });
        profilePictureUrl = uploadResult.secure_url;
        console.log('Cloudinary upload successful:', profilePictureUrl);
      } catch (uploadErr) {
        console.error('Cloudinary upload error:', JSON.stringify(uploadErr, null, 2));
        return res.status(500).json({ error: 'Failed to upload profile picture', details: uploadErr.message });
      }
    }
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (email) updateData.email = email
    if (profilePictureUrl) updateData.profilePicture = profilePictureUrl;
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true }
    );
    console.log('User profile updated:', JSON.stringify(user, null, 2));
    res.json(user);
  } catch (err) {
    console.error('Error updating user profile:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to update user profile', details: err.message });
  }
});

// Get reviews for a listing
app.get('/api/reviews/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.json([]);
    }

    const reviews = await Review.find({ listingId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get average rating for a listing
app.get('/api/reviews/:listingId/average', async (req, res) => {
  try {
    const { listingId } = req.params;
    console.log('Calculating average rating for listing:', listingId);
    
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
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { listingId, userId, userEmail, userName, rating, comment } = req.body;
    
    if (!listingId || !userId || !userEmail || !userName || !rating || !comment) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if user already reviewed this listing
    const existingReview = await Review.findOne({ listingId, userId });
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this listing' });
    }
    
    // Get listing to find the owner
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

    // 🔔 NOTIFY LISTING OWNER ABOUT NEW REVIEW
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

// Update a review (only by the author)
app.put('/api/reviews/:id', async (req, res) => {
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

// Delete a review (only by the author)
app.delete('/api/reviews/:id', async (req, res) => {
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

app.get('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
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

app.get('/api/admin/listings', adminAuth, async (req, res) => {
  try {
    const listings = await Listing.find().sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    console.error('Error fetching admin listings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/bookings', adminAuth, async (req, res) => {
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

app.delete('/api/admin/listings/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Also delete associated reviews and bookings
    await Review.deleteMany({ listingId: id });
    await Booking.deleteMany({ listingId: id });
    
    await Listing.findByIdAndDelete(id);
    
    res.json({ message: 'Listing and associated data deleted successfully' });
  } catch (err) {
    console.error('Error deleting listing:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Notification routes
app.get('/api/notifications', async (req, res) => {
  try {
    const userId = req.headers.authorization;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ 
      userId, 
      isRead: false 
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers.authorization;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notifications/read-all', async (req, res) => {
  try {
    const userId = req.headers.authorization;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers.authorization;

    const notification = await Notification.findOneAndDelete({ 
      _id: id, 
      userId 
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/listings/search', async (req, res) => {
  try {
    const { type, location, maxPrice, amenities, minRating, reviewKeyword } = req.query;
    const query = {};
    
    // Basic filters
    if (type) query.type = type.toLowerCase();
    if (location) query.location = { $regex: location, $options: 'i' };
    if (maxPrice) query.priceValue = { $lte: parseInt(maxPrice) };
    if (amenities) {
      const amenitiesArray = amenities.split(',').map(item => item.trim());
      query.amenities = { $all: amenitiesArray };
    }

    console.log('Search query:', query);
    
    // Get all listings first
    let listings = await Listing.find(query);
    
    // Apply rating filter if specified
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
      
      // Filter by minimum rating
      listings = listingsWithRatings
        .filter(item => item.averageRating >= minRatingNum)
        .map(item => item.listing);
    }

    // Apply review keyword filter if specified
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
      
      // Filter listings that have matching reviews
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

// Get conversations for current user
app.get('/api/conversations', async (req, res) => {
  try {
    const userId = req.headers.authorization;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const conversations = await Conversation.find({
      'participants.userId': userId
    })
    .populate('listingId', 'name images')
    .sort({ updatedAt: -1 });

    // Convert unreadCounts to plain objects
    const conversationsWithPlainUnread = conversations.map(conv => {
      const convObj = conv.toObject();
      if (convObj.unreadCounts instanceof Map) {
        convObj.unreadCounts = Object.fromEntries(convObj.unreadCounts);
      }
      return convObj;
    });

    res.json(conversationsWithPlainUnread);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread message count
app.get('/api/conversations/unread-count', async (req, res) => {
  try {
    const userId = req.headers.authorization;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const conversations = await Conversation.find({
      'participants.userId': userId
    });

    let totalUnread = 0;
    conversations.forEach(conv => {
      const unreadCounts = conv.unreadCounts instanceof Map 
        ? Object.fromEntries(conv.unreadCounts)
        : conv.unreadCounts;
      totalUnread += unreadCounts[userId] || 0;
    });

    res.json({ unreadCount: totalUnread });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start a new conversation or get existing one
app.post('/api/conversations', async (req, res) => {
  try {
    const { toUserId, message, listingId } = req.body;
    const fromUserId = req.headers.authorization;

    if (!fromUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!toUserId || !message || !listingId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user and listing info
    const [fromUser, toUser, listing] = await Promise.all([
      User.findOne({ userId: fromUserId }),
      User.findOne({ userId: toUserId }),
      Listing.findById(listingId)
    ]);

    if (!fromUser || !toUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      listingId,
      'participants.userId': { $all: [fromUserId, toUserId] }
    });

    if (conversation) {
      // Add message to existing conversation
      conversation.messages.push({
        senderId: fromUserId,
        senderEmail: fromUser.email,
        senderName: fromUser.displayName || fromUser.email.split('@')[0],
        content: message
      });

      conversation.lastMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
      conversation.lastMessageAt = new Date();
      
      // Increment unread count for recipient
      const currentUnread = conversation.unreadCounts.get(toUserId) || 0;
      conversation.unreadCounts.set(toUserId, currentUnread + 1);
    } else {
      // Create new conversation
      conversation = new Conversation({
        participants: [
          {
            userId: fromUserId,
            email: fromUser.email,
            displayName: fromUser.displayName || ''
          },
          {
            userId: toUserId,
            email: toUser.email,
            displayName: toUser.displayName || ''
          }
        ],
        listingId,
        listingName: listing.name,
        messages: [{
          senderId: fromUserId,
          senderEmail: fromUser.email,
          senderName: fromUser.displayName || fromUser.email.split('@')[0],
          content: message
        }],
        lastMessage: message.length > 50 ? message.substring(0, 50) + '...' : message,
        unreadCounts: new Map([[toUserId, 1]])
      });
    }

    await conversation.save();

    // Convert to plain object for response
    const conversationObj = conversation.toObject();
    if (conversationObj.unreadCounts instanceof Map) {
      conversationObj.unreadCounts = Object.fromEntries(conversationObj.unreadCounts);
    }

    // Send notification to recipient
    try {
      await NotificationService.createNotification({
        userId: toUserId,
        type: 'new_message',
        title: 'New Message',
        message: `You have a new message about "${listing.name}"`,
        relatedId: conversation._id,
        relatedModel: 'Conversation',
        priority: 'medium'
      });
    } catch (notifErr) {
      console.error('Message notification error:', notifErr);
    }

    res.status(201).json(conversationObj);
  } catch (err) {
    console.error('Error creating conversation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages for a specific conversation
app.get('/api/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.headers.authorization;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.userId': userId
    }).populate('listingId', 'name images location');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Mark messages as read for this user
    conversation.messages.forEach(message => {
      if (message.senderId !== userId && !message.read) {
        message.read = true;
      }
    });

    // Reset unread count for this user
    conversation.unreadCounts.set(userId, 0);
    await conversation.save();

    // Convert to plain object
    const conversationObj = conversation.toObject();
    if (conversationObj.unreadCounts instanceof Map) {
      conversationObj.unreadCounts = Object.fromEntries(conversationObj.unreadCounts);
    }

    res.json(conversationObj);
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a new message in existing conversation
app.post('/api/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const fromUserId = req.headers.authorization;

    if (!fromUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.userId': fromUserId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const fromUser = await User.findOne({ userId: fromUserId });
    if (!fromUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find recipient (the other participant)
    const recipient = conversation.participants.find(
      p => p.userId !== fromUserId
    );

    // Add new message
    conversation.messages.push({
      senderId: fromUserId,
      senderEmail: fromUser.email,
      senderName: fromUser.displayName || fromUser.email.split('@')[0],
      content: message
    });

    conversation.lastMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
    conversation.lastMessageAt = new Date();
    
    // Increment unread count for recipient
    const currentUnread = conversation.unreadCounts.get(recipient.userId) || 0;
    conversation.unreadCounts.set(recipient.userId, currentUnread + 1);

    await conversation.save();

    // Convert to plain object
    const conversationObj = conversation.toObject();
    if (conversationObj.unreadCounts instanceof Map) {
      conversationObj.unreadCounts = Object.fromEntries(conversationObj.unreadCounts);
    }

    // Send notification to recipient
    try {
      await NotificationService.createNotification({
        userId: recipient.userId,
        type: 'new_message',
        title: 'New Message',
        message: `New message in your conversation about "${conversation.listingName}"`,
        relatedId: conversation._id,
        relatedModel: 'Conversation',
        priority: 'medium'
      });
    } catch (notifErr) {
      console.error('Message notification error:', notifErr);
    }

    res.json(conversationObj);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/payments/history', async (req, res) => {
    try {
        const userId = req.headers.authorization;
        const { status } = req.query;
        
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        let query = { userId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const payments = await Booking.find(query)
            .populate('listingId', 'name location images')
            .sort({ createdAt: -1 });

        res.json(payments);
    } catch (err) {
        console.error('Error fetching payment history:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/payments/:paymentId/receipt', async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.headers.authorization;
        const { format = 'pdf', template = 'auto' } = req.query;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const payment = await Booking.findById(paymentId)
            .populate('listingId', 'name location type');

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (payment.status !== 'completed') {
            return res.status(400).json({ error: 'Receipt only available for completed payments' });
        }

        const receiptData = {
            receiptId: `HB-${payment.paymentReference}`,
            issueDate: new Date().toISOString(),
            payment: payment.toObject(),
            company: {
                name: 'Home Base',
                address: '123 Accommodation Street, Lagos, Nigeria',
                phone: '+234 800 000 0000',
                email: 'support@homebase.com'
            }
        };

        // Track download
        await AnalyticsService.trackReceiptDownload(
            paymentId, 
            userId, 
            req.get('User-Agent')
        );

        if (format === 'json') {
            return res.json(receiptData);
        }

        // Determine template
        let receiptTemplate = template;
        if (template === 'auto') {
            receiptTemplate = PDFService.getTemplateForPayment(payment);
        }

        // Generate PDF receipt
        const pdfBuffer = await PDFService.generateReceipt(receiptData, receiptTemplate);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.paymentReference}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);

    } catch (err) {
        console.error('Error generating receipt:', err);
        res.status(500).json({ error: 'Failed to generate receipt' });
    }
});

app.post('/api/payments/:paymentId/email-receipt', async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.headers.authorization;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const payment = await Booking.findById(paymentId)
            .populate('listingId', 'name location');

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (payment.status !== 'completed') {
            return res.status(400).json({ error: 'Receipt only available for completed payments' });
        }

        // Check if email service is configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return res.status(500).json({ error: 'Email service not configured' });
        }

        const receiptData = {
            receiptId: `HB-${payment.paymentReference}`,
            issueDate: new Date().toISOString(),
            payment: payment.toObject(),
            company: {
                name: 'Home Base',
                address: '123 Accommodation Street, Lagos, Nigeria',
                phone: '+234 800 000 0000',
                email: 'support@homebase.com'
            }
        };

        // Generate PDF for email
        const pdfBuffer = await PDFService.generateReceiptForEmail(receiptData);

        // Send email
        await emailService.sendReceiptEmail(payment.userEmail, receiptData, pdfBuffer);

        res.json({ message: 'Receipt sent to your email successfully' });

    } catch (err) {
        console.error('Error emailing receipt:', err);
        res.status(500).json({ error: 'Failed to send receipt email' });
    }
});

// Share receipt via link (generates a temporary shareable link)
app.post('/api/payments/:paymentId/share', async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.headers.authorization;
        const { expiresIn = '7d' } = req.body; // Default 7 days

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const payment = await Booking.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // In a real implementation, you might want to:
        // 1. Generate a secure token
        // 2. Store it in database with expiration
        // 3. Create a shareable link
        
        // For now, we'll create a simple token (in production, use JWT or similar)
        const shareToken = Buffer.from(`${paymentId}:${Date.now() + 7*24*60*60*1000}`).toString('base64');
        const shareableLink = `${process.env.FRONTEND_URL}/shared-receipt/${shareToken}`;

        res.json({ 
            shareableLink,
            expiresAt: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
            message: 'Shareable link created successfully'
        });

    } catch (err) {
        console.error('Error creating share link:', err);
        res.status(500).json({ error: 'Failed to create share link' });
    }
});

// Public endpoint to view shared receipt
app.get('/api/shared-receipt/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // Decode token
        const decoded = Buffer.from(token, 'base64').toString('ascii');
        const [paymentId, expiry] = decoded.split(':');
        
        // Check if link has expired
        if (Date.now() > parseInt(expiry)) {
            return res.status(410).json({ error: 'This share link has expired' });
        }

        const payment = await Booking.findById(paymentId)
            .populate('listingId', 'name location');

        if (!payment) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Return minimal public receipt data
        const publicReceiptData = {
            receiptId: `HB-${payment.paymentReference}`,
            amount: payment.amount,
            currency: payment.currency,
            paidAt: payment.paidAt,
            listingName: payment.listingId?.name,
            status: payment.status
        };

        res.json(publicReceiptData);

    } catch (err) {
        console.error('Error accessing shared receipt:', err);
        res.status(500).json({ error: 'Invalid share link' });
    }
});

app.get('/api/test-email', async (req, res) => {
    try {
        console.log('Testing email configuration...');
        
        // Check if required environment variables are set
        const requiredVars = ['SMTP_USER', 'SMTP_PASS'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            return res.status(500).json({ 
                success: false, 
                message: 'Missing email configuration',
                missing: missingVars,
                currentConfig: {
                    SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Missing',
                    SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Missing',
                    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com (default)',
                    SMTP_PORT: process.env.SMTP_PORT || '587 (default)'
                }
            });
        }

        // Test the email transporter
        const isConfigured = await emailService.testEmailConfig();
        
        if (isConfigured) {
            res.json({ 
                success: true, 
                message: '✅ Email service is properly configured and ready!',
                config: {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    user: process.env.SMTP_USER
                }
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: '❌ Email service configuration test failed' 
            });
        }
    } catch (error) {
        console.error('Email test error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Email test failed',
            error: error.message,
            tip: 'Check your SMTP credentials and make sure 2-factor authentication is enabled with an app password for Gmail'
        });
    }
});

// Optional: Send a test email endpoint
app.post('/api/test-email/send', async (req, res) => {
    try {
        const { toEmail = process.env.SMTP_USER } = req.body;
        
        const testPaymentData = {
            receiptId: 'HB-TEST-123',
            payment: {
                paymentReference: 'TEST-REF-123',
                amount: 50000,
                currency: 'NGN',
                userEmail: toEmail,
                paidAt: new Date(),
                status: 'completed',
                listingId: {
                    name: 'Test Luxury Apartment',
                    location: 'Test Location, Lagos'
                }
            },
            company: {
                name: 'Home Base',
                address: '123 Test Street, Lagos, Nigeria',
                phone: '+234 800 000 0000',
                email: 'support@homebase.com'
            }
        };

        // Generate a simple PDF for testing
        const pdfBuffer = await PDFService.generateReceiptForEmail(testPaymentData);
        
        // Send test email
        await emailService.sendReceiptEmail(toEmail, testPaymentData, pdfBuffer);
        
        res.json({ 
            success: true, 
            message: `Test email sent successfully to ${toEmail}` 
        });
    } catch (error) {
        console.error('Test email send error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send test email',
            error: error.message 
        });
    }
});


// Analytics endpoints
app.get('/api/payments/:paymentId/analytics', async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.headers.authorization;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const payment = await Booking.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const stats = await AnalyticsService.getReceiptStats(paymentId);
        
        res.json(stats);
    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

app.get('/api/analytics/receipts/popular', adminAuth, async (req, res) => {
    try {
        const { limit = 10, days = 30 } = req.query;
        
        const popularReceipts = await AnalyticsService.getPopularReceipts(
            parseInt(limit), 
            parseInt(days)
        );

        // Populate with payment details
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

// Receipt expiry management
app.get('/api/payments/:paymentId/expiry', async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.headers.authorization;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const payment = await Booking.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Calculate expiry (90 days from payment date)
        const paymentDate = new Date(payment.paidAt || payment.createdAt);
        const expiryDate = new Date(paymentDate);
        expiryDate.setDate(expiryDate.getDate() + 90);

        const now = new Date();
        const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

        res.json({
            paymentId,
            expiryDate,
            daysRemaining,
            isExpired: daysRemaining <= 0,
            canExtend: daysRemaining > 0 && daysRemaining <= 30
        });
    } catch (err) {
        console.error('Error checking receipt expiry:', err);
        res.status(500).json({ error: 'Failed to check receipt expiry' });
    }
});

// Extend receipt expiry
app.post('/api/payments/:paymentId/extend-expiry', async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.headers.authorization;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const payment = await Booking.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check if extension is allowed (within 30 days of expiry)
        const paymentDate = new Date(payment.paidAt || payment.createdAt);
        const expiryDate = new Date(paymentDate);
        expiryDate.setDate(expiryDate.getDate() + 90);

        const now = new Date();
        const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

        if (daysRemaining > 30) {
            return res.status(400).json({ 
                error: 'Receipt extension is only available within 30 days of expiry' 
            });
        }

        if (daysRemaining <= 0) {
            return res.status(400).json({ 
                error: 'Receipt has already expired and cannot be extended' 
            });
        }

        // In a real implementation, you might:
        // 1. Create a new receipt with extended expiry
        // 2. Update the existing receipt
        // 3. Charge a fee for extension
        
        const newExpiryDate = new Date(expiryDate);
        newExpiryDate.setDate(newExpiryDate.getDate() + 90); // Extend by 90 days

        res.json({
            message: 'Receipt expiry extended successfully',
            oldExpiryDate: expiryDate,
            newExpiryDate,
            extendedByDays: 90
        });

    } catch (err) {
        console.error('Error extending receipt expiry:', err);
        res.status(500).json({ error: 'Failed to extend receipt expiry' });
    }
});

// Admin: Toggle listing status
app.put('/api/admin/listings/:id/status', adminAuth, async (req, res) => {
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

    // Send notification to listing owner about status change
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

// Admin: Bulk update listing status
app.put('/api/admin/listings/bulk-status', adminAuth, async (req, res) => {
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

// Get user details for admin
app.get('/api/admin/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId })
      .select('-__v'); // Exclude version key

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's listings count
    const listingsCount = await Listing.countDocuments({ createdBy: userId });
    
    // Get user's bookings count
    const bookingsCount = await Booking.countDocuments({ userId });
    
    // Get user's reviews count
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

// Update user details (admin only)
app.put('/api/admin/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, email, phoneNumber, status, role } = req.body;
    const currentAdminId = req.headers.authorization;

    // Check if current admin exists and is actually an admin
    const currentAdmin = await User.findOne({ userId: currentAdminId });
    if (!currentAdmin || currentAdmin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent users from making themselves non-admin
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

    // Log the admin action
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

// Delete user (admin only)
app.delete('/api/admin/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentAdminId = req.headers.authorization;

    // Prevent self-deletion
    if (userId === currentAdminId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user's data (optional - you might want to keep data for analytics)
    // await Listing.deleteMany({ createdBy: userId });
    // await Review.deleteMany({ userId });
    // await Booking.deleteMany({ userId });

    // Or anonymize the data instead
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

    // Delete the user account
    await User.findOneAndDelete({ userId });

    // Log the admin action
    console.log(`Admin ${currentAdminId} deleted user ${userId}`);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Make user admin (single admin can make others admin)
app.post('/api/admin/users/:userId/make-admin', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentAdminId = req.headers.authorization;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already admin
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'User is already an admin' });
    }

    // Update user to admin
    user.role = 'admin';
    await user.save();

    // Log the admin action
    console.log(`Admin ${currentAdminId} promoted user ${userId} to admin`);

    // Send notification to the new admin
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

// In index.js - add admin booking detail endpoint
app.get('/api/admin/bookings/:id', adminAuth, async (req, res) => {
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

// Admin booking status update
app.put('/api/admin/bookings/:id/status', adminAuth, async (req, res) => {
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

    // Send notification to user
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

// Admin delete booking
app.delete('/api/admin/bookings/:id', adminAuth, async (req, res) => {
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

// Export booking details
app.get('/api/admin/bookings/:id/export', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('listingId', 'name location type');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // For now, return JSON. You can implement PDF generation later
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=booking-${id}.json`);
    res.json(booking);
    
  } catch (err) {
    console.error('Error exporting booking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV 
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔌 WebSocket server initialized`);
});