const express = require('express');
const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');
const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const isSelf = req.userId === userId;

    if (!isSelf) {
      const requestingUser = await User.findOne({ userId: req.userId });
      if (!requestingUser || requestingUser.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    let user = await User.findOne({ userId });

    if (!user) {
      if (!isSelf) {
        return res.status(404).json({ error: 'User not found' });
      }
      try {
        user = await User.create({
          userId,
          email: req.userEmail || '',
          displayName: req.userName || ''
        });
      } catch (createErr) {
        // Two requests can race on first login. The loser just reads the winner's record.
        if (createErr.code === 11000) {
          user = await User.findOne({ userId });
        } else {
          throw createErr;
        }
      }
    } else if (isSelf) {
      let changed = false;
      if (!user.email && req.userEmail) { user.email = req.userEmail; changed = true; }
      if (!user.displayName && req.userName) { user.displayName = req.userName; changed = true; }
      if (changed) await user.save();
    }

    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err.message);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, profilePicture, email, phoneNumber } = req.body;
    if (req.userId !== userId) {
      const requestingUser = await User.findOne({ userId: req.userId });
      if (!requestingUser || requestingUser.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    let profilePictureUrl = '';
    if (profilePicture) {
      try {
        if (!profilePicture.startsWith('data:image/')) {
          return res.status(400).json({ error: 'Invalid image format' });
        }
        const uploadResult = await cloudinary.uploader.upload(profilePicture, {
          upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
          folder: 'home-base-profiles',
        });
        profilePictureUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        return res.status(500).json({ error: 'Failed to upload profile picture' });
      }
    }
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (profilePictureUrl) updateData.profilePicture = profilePictureUrl;
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true }
    );
    res.json(user);
  } catch (err) {
    console.error('Error updating user profile:', err.message);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

module.exports = router;