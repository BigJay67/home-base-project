import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'react-feather';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../hooks/useAuthToken';
import './Notifications.css';

function Notifications({ user }) {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!socket || !user) return;
    const handleMsg = () => fetchUnreadMessageCount();
    socket.on('message_notification', handleMsg);
    return () => socket.off('message_notification', handleMsg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/notifications`, {
        headers: { Authorization: await getAuthToken() }
      });
      if (res.ok) {
        const data = await res.json();
        const notifs = data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.isRead).length);
      }
    } catch (err) {}
  };

  const fetchUnreadMessageCount = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/conversations/unread-count`, {
        headers: { Authorization: await getAuthToken() }
      });
      if (res.ok) {
        const data = await res.json();
        const msgCount = data.unreadCount || 0;
        const notifUnread = notifications.filter(n => !n.isRead).length;
        setUnreadCount(notifUnread + msgCount);
      }
    } catch (err) {}
  };

  const markAsRead = async (id) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/notifications/${id}/read`, {
        method: 'PUT', headers: { Authorization: await getAuthToken() }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {}
  };

  const markAllAsRead = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/notifications/read-all`, {
        method: 'PUT', headers: { Authorization: await getAuthToken() }
      });
      if (res.ok) { setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); setUnreadCount(0); }
    } catch (err) {}
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      await fetch(`${backendUrl}/api/notifications/${id}`, {
        method: 'DELETE', headers: { Authorization: await getAuthToken() }
      });
      setNotifications(prev => {
        const deleted = prev.find(n => n._id === id);
        if (deleted && !deleted.isRead) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(n => n._id !== id);
      });
    } catch (err) {}
  };

  const handleClick = (notification) => {
    if (!notification.isRead) markAsRead(notification._id);
    setOpen(false);
    const t = notification.type;
    if (['booking_created','booking_confirmed','booking_cancelled','payment_success','payment_failed'].includes(t)) {
      navigate('/bookings');
    } else if (t === 'system_announcement' && notification.relatedId) {
      navigate(`/conversation/${notification.relatedId}`);
    } else if (t === 'system_announcement') {
      navigate('/conversations');
    }
  };

  const getTypeLabel = (type) => ({
    booking_created:    { label: 'Booking',  color: '#7eb3e8' },
    booking_confirmed:  { label: 'Confirmed', color: '#6ec98a' },
    booking_cancelled:  { label: 'Cancelled', color: '#e07060' },
    payment_success:    { label: 'Payment',   color: '#6ec98a' },
    payment_failed:     { label: 'Failed',    color: '#e07060' },
    new_review:         { label: 'Review',    color: 'var(--hb-gold)' },
    system_announcement:{ label: 'Message',   color: 'var(--hb-gold)' },
  }[type] || { label: 'Notice', color: 'var(--hb-muted)' });

  const formatTime = (d) => {
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!user) return null;

  const displayed = showAll ? notifications : notifications.slice(0, 6);

  return (
    <div className="ntf-wrap" ref={dropdownRef}>
      {/* Bell trigger */}
      <button
        className="ntf-bell"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="ntf-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="ntf-panel">
          {/* Header */}
          <div className="ntf-panel-hd">
            <span className="ntf-panel-title">Notifications</span>
            <div className="ntf-panel-actions">
              {unreadCount > 0 && (
                <button className="ntf-action-btn" onClick={markAllAsRead}>
                  <Check size={13} /> All read
                </button>
              )}
              <button className="ntf-close" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="ntf-list">
            {notifications.length === 0 ? (
              <div className="ntf-empty">
                <Bell size={28} />
                <p>No notifications yet</p>
              </div>
            ) : (
              <>
                {displayed.map(n => {
                  const { label, color } = getTypeLabel(n.type);
                  return (
                    <div
                      key={n._id}
                      className={`ntf-item ${!n.isRead ? 'unread' : ''}`}
                      onClick={() => handleClick(n)}
                    >
                      {/* Unread dot */}
                      {!n.isRead && <span className="ntf-dot" />}

                      <div className="ntf-item-body">
                        <div className="ntf-item-top">
                          <span className="ntf-type-tag" style={{ color }}>
                            {label}
                          </span>
                          <span className="ntf-time">{formatTime(n.createdAt)}</span>
                        </div>
                        <p className="ntf-item-title">{n.title}</p>
                        <p className="ntf-item-msg">{n.message}</p>
                      </div>

                      {/* Actions on hover */}
                      <div className="ntf-item-acts">
                        {!n.isRead && (
                          <button
                            className="ntf-act-btn"
                            onClick={e => { e.stopPropagation(); markAsRead(n._id); }}
                            title="Mark as read"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          className="ntf-act-btn del"
                          onClick={e => deleteNotification(n._id, e)}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {notifications.length > 6 && (
                  <button
                    className="ntf-show-more"
                    onClick={() => setShowAll(s => !s)}
                  >
                    {showAll ? 'Show less' : `Show all ${notifications.length}`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Notifications;