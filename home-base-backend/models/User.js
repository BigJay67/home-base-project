const mongoose = require('mongoose');

// Schema for user data
const userSchema = new mongoose.Schema({
  // Unique Firebase UID for the user
  userId: { type: String, required: true, unique: true },
  // User's email address
  email: { type: String, required: true },
  // User's display name 
  displayName: String,
  // URL to user's profile picture 
  profilePicture: String,
  // User's phone number 
  phoneNumber: String,
  // User role (user or admin)
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  // User account status
  status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  // Timestamp of last login
  lastLogin: Date,
  // Count of user logins
  loginCount: { type: Number, default: 0 },
  // Account creation timestamp
  createdAt: { type: Date, default: Date.now },
  // Last update timestamp
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Export User model
module.exports = mongoose.model('User', userSchema);