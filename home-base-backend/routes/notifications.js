const express = require('express');
const Notification = require('../models/Notification');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.headers.authorization;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ 
      userId, 
      isRead: false 
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers.authorization;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    const userId = req.headers.authorization;
    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers.authorization;

    const notification = await Notification.findOneAndDelete({ 
      _id: id, 
      userId 
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;