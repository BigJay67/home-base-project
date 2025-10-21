const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },
  senderEmail: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  participants: [{
    userId: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      default: ''
    }
  }],
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  listingName: {
    type: String,
    required: true
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

conversationSchema.add({
  messages: [messageSchema]
});

conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

conversationSchema.methods.toJSON = function() {
  const conversation = this.toObject();
  if (conversation.unreadCounts instanceof Map) {
    conversation.unreadCounts = Object.fromEntries(conversation.unreadCounts);
  } else if (conversation.unreadCounts && typeof conversation.unreadCounts === 'object') {
  } else {
    conversation.unreadCounts = {};
  }
  return conversation;
};

conversationSchema.index({ participants: 1 });
conversationSchema.index({ listingId: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);