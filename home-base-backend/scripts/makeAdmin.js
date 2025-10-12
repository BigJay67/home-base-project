// home-base-backend/scripts/makeAdmin.js
const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

async function makeAdmin(userId) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    console.log(`Looking for user with ID: ${userId}`);
    
    // Find the user and update their role to admin
    const user = await User.findOneAndUpdate(
      { userId: userId },
      { role: 'admin' },
      { new: true, upsert: false } // Don't create new user, only update existing
    );
    
    if (user) {
      console.log('✅ SUCCESS: User updated to admin role:');
      console.log(`   User ID: ${user.userId}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
    } else {
      console.log('❌ ERROR: User not found in database');
      console.log('   Make sure the user has logged in at least once to create a profile');
    }
    
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    await mongoose.connection.close();
  }
}

// Get user ID from command line argument
const userId = process.argv[2];
if (!userId) {
  console.log('❌ Usage: node scripts/makeAdmin.js <firebase-user-id>');
  console.log('   Example: node scripts/makeAdmin.js "abc123def456"');
  process.exit(1);
}

makeAdmin(userId);