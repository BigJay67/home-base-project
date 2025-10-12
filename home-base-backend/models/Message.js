const mongoose = require('mongoose');

// Schema for individual messages
const messageSchema = new mongoose.Schema({
  // Reference to the associated conversation
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  // ID of the user sending the message
  senderId: { type: String, required: true },
  // Sender's email for identification
  senderEmail: { type: String, required: true },
  // Sender's display name
  senderName: { type: String, required: true },
  // Message content with a character limit
  content: { type: String, required: true, maxlength: 1000 },
  // Type of message (text, image, or system)
  messageType: {
    type: String,
    enum: ['text', 'image', 'system'],
    default: 'text'
  },
  // Tracks if the message has been read
  isRead: { type: Boolean, default: false },
  // Timestamp when message was read
  readAt: { type: Date }
}, {
  timestamps: true // Auto-generates createdAt and updatedAt
});

// Index for messages by conversation and creation time
messageSchema.index({ conversationId: 1, createdAt: 1 });
// Index for sender-based queries
messageSchema.index({ senderId: 1 });
// Index for read/unread message queries
messageSchema.index({ isRead: 1 });

// Export Message model
module.exports = mongoose.model('Message', messageSchema);