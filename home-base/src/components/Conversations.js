import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Conversations.css';

function Conversations({ user }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/conversations`, {
        headers: { Authorization: user.uid }
      });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (hours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getUnreadCount = (conv, userId) => {
    if (!conv.unreadCounts) return 0;
    return conv.unreadCounts[userId] || 0;
  };

  if (!user) {
    return (
      <Container className="my-5 text-center">
        <Alert variant="warning">Please log in to view your messages.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="my-5 text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading your conversations...</p>
      </Container>
    );
  }

  if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;

  if (conversations.length === 0) {
    return (
      <Container className="my-5 text-center py-5">
        <div className="empty-inbox">
          <svg width="64" height="64" fill="none" stroke="currentColor" className="text-muted mb-3">
            <path d="M21 8H3v14h18V8zM21 8v14M3 8v14" strokeWidth="2" />
            <path d="M8 13h8" strokeWidth="2" />
          </svg>
          <h4>No messages yet</h4>
          <p className="text-muted">Start a conversation with a host to get help.</p>
          <Button variant="primary" as={Link} to="/">Browse Listings</Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="my-4 my-md-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold mb-0">Messages</h1>
        <Button variant="outline-primary" size="sm" onClick={fetchConversations}>
          Refresh
        </Button>
      </div>

      <div className="conversation-list">
        {conversations.map((conv) => {
          const other = conv.participants.find(p => p.userId !== user.uid);
          const unread = getUnreadCount(conv, user.uid);
          return (
            <Card key={conv._id} className="conversation-card mb-3 border-0 shadow-sm">
              <Card.Body className="p-3">
                <div className="d-flex">
                  <div className="me-3">
                    <div className="avatar-placeholder bg-light text-muted d-flex align-items-center justify-content-center rounded-circle">
                      {other?.displayName?.[0] || other?.email[0].toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="fw-semibold mb-0 text-truncate">
                          {other?.displayName || other?.email}
                        </h6>
                        <p className="text-muted small mb-1">About: {conv.listingName}</p>
                        <p className="text-dark mb-0 text-truncate" style={{ maxWidth: '300px' }}>
                          {conv.lastMessage}
                        </p>
                      </div>
                      <div className="text-end">
                        <small className="text-muted d-block">{formatTime(conv.lastMessageAt)}</small>
                        {unread > 0 && (
                          <Badge bg="danger" pill className="mt-1">{unread}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ms-3 d-flex align-items-center">
                    <Button
                      as={Link}
                      to={`/conversation/${conv._id}`}
                      variant={unread > 0 ? 'primary' : 'outline-primary'}
                      size="sm"
                    >
                      Open
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}

export default Conversations;