const { Server } = require('socket.io');
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const { allowedOrigins } = require('../config/constants');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const { displayNameOf, toPayload } = require('../services/conversationService');

const MAX_MESSAGE_LENGTH = 1000;

const initializeWebSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Only logged-in users can connect. The user id comes from the verified token.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = await admin.auth().verifyIdToken(token);
      socket.userId = decoded.uid;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    // Personal room for notification pings
    socket.join(`user:${socket.userId}`);

    socket.on('join_conversation', async (conversationId) => {
      try {
        if (!mongoose.isValidObjectId(conversationId)) return;
        const conversation = await Conversation.findOne({
          _id: conversationId,
          'participants.userId': socket.userId
        }).select('_id');
        if (conversation) {
          socket.join(String(conversationId));
        } else {
          socket.emit('chat_error', { message: 'Conversation not found' });
        }
      } catch (err) {
        console.error('join_conversation error:', err.message);
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(String(conversationId));
    });

    socket.on('send_message', async ({ conversationId, message } = {}) => {
      try {
        const senderId = socket.userId;
        const text = typeof message === 'string' ? message.trim() : '';
        if (!text || text.length > MAX_MESSAGE_LENGTH) {
          socket.emit('chat_error', { message: 'Message must be between 1 and 1000 characters' });
          return;
        }
        if (!mongoose.isValidObjectId(conversationId)) {
          socket.emit('chat_error', { message: 'Conversation not found' });
          return;
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          'participants.userId': senderId
        });
        if (!conversation) {
          socket.emit('chat_error', { message: 'Conversation not found' });
          return;
        }

        const recipient = conversation.participants.find(p => p.userId !== senderId);
        if (!recipient) {
          socket.emit('chat_error', { message: 'Recipient not found' });
          return;
        }

        const fromUser = await User.findOne({ userId: senderId });

        conversation.messages.push({
          senderId,
          senderEmail: (fromUser && fromUser.email) || '',
          senderName: displayNameOf(fromUser),
          content: text
        });
        conversation.lastMessage = text.length > 50 ? text.substring(0, 50) + '...' : text;
        conversation.lastMessageAt = new Date();
        const currentUnread = conversation.unreadCounts.get(recipient.userId) || 0;
        conversation.unreadCounts.set(recipient.userId, currentUnread + 1);

        await conversation.save();
        const conversationObj = await toPayload(conversation);

        try {
          await NotificationService.createNotification({
            userId: recipient.userId,
            type: 'system_announcement',
            title: 'New Message',
            message: `New message in your conversation about "${conversation.listingName}"`,
            relatedId: conversation._id,
            relatedModel: null,
            priority: 'medium'
          });
        } catch (notifErr) {
          console.error('Notification error:', notifErr.message);
        }

        io.to(String(conversation._id)).emit('new_message', { conversation: conversationObj });
        io.to(`user:${recipient.userId}`).emit('message_notification', { conversationId: conversation._id });
      } catch (err) {
        console.error('Error handling send_message:', err.message);
        socket.emit('chat_error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing_start', ({ conversationId } = {}) => {
      if (socket.rooms.has(String(conversationId))) {
        socket.to(String(conversationId)).emit('user_typing', { userId: socket.userId });
      }
    });

    socket.on('typing_stop', ({ conversationId } = {}) => {
      if (socket.rooms.has(String(conversationId))) {
        socket.to(String(conversationId)).emit('user_typing', { userId: socket.userId, stopped: true });
      }
    });

    socket.on('mark_messages_read', async ({ conversationId } = {}) => {
      try {
        if (!mongoose.isValidObjectId(conversationId)) return;
        const userId = socket.userId;
        const conversation = await Conversation.findOne({
          _id: conversationId,
          'participants.userId': userId
        });
        if (!conversation) return;

        conversation.messages.forEach(msg => {
          if (msg.senderId !== userId && !msg.read) msg.read = true;
        });
        conversation.unreadCounts.set(userId, 0);
        await conversation.save();

        io.to(String(conversation._id)).emit('messages_read', {
          conversation: await toPayload(conversation)
        });
      } catch (err) {
        console.error('Error marking messages read:', err.message);
      }
    });
  });

  return io;
};

module.exports = { initializeWebSocket };