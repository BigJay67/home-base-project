const socketIo = require('socket.io');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const {allowedOrigins} = require('../config/constants');

let io; 

const initializeWebSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"]
    }
  });

  const userSockets = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user_join', async (userId) => {
      try {
        console.log('User joining:', userId);
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room user_${userId}`);
        
        socket.broadcast.emit('user_online', { userId });
      } catch (error) {
        console.error('Error in user_join:', error);
      }
    });

    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User joined conversation: ${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User left conversation: ${conversationId}`);
    });

    socket.on('send_message', async (data) => {
      try {
        const { conversationId, message, senderId } = data;
        console.log('Sending message:', { conversationId, senderId, message });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const recipient = conversation.participants.find(
          p => p.userId !== senderId
        );

        if (!recipient) {
          socket.emit('error', { message: 'Recipient not found' });
          return;
        }

        const sender = await User.findOne({ userId: senderId });
        if (!sender) {
          socket.emit('error', { message: 'Sender not found' });
          return;
        }

        const newMessage = {
          senderId,
          senderEmail: sender.email,
          senderName: sender.displayName || sender.email.split('@')[0],
          content: message,
          read: false,
          createdAt: new Date()
        };

        conversation.messages.push(newMessage);
        conversation.lastMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
        conversation.lastMessageAt = new Date();
        
        const currentUnread = conversation.unreadCounts.get(recipient.userId) || 0;
        conversation.unreadCounts.set(recipient.userId, currentUnread + 1);

        await conversation.save();

        const conversationObj = conversation.toObject();
        if (conversationObj.unreadCounts instanceof Map) {
          conversationObj.unreadCounts = Object.fromEntries(conversationObj.unreadCounts);
        }

        io.to(`conversation_${conversationId}`).emit('new_message', {
          conversation: conversationObj,
          message: newMessage
        });

        const recipientSocketId = userSockets.get(recipient.userId);
        if (recipientSocketId) {
          io.to(`user_${recipient.userId}`).emit('message_notification', {
            conversationId,
            message: newMessage.content,
            senderName: newMessage.senderName,
            listingName: conversation.listingName
          });
        }

        console.log('Message sent successfully');

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('mark_messages_read', async (data) => {
      try {
        const { conversationId, userId } = data;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        conversation.messages.forEach(message => {
          if (message.senderId !== userId && !message.read) {
            message.read = true;
          }
        });

        conversation.unreadCounts.set(userId, 0);
        await conversation.save();

        const conversationObj = conversation.toObject();
        if (conversationObj.unreadCounts instanceof Map) {
          conversationObj.unreadCounts = Object.fromEntries(conversationObj.unreadCounts);
        }

        socket.to(`conversation_${conversationId}`).emit('messages_read', {
          conversationId,
          userId
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    socket.on('typing_start', (data) => {
      const { conversationId, userId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        typing: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId, userId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        typing: false
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (socket.userId) {
        userSockets.delete(socket.userId);
        socket.broadcast.emit('user_offline', { userId: socket.userId });
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeWebSocket, getIo };