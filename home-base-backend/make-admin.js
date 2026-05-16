// ============================================================
// make-admin.js  — Run this ONCE to give yourself admin access
//
// HOW TO USE:
//   1. Open home-base-backend/make-admin.js
//   2. Replace YOUR_FIREBASE_UID below with your actual UID
//      (You can find it in Firebase Console → Authentication
//       → Users → copy the User UID column)
//   3. Run:  node make-admin.js
//   4. You should see: ✅ User promoted to admin!
//   5. Delete this file after running it.
// ============================================================

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const YOUR_FIREBASE_UID = 'Xll5CiMngLgb4uC5NY7wllKQkE82'; // ← already set from your error logs

async function makeAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find or create the user
    let user = await User.findOne({ userId: YOUR_FIREBASE_UID });

    if (!user) {
      console.log('User not found in DB, creating...');
      user = new User({
        userId: YOUR_FIREBASE_UID,
        email: 'makindejames5@gmail.com',
        role: 'admin'
      });
      await user.save();
      console.log('✅ Admin user created!');
    } else {
      user.role = 'admin';
      await user.save();
      console.log('✅ User promoted to admin!');
    }

    console.log('User:', user);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

makeAdmin();