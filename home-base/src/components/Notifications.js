import React, { useState, useEffect } from 'react';
import { Dropdown, Badge, ListGroup, Button, Modal, Row, Col, Nav } from 'react-bootstrap';
import { Bell, Check, Trash2 } from 'react-feather';
import { useSocket } from '../context/SocketContext';

function Notifications({ user }) {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!socket || !user) return;

    const handleMessageNotification = (data) => {
      
      setUnreadCount(prev => prev + 1);
      
      fetchAllData();
    };

    socket.on('message_notification', handleMessageNotification);

    return () => {
      socket.off('message_notification', handleMessageNotification);
    };
  }, [socket, user]);

  useEffect(() => {
    if (user) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 5000); 
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchAllData = async () => {
    await Promise.all([fetchNotifications(), fetchUnreadMessageCount()]);
  };

  const fetchNotifications = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/notifications`, {
        headers: {
          'Authorization': user.uid
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        const notificationUnread = (data.notifications || []).filter(n => !n.isRead).length;
        setUnreadCount(prev => {
         
          const messageCount = prev - (data.notifications || []).filter(n => !n.isRead && n.type !== 'new_message').length;
          return notificationUnread + Math.max(0, messageCount);
        });
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchUnreadMessageCount = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/conversations/unread-count`, {
        headers: {
          'Authorization': user.uid
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const messageCount = data.unreadCount || 0;
        setUnreadCount(prev => {
         
          const notificationUnread = notifications.filter(n => !n.isRead && n.type !== 'new_message').length;
          return notificationUnread + messageCount;
        });
        
        if (messageCount > 0) {
          createMessageNotification(messageCount);
        }
      }
    } catch (err) {
      console.error('Error fetching unread message count:', err);
    }
  };

  const createMessageNotification = async (count) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user.uid
        },
        body: JSON.stringify({
          type: 'new_message',
          title: 'New Message',
          message: `You have ${count} new message${count > 1 ? 's' : ''}`,
          priority: 'medium'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(prev => [...prev, data.notification].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    } catch (err) {
      console.error('Error creating message notification:', err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': user.uid
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': user.uid
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': user.uid
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        setUnreadCount(prev => {
          const deletedNotification = notifications.find(n => n._id === notificationId);
          return deletedNotification && !deletedNotification.isRead ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_created':
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'payment_success':
      case 'payment_failed':
      case 'new_message':
        return <Bell size={16} />;
      case 'new_review':
      case 'review_reply':
        return <i className="bi bi-star" />;
      case 'listing_approved':
      case 'listing_rejected':
        return <i className="bi bi-house" />;
      case 'system_announcement':
        return <i className="bi bi-megaphone" />;
      default:
        return <Bell size={16} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const NotificationDropdown = () => (
    <Dropdown align="end">
      <Dropdown.Toggle
        variant="link"
        id="notifications-dropdown"
        className="text-decoration-none position-relative p-0"
      >
        <Bell size={20} className="text-dark" />
        {unreadCount > 0 && (
          <Badge
            bg="danger"
            className="position-absolute top-0 start-100 translate-middle rounded-pill"
            style={{ fontSize: '0.7rem' }}
          >
            {unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu className="p-0" style={{ minWidth: '300px' }}>
        <div className="p-3 border-bottom">
          <h6 className="mb-0">Notifications</h6>
          {unreadCount > 0 && (
            <small className="text-muted">{unreadCount} unread</small>
          )}
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {notifications.slice(0, 5).map((notification) => (
            <Dropdown.Item
              key={notification._id}
              className={`${!notification.isRead ? 'bg-light' : ''} small py-2`}
              onClick={() => {
                setShowModal(true);
                if (!notification.isRead) markAsRead(notification._id);
              }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong>{notification.title}</strong>
                  <div>{notification.message}</div>
                  <small className="text-muted">
                    {new Date(notification.createdAt).toLocaleString()}
                  </small>
                </div>
                <Badge bg={getPriorityColor(notification.priority)} className="ms-2">
                  {notification.priority}
                </Badge>
              </div>
            </Dropdown.Item>
          ))}
          {notifications.length === 0 && (
            <div className="text-center text-muted p-3">
              <Bell size={24} className="mb-2" />
              <p className="mb-0">No notifications</p>
            </div>
          )}
        </div>
        <div className="p-2 border-top text-center">
          <Button
            variant="link"
            className="text-decoration-none"
            onClick={() => setShowModal(true)}
          >
            View all notifications
          </Button>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );

  const NotificationsModal = () => (
    <Modal
      show={showModal}
      onHide={() => setShowModal(false)}
      size="lg"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Notifications
        </Modal.Title>
        {unreadCount > 0 && (
          <Button variant="outline-primary" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <ListGroup variant="flush">
          {notifications.map((notification) => (
            <ListGroup.Item 
              key={notification._id}
              className={`${!notification.isRead ? 'bg-light' : ''}`}
            >
              <Row className="align-items-center">
                <Col xs={1}>
                  <span style={{ fontSize: '1.2em' }}>
                    {getNotificationIcon(notification.type)}
                  </span>
                </Col>
                <Col xs={8}>
                  <div className="d-flex justify-content-between align-items-start">
                    <h6 className="mb-1 small">{notification.title}</h6>
                    <Badge bg={getPriorityColor(notification.priority)} className="small">
                      {notification.priority}
                    </Badge>
                  </div>
                  <p className="mb-1 small">{notification.message}</p>
                  <small className="text-muted">
                    {new Date(notification.createdAt).toLocaleString()}
                  </small>
                </Col>
                <Col xs={3} className="text-end">
                  {!notification.isRead && (
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="me-1"
                      onClick={() => markAsRead(notification._id)}
                    >
                      <Check size={14} />
                    </Button>
                  )}
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => deleteNotification(notification._id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Col>
              </Row>
            </ListGroup.Item>
          ))}
        </ListGroup>
        
        {notifications.length === 0 && (
          <div className="text-center text-muted py-4">
            <Bell size={48} className="mb-2" />
            <p>No notifications yet</p>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );

  if (!user) return null;

  return (
    <>
      <NotificationDropdown />
      <NotificationsModal />
    </>
  );
}

export default Notifications;