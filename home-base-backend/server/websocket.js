// server/websocket.js
const socketIo = require('socket.io');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

let io;

const initializeWebSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: ["http://localhost:3000", "http://192.168.0.192:3000"],
      methods: ["GET", "POST"]
    }
  });

  // Store user socket connections
  const userSockets = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins their personal room
    socket.on('user_join', async (userId) => {
      try {
        console.log('User joining:', userId);
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        
        // Join user's personal room
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room user_${userId}`);
        
        // Send online status to relevant users
        socket.broadcast.emit('user_online', { userId });
      } catch (error) {
        console.error('Error in user_join:', error);
      }
    });

    // Join a conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User joined conversation: ${conversationId}`);
    });

    // Leave a conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User left conversation: ${conversationId}`);
    });

    // Send a message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, message, senderId } = data;
        console.log('Sending message:', { conversationId, senderId, message });

        // Get conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // Find recipient
        const recipient = conversation.participants.find(
          p => p.userId !== senderId
        );

        if (!recipient) {
          socket.emit('error', { message: 'Recipient not found' });
          return;
        }

        // Get sender info
        const sender = await User.findOne({ userId: senderId });
        if (!sender) {
          socket.emit('error', { message: 'Sender not found' });
          return;
        }

        // Create new message
        const newMessage = {
          senderId,
          senderEmail: sender.email,
          senderName: sender.displayName || sender.email.split('@')[0],
          content: message,
          read: false,
          createdAt: new Date()
        };

        // Add message to conversation
        conversation.messages.push(newMessage);
        conversation.lastMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
        conversation.lastMessageAt = new Date();
        
        // Increment unread count for recipient
        const currentUnread = conversation.unreadCounts.get(recipient.userId) || 0;
        conversation.unreadCounts.set(recipient.userId, currentUnread + 1);

        await conversation.save();

        // Convert to plain object for emission
        const conversationObj = conversation.toObject();
        if (conversationObj.unreadCounts instanceof Map) {
          conversationObj.unreadCounts = Object.fromEntries(conversationObj.unreadCounts);
        }

        // Emit to all users in the conversation room
        io.to(`conversation_${conversationId}`).emit('new_message', {
          conversation: conversationObj,
          message: newMessage
        });

        // Notify recipient if they're online
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

    // Mark messages as read
    socket.on('mark_messages_read', async (data) => {
      try {
        const { conversationId, userId } = data;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        // Mark messages as read
        conversation.messages.forEach(message => {
          if (message.senderId !== userId && !message.read) {
            message.read = true;
          }
        });

        // Reset unread count
        conversation.unreadCounts.set(userId, 0);
        await conversation.save();

        // Convert to plain object
        const conversationObj = conversation.toObject();
        if (conversationObj.unreadCounts instanceof Map) {
          conversationObj.unreadCounts = Object.fromEntries(conversationObj.unreadCounts);
        }

        // Notify other participants
        socket.to(`conversation_${conversationId}`).emit('messages_read', {
          conversationId,
          userId
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Typing indicators
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

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (socket.userId) {
        userSockets.delete(socket.userId);
        socket.broadcast.emit('user_offline', { userId: socket.userId });
      }
    });

    // Error handling
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