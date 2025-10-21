import React, { useState, useEffect } from 'react';
import { Container, Card, Badge, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function MessagesList({ user , onRefreshUnread}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

   useEffect(() => {
    if (user) {
      fetchConversations();
      if (onRefreshUnread) {
        onRefreshUnread();
      }
    }
  }, [user, onRefreshUnread]);

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

  const getOtherParticipant = (conversation) => {
    return conversation.participants.find(p => p.userId !== user.uid);
  };

  const getUnreadCount = (conversation) => {
    return conversation.unreadCount?.get(user.uid) || 0;
  };

  const formatLastMessage = (conversation) => {
    if (!conversation.lastMessage) return 'No messages yet';
    
    const isFromMe = conversation.lastMessage.senderId === user.uid;
    const prefix = isFromMe ? 'You: ' : '';
    return prefix + conversation.lastMessage.content;
  };

  if (!user) {
    return (
      <Container className="my-5">
        <Alert variant="info">Please log in to view your messages.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
        <p className="mt-2">Loading conversations...</p>
      </Container>
    );
  }

  return (
    <Container className="my-4 my-md-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 h-md-2 mb-0">Messages</h1>
        <Button variant="outline-primary" size="sm" onClick={fetchConversations}>
          Refresh
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {conversations.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <div className="text-muted mb-3">
              <span style={{ fontSize: '3rem' }}>💬</span>
            </div>
            <h5>No conversations yet</h5>
            <p className="text-muted">
              Start a conversation by messaging a host about their listing.
            </p>
          </Card.Body>
        </Card>
      ) : (
        <div className="conversations-list">
          {conversations.map((conversation) => {
            const otherParticipant = getOtherParticipant(conversation);
            const unreadCount = getUnreadCount(conversation);
            
            return (
              <Card key={conversation._id} className="mb-3 conversation-card">
                <Card.Body>
                  <Row className="align-items-center">
                    <Col xs={8} md={9}>
                      <Link 
                        to={`/messages/${conversation._id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div className="d-flex align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-1">
                              <h6 className="mb-0 me-2">
                                {otherParticipant?.displayName || 'User'}
                              </h6>
                              <Badge bg="secondary" className="small">
                                {otherParticipant?.role}
                              </Badge>
                            </div>
                            <p className="text-muted small mb-1">
                              Re: {conversation.listingName}
                            </p>
                            <p className="small text-truncate mb-0" style={{ maxWidth: '400px' }}>
                              {formatLastMessage(conversation)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </Col>
                    <Col xs={4} md={3} className="text-end">
                      <div className="d-flex flex-column align-items-end">
                        {unreadCount > 0 && (
                          <Badge bg="danger" pill className="mb-2">
                            {unreadCount}
                          </Badge>
                        )}
                        <small className="text-muted">
                          {new Date(conversation.updatedAt).toLocaleDateString()}
                        </small>
                        <Button
                          as={Link}
                          to={`/messages/${conversation._id}`}
                          variant="outline-primary"
                          size="sm"
                          className="mt-2"
                        >
                          Open
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}

export default MessagesList;