import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useConversationSocket } from '../hooks/useConversationSocket';

function ConversationDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const {
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesRead,
    handleNewMessage
  } = useConversationSocket(id, user);

  useEffect(() => {
    if (user && id) {
      fetchConversation();
    }
  }, [user, id]);

  useEffect(() => {
    const unsubscribe = handleNewMessage((data) => {
      console.log('Real-time message received:', data);
      setConversation(data.conversation);
      scrollToBottom();
    });

    return unsubscribe;
  }, [handleNewMessage]);

  const fetchConversation = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/conversations/${id}`, {
        headers: {
          'Authorization': user.uid
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }

      const data = await response.json();
      setConversation(data);
      
      if (isConnected) {
        markMessagesRead();
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    if (e.target.value.trim() && isConnected) {
      startTyping();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isConnected) {
        stopTyping();
      }
      typingTimeoutRef.current = null;
    }, 1000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!isConnected) {
      setError('Not connected to server. Please try again.');
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    stopTyping();

    setSending(true);
    setError('');

    try {
      await sendMessage(message.trim());
      setMessage('');
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <Container className="my-5">
        <Alert variant="warning">Please log in to view conversations.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
        <p className="mt-2">Loading conversation...</p>
      </Container>
    );
  }

  if (error && !conversation) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => navigate('/conversations')}>
          Back to Conversations
        </Button>
      </Container>
    );
  }

  if (!conversation) {
    return (
      <Container className="my-5">
        <Alert variant="warning">Conversation not found.</Alert>
        <Button variant="primary" onClick={() => navigate('/conversations')}>
          Back to Conversations
        </Button>
      </Container>
    );
  }

  const otherParticipant = conversation.participants.find(
    p => p.userId !== user.uid
  );

  return (
    <Container className="my-4 my-md-5">
      <div className="d-flex align-items-center mb-4">
        <Button 
          variant="outline-secondary" 
          onClick={() => navigate('/conversations')}
          className="me-3"
        >
          ← Back
        </Button>
        <div className="flex-grow-1">
          <div className="d-flex align-items-center">
            <h4 className="mb-1 me-2">
              Conversation with {otherParticipant?.displayName || otherParticipant?.email}
            </h4>
            <Badge 
              bg={isConnected ? 'success' : 'danger'} 
              className="mb-1"
            >
              {isConnected ? '🟢 Online' : '🔴 Offline'}
            </Badge>
          </div>
          <p className="text-muted mb-0 small">
            About: <strong>{conversation.listingName}</strong>
          </p>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {!isConnected && (
        <Alert variant="warning" className="mb-3">
          <strong>Connection Issue:</strong> Real-time features disabled. Messages may be delayed.
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {conversation.messages.length === 0 ? (
            <div className="text-center text-muted py-4">
              <p>No messages yet. Start the conversation!</p>
              {!isConnected && (
                <p className="small">Reconnect to enable real-time messaging.</p>
              )}
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {conversation.messages.map((msg, index) => (
                <div
                  key={index}
                  className={`d-flex ${msg.senderId === user.uid ? 'justify-content-end' : 'justify-content-start'}`}
                >
                  <div
                    className={`p-3 rounded ${
                      msg.senderId === user.uid 
                        ? 'bg-primary text-white' 
                        : 'bg-light'
                    }`}
                    style={{ maxWidth: '70%' }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <small className={`${msg.senderId === user.uid ? 'text-white-50' : 'text-muted'}`}>
                        {msg.senderId === user.uid ? 'You' : msg.senderName}
                      </small>
                      <small className={`${msg.senderId === user.uid ? 'text-white-50' : 'text-muted'} ms-2`}>
                        {formatTime(msg.createdAt)}
                      </small>
                    </div>
                    <p className="mb-0">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Form onSubmit={handleSendMessage}>
            <Form.Group>
              <Form.Label>Your Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={message}
                onChange={handleInputChange}
                placeholder={isConnected ? "Type your message here..." : "Reconnecting..."}
                disabled={sending || !isConnected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && isConnected) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
            </Form.Group>
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">
                {isConnected ? 'Press Enter to send, Shift+Enter for new line' : 'Connecting to server...'}
              </small>
              <Button
                variant="primary"
                type="submit"
                disabled={sending || !message.trim() || !isConnected}
              >
                {sending ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ConversationDetail;