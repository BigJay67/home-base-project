const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  senderId: { type: String, required: true },
  senderEmail: { type: String, required: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true, maxlength: 1000 },
  messageType: {
    type: String,
    enum: ['text', 'image', 'system'],
    default: 'text'
  },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date }
}, {
  timestamps: true
});

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);