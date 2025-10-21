import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Badge, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function Conversations({ user }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/conversations`, {
        headers: {
          'Authorization': user.uid
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getUnreadCount = (conversation, userId) => {
    if (!conversation.unreadCounts) return 0;
    
    if (conversation.unreadCounts instanceof Map) {
      return conversation.unreadCounts.get(userId) || 0;
    } else if (typeof conversation.unreadCounts === 'object') {
      return conversation.unreadCounts[userId] || 0;
    }
    
    return 0;
  };

  if (!user) {
    return (
      <Container className="my-5">
        <Alert variant="warning">Please log in to view your conversations.</Alert>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>My Conversations</h1>
        <Button variant="outline-primary" onClick={fetchConversations}>
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p className="mt-2">Loading conversations...</p>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && conversations.length === 0 && (
        <Alert variant="info">
          You don't have any conversations yet. Message a listing owner to start a conversation!
        </Alert>
      )}

      <Row>
        {conversations.map((conversation) => {
          const otherParticipant = conversation.participants.find(
            p => p.userId !== user.uid
          );
          const unreadCount = getUnreadCount(conversation, user.uid);

          return (
            <Col xs={12} key={conversation._id} className="mb-3">
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-2">
                        <h5 className="mb-0 me-2">
                          {otherParticipant?.displayName || otherParticipant?.email}
                        </h5>
                        {unreadCount > 0 && (
                          <Badge bg="danger" pill>
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-muted mb-1">
                        About: <strong>{conversation.listingName}</strong>
                      </p>
                      
                      <p className="mb-2">
                        {conversation.lastMessage}
                      </p>
                      
                      <small className="text-muted">
                        Last message: {formatTime(conversation.lastMessageAt)}
                      </small>
                    </div>
                    
                    <div className="ms-3">
                      <Button
                        as={Link}
                        to={`/conversation/${conversation._id}`}
                        variant={unreadCount > 0 ? 'primary' : 'outline-primary'}
                        size="sm"
                      >
                        Open Chat
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
}

export default Conversations;