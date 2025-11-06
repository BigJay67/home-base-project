import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Conversations.css';

function Conversations({ user }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConversations = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]); 
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!user) {
    return (
      <Container className="my-5">
        <Alert variant="warning" className="text-center">Please log in to view your messages.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading conversations...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="my-4 my-md-5 conversation-list-container">
      <h1 className="h3 mb-4">Messages ({conversations.length})</h1>

      <div className="d-grid gap-3">
        {conversations.length === 0 ? (
          <Alert variant="info" className="text-center">
            You have no active conversations. Find a property to start chatting!
          </Alert>
        ) : conversations.map((conv) => {
          const other = conv.participants.find(p => p.userId !== user.uid);
          const unread = conv.readStatus?.[user.uid]?.unreadCount || 0;

          return (
            <Card key={conv._id} className={`conversation-card shadow-sm ${unread > 0 ? 'unread-card' : ''}`}>
              <Card.Body className="py-3 px-3">
                <div className="d-flex align-items-center">
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