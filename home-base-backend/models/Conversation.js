const mongoose = require('mongoose');

// Schema for individual messages within a conversation
const messageSchema = new mongoose.Schema({
  // ID of the user sending the message
  senderId: {
    type: String,
    required: true
  },
  // Email of the sender for identification
  senderEmail: {
    type: String,
    required: true
  },
  // Display name of the sender
  senderName: {
    type: String,
    required: true
  },
  // Message content with a character limit
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  // Tracks if the message has been read
  read: {
    type: Boolean,
    default: false
  },
  // Message creation timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Schema for conversations between users
const conversationSchema = new mongoose.Schema({
  // Array of participants in the conversation
  participants: [{
    userId: {
      type: String,
      required: true // Unique user ID for each participant
    },
    email: {
      type: String,
      required: true // Email for participant identification
    },
    displayName: {
      type: String,
      default: '' // Optional display name for participant
    }
  }],
  // Reference to associated listing
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true // Links conversation to a specific listing
  },
  // Name of the associated listing
  listingName: {
    type: String,
    required: true
  },
  // Stores the latest message preview
  lastMessage: {
    type: String,
    default: ''
  },
  // Timestamp of the latest message
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  // Tracks unread message counts per user
  unreadCounts: {
    type: Map,
    of: Number,
    default: {} // Maps user IDs to their unread message count
  },
  // Conversation creation timestamp
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Tracks last update to the conversation
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Embed messages as a subdocument array
conversationSchema.add({
  messages: [messageSchema] // Stores all messages in the conversation
});

// Update updatedAt timestamp before saving
conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Convert unreadCounts Map to Object for JSON output
conversationSchema.methods.toJSON = function() {
  const conversation = this.toObject();
  if (conversation.unreadCounts instanceof Map) {
    conversation.unreadCounts = Object.fromEntries(conversation.unreadCounts);
  } else if (conversation.unreadCounts && typeof conversation.unreadCounts === 'object') {
    // Already an object, no conversion needed
  } else {
    conversation.unreadCounts = {};
  }
  return conversation;
};

// Index for participant-based queries
conversationSchema.index({ participants: 1 });
// Index for listing-based queries
conversationSchema.index({ listingId: 1 });
// Index for sorting by recent updates
conversationSchema.index({ updatedAt: -1 });

// Export Conversation model
module.exports = mongoose.model('Conversation', conversationSchema);