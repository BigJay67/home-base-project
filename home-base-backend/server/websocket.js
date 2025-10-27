const { Server } = require('socket.io');
const { allowedOrigins } = require('../config/constants');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Listing = require('../models/Listing');
const NotificationService = require('../services/notificationService');

const initializeWebSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('WebSocket client connected:', socket.id);

    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`User joined conversation: ${conversationId}`);
    });

    socket.on('send_message', async ({ conversationId, message, senderId }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const toUserId = conversation.participants.find(p => p.userId !== senderId)?.userId;
        const listingId = conversation.listingId;

        if (!toUserId || !listingId) {
          socket.emit('error', { message: 'Missing recipient or listing information' });
          return;
        }

        const [fromUser, toUser, listing] = await Promise.all([
          User.findOne({ userId: senderId }),
          User.findOne({ userId: toUserId }),
          Listing.findById(listingId)
        ]);

        if (!fromUser || !toUser || !listing) {
          socket.emit('error', { message: 'User or listing not found' });
          return;
        }

        conversation.messages.push({
          senderId,
          senderEmail: fromUser.email,
          senderName: fromUser.displayName || fromUser.email.split('@')[0],
          content: message
        });

        conversation.lastMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
        conversation.lastMessageAt = new Date();
        const currentUnread = conversation.unreadCounts.get(toUserId) || 0;
        conversation.unreadCounts.set(toUserId, currentUnread + 1);

        await conversation.save();

        const conversationObj = conversation.toObject();
        if (conversationObj.unreadCounts instanceof Map) {
          conversationObj.unreadCounts = Object.fromEntries(conversationObj.unreadCounts);
        }

        try {
          await NotificationService.createNotification({
            userId: toUserId,
            type: 'new_message',
            title: 'New Message',
            message: `New message in your conversation about "${conversation.listingName}"`,
            relatedId: conversation._id,
            relatedModel: 'Conversation',
            priority: 'medium'
          });
        } catch (notifErr) {
          console.error('Notification error:', notifErr);
        }

        io.to(conversationId).emit('new_message', { conversation: conversationObj });
      } catch (err) {
        console.error('Error handling send_message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing_start', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('user_typing', { userId });
    });

    socket.on('typing_stop', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('user_typing', { userId, stopped: true });
    });

    socket.on('mark_messages_read', async ({ conversationId, userId }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          conversation.messages.forEach(msg => {
            if (msg.senderId !== userId && !msg.read) {
              msg.read = true;
            }
          });
          conversation.unreadCounts.set(userId, 0);
          await conversation.save();

          const conversationObj = conversation.toObject();
          if (conversationObj.unreadCounts instanceof Map) {
            conversationObj.unreadCounts = Object.fromEntries(conversationObj.unreadCounts);
          }

          io.to(conversationId).emit('messages_read', { conversation: conversationObj });
        }
      } catch (err) {
        console.error('Error marking messages read:', err);
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
      console.log(`User left conversation: ${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket client disconnected:', socket.id);
    });
  });

  return io;
};

module.exports = { initializeWebSocket };