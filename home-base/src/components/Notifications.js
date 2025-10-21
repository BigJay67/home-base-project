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
    if (!socket) return;

    const handleMessageNotification = (data) => {
      
      fetchAllData();
    };

    socket.on('message_notification', handleMessageNotification);

    return () => {
      socket.off('message_notification', handleMessageNotification);
    };
  }, [socket]);

  useEffect(() => {
    if (user) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchAllData = async () => {
    await fetchNotifications();
    await fetchUnreadMessageCount();
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
         
          const messageCount = prev - (prev - notificationUnread);
          return notificationUnread + messageCount;
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
        
        
        const notificationUnread = notifications.filter(n => !n.isRead).length;
        setUnreadCount(notificationUnread + messageCount);
        
        
        if (messageCount > 0) {
          createMessageNotification(messageCount);
        }
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const createMessageNotification = (messageCount) => {
    const existingMessageNotification = notifications.find(
      n => n.type === 'new_message' && !n.isRead
    );

    if (!existingMessageNotification) {
      const messageNotification = {
        _id: 'message-' + Date.now(),
        type: 'new_message',
        title: 'New Messages',
        message: `You have ${messageCount} unread message${messageCount > 1 ? 's' : ''}`,
        isRead: false,
        priority: 'medium',
        createdAt: new Date()
      };
      
      setNotifications(prev => [messageNotification, ...prev]);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      
      const notification = notifications.find(n => n._id === notificationId);
      if (notification && notification.type === 'new_message') {
        window.location.href = '/conversations';
        return;
      }
      
      
      if (!notificationId.startsWith('message-')) {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        await fetch(`${backendUrl}/api/notifications/${notificationId}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': user.uid,
            'Content-Type': 'application/json'
          }
        });
      }
      
      
      setNotifications(notifications.map(notif => 
        notif._id === notificationId ? { ...notif, isRead: true } : notif
      ));
      
      
      const updatedUnread = notifications.filter(n => !n.isRead && n._id !== notificationId).length;
      setUnreadCount(updatedUnread);
      
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      await fetch(`${backendUrl}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': user.uid,
          'Content-Type': 'application/json'
        }
      });
      
      setNotifications(notifications.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      if (!notificationId.startsWith('message-')) {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        await fetch(`${backendUrl}/api/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': user.uid
          }
        });
      }
      
      const deletedNotif = notifications.find(n => n._id === notificationId);
      setNotifications(notifications.filter(notif => notif._id !== notificationId));
      
      
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_created':
      case 'booking_confirmed':
        return '📅';
      case 'payment_success':
        return '💳';
      case 'payment_failed':
        return '❌';
      case 'new_review':
      case 'review_reply':
        return '⭐';
      case 'new_message':
        return '💬';
      case 'listing_approved':
        return '✅';
      case 'listing_rejected':
        return '🚫';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification._id);
    
    if (notification.type === 'new_message') {
      window.location.href = '/conversations';
    }
  };

  const NotificationDropdown = () => (
    <Dropdown as={Nav.Item} align="end">
      <Dropdown.Toggle as={Nav.Link} className="position-relative p-2">
        <Bell size={20} />
        {unreadCount > 0 && (
          <Badge 
            bg="danger" 
            className="position-absolute top-0 start-100 translate-middle"
            style={{ fontSize: '0.6rem', minWidth: '18px', height: '18px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ width: 'min(350px, 90vw)', maxHeight: '400px', overflowY: 'auto' }}>
        <div className="d-flex justify-content-between align-items-center p-2 border-bottom">
          <h6 className="mb-0">Notifications</h6>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={markAllAsRead} className="p-0">
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Dropdown.ItemText className="text-center text-muted py-3">
            No notifications
          </Dropdown.ItemText>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <Dropdown.Item 
              key={notification._id}
              className={`p-2 border-bottom ${!notification.isRead ? 'bg-light' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="d-flex align-items-start">
                <span className="me-2" style={{ fontSize: '1.2em' }}>
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start">
                    <h6 className="mb-1 small">{notification.title}</h6>
                    <Badge 
                      bg={getPriorityColor(notification.priority)} 
                      size="sm"
                      className="small"
                    >
                      {notification.priority}
                    </Badge>
                  </div>
                  <p className="mb-1 small text-muted">{notification.message}</p>
                  <small className="text-muted">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </small>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="text-danger p-0 ms-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification._id);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Dropdown.Item>
          ))
        )}

        {notifications.length > 5 && (
          <div className="text-center p-2">
            <Button variant="link" size="sm" onClick={() => setShowModal(true)}>
              View all notifications
            </Button>
          </div>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );

  const NotificationsModal = () => (
    <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>All Notifications</Modal.Title>
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