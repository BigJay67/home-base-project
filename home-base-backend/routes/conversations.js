const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Listing = require('../models/Listing');
const NotificationService = require('../services/notificationService');
const { displayNameOf, toPayload } = require('../services/conversationService');

router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const conversations = await Conversation.find({
      'participants.userId': userId,
    })
      .populate('listingId', 'name images')
      .sort({ updatedAt: -1 });

    const conversationsWithPlainUnread = conversations.map(conv => {
      const convObj = conv.toObject();
      if (convObj.unreadCounts instanceof Map) {
        convObj.unreadCounts = Object.fromEntries(convObj.unreadCounts);
      }
      return convObj;
    });
    res.json(conversationsWithPlainUnread);
  } catch (err) {
    console.error('Error fetching conversations:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const conversations = await Conversation.find({
      'participants.userId': userId,
    });
    let totalUnread = 0;
    conversations.forEach(conv => {
      const unreadCounts = conv.unreadCounts instanceof Map
        ? Object.fromEntries(conv.unreadCounts)
        : conv.unreadCounts;
      totalUnread += unreadCounts[userId] || 0;
    });
    res.json({ unreadCount: totalUnread });
  } catch (err) {
    console.error('Error fetching unread count:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

const { requireVerifiedEmail } = require('../middleware/auth');

const { writeLimiter } = require('../middleware/rateLimiter');

router.post('/', writeLimiter, requireVerifiedEmail, async (req, res) => {
  try {
    const { toUserId, message, listingId } = req.body;
    const fromUserId = req.userId;
    if (!fromUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!toUserId || !message || !listingId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message must be 1000 characters or fewer' });
    }
    if (toUserId === fromUserId) {
      return res.status(400).json({ error: 'You cannot message yourself' });
    }

    const [fromUser, toUser, listing] = await Promise.all([
      User.findOne({ userId: fromUserId }),
      User.findOne({ userId: toUserId }),
      Listing.findById(listingId),
    ]);
    if (!fromUser || !toUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.createdBy !== fromUserId && listing.createdBy !== toUserId) {
      return res.status(403).json({ error: 'Messages about a listing must involve its host' });
    }

    let conversation = await Conversation.findOne({
      listingId,
      'participants.userId': { $all: [fromUserId, toUserId] },
    });

    if (conversation) {
      conversation.messages.push({
        senderId: fromUserId,
        senderEmail: fromUser.email,
        senderName: displayNameOf(fromUser),
        content: message,
      });
      conversation.lastMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
      conversation.lastMessageAt = new Date();

      const currentUnread = conversation.unreadCounts.get(toUserId) || 0;
      conversation.unreadCounts.set(toUserId, currentUnread + 1);
    } else {
      conversation = new Conversation({
        participants: [
          {
            userId: fromUserId,
            email: fromUser.email,
            displayName: fromUser.displayName || '',
          },
          {
            userId: toUserId,
            email: toUser.email,
            displayName: toUser.displayName || '',
          },
        ],
        listingId,
        listingName: listing.name,
        messages: [
          {
            senderId: fromUserId,
            senderEmail: fromUser.email,
            senderName: displayNameOf(fromUser),
            content: message,
          },
        ],
        lastMessage: message.length > 50 ? message.substring(0, 50) + '...' : message,
        unreadCounts: new Map([[toUserId, 1]]),
      });
    }
    await conversation.save();

    const conversationObj = await toPayload(conversation);

    // Live update for anyone with this chat open, plus a ping for the recipient's notification bell
    const io = req.app.get('io');
    if (io) {
      io.to(String(conversation._id)).emit('new_message', { conversation: conversationObj });
      io.to(`user:${toUserId}`).emit('message_notification', { conversationId: conversation._id });
    }

    // Create notification for recipient
    try {
      await NotificationService.createNotification({
        userId: toUserId,
        type: 'system_announcement',
        title: 'New Message',
        message: `You have a new message about "${listing.name}"`,
        relatedId: conversation._id,
        relatedModel: null,
        priority: 'medium',
      });
    } catch (notifErr) {
      console.error('Message notification error:', notifErr);
    }

    res.status(201).json(conversationObj);
  } catch (err) {
    console.error('Error creating conversation:', {
      message: err.message,
      stack: err.stack,
      userId: req.userId, // Use req.userId instead of fromUserId
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.userId': userId,
    }).populate('listingId', 'name images location');
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

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
    res.json(conversationObj);
  } catch (err) {
    console.error('Error fetching conversation:', {
      message: err.message,
      stack: err.stack,
      userId: req.userId,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:conversationId/messages', writeLimiter, requireVerifiedEmail, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const fromUserId = req.userId;
    if (!fromUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message must be 1000 characters or fewer' });
    }
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.userId': fromUserId,
    });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const fromUser = await User.findOne({ userId: fromUserId });
    if (!fromUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const recipient = conversation.participants.find(p => p.userId !== fromUserId);

    conversation.messages.push({
      senderId: fromUserId,
      senderEmail: fromUser.email,
      senderName: displayNameOf(fromUser),
      content: message,
    });
    conversation.lastMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
    conversation.lastMessageAt = new Date();

    const currentUnread = conversation.unreadCounts.get(recipient.userId) || 0;
    conversation.unreadCounts.set(recipient.userId, currentUnread + 1);
    await conversation.save();

    const conversationObj = await toPayload(conversation);

    const io = req.app.get('io');
    if (io) {
      io.to(String(conversation._id)).emit('new_message', { conversation: conversationObj });
      io.to(`user:${recipient.userId}`).emit('message_notification', { conversationId: conversation._id });
    }

    // Create notification for recipient
    try {
      await NotificationService.createNotification({
        userId: recipient.userId,
        type: 'system_announcement',
        title: 'New Message',
        message: `New message in your conversation about "${conversation.listingName}"`,
        relatedId: conversation._id,
        relatedModel: null,
        priority: 'medium',
      });
    } catch (notifErr) {
      console.error('Message notification error:', notifErr);
    }

    res.json(conversationObj);
  } catch (err) {
    console.error('Error sending message:', {
      message: err.message,
      stack: err.stack,
      userId: req.userId, // Use req.userId instead of fromUserId
    });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;