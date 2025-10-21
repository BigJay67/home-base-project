const express = require('express');
const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');
const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching profile for userId:', userId);
    let user = await User.findOne({ userId });
    if (!user) {
      console.log('User profile not found, creating new...');
      user = new User({
        userId,
        email: 'unknown@example.com' 
      });
      await user.save();
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
});

router.put('/:userId', async (req, res) => {
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

module.exports = router;