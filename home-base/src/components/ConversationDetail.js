import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useConversationSocket } from '../hooks/useConversationSocket';
import './ConversationDetail.css';

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
    startTyping,
    stopTyping,
    markMessagesRead,
    handleNewMessage
  } = useConversationSocket(id, user);

  useEffect(() => {
    if (user && id) fetchConversation();
  }, [user, id, fetchConversation]);

  useEffect(() => {
    const unsubscribe = handleNewMessage((data) => {
      setConversation(data.conversation);
      scrollToBottom();
    });
    return unsubscribe;
  }, [handleNewMessage]);

  const fetchConversation = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/conversations/${id}`, {
        headers: { Authorization: user.uid }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setConversation(data);
      if (isConnected) markMessagesRead();
    } catch (err) {
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim() && isConnected) startTyping();
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => isConnected && stopTyping(), 1000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !isConnected || !conversation) return;
    setSending(true);
    setError('');
    try {
      const toUserId = conversation.participants.find(p => p.userId !== user.uid)?.userId;
      const listingId = conversation.listingId?._id;
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.uid
        },
        body: JSON.stringify({ toUserId, message: message.trim(), listingId })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setConversation(data);
      setMessage('');
      if (isConnected) markMessagesRead();
    } catch (err) {
      setError(err.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (!user) return <Container className="my-5"><Alert variant="warning">Please log in.</Alert></Container>;
  if (loading) return <Container className="my-5 text-center"><Spinner animation="border" /></Container>;
  if (error && !conversation) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;
  if (!conversation) return <Container className="my-5"><Alert variant="warning">Not found.</Alert></Container>;

  const other = conversation.participants.find(p => p.userId !== user.uid);

  return (
    <Container fluid className="chat-container">
      <div className="chat-header border-bottom p-3 d-flex align-items-center">
        <Button variant="link" onClick={() => navigate('/conversations')} className="p-0 me-3">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M19 12H5m7-7l-7 7 7 7" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Button>
        <div className="flex-grow-1">
          <h5 className="mb-0 fw-semibold">{other?.displayName || other?.email}</h5>
          <small className="text-muted">About: {conversation.listingName}</small>
        </div>
        <Badge bg={isConnected ? 'success' : 'secondary'} className="small">
          {isConnected ? 'Online' : 'Offline'}
        </Badge>
      </div>

      <div className="chat-messages p-3" style={{ height: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        {conversation.messages.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          conversation.messages.map((msg, i) => (
            <div
              key={i}
              className={`d-flex mb-3 ${msg.senderId === user.uid ? 'justify-content-end' : 'justify-content-start'}`}
            >
              <div
                className={`p-3 rounded-3 ${
                  msg.senderId === user.uid ? 'bg-primary text-white' : 'bg-light'
                }`}
                style={{ maxWidth: '75%' }}
              >
                <p className="mb-1">{msg.content}</p>
                <small className={msg.senderId === user.uid ? 'text-white-50' : 'text-muted'}>
                  {formatTime(msg.createdAt)}
                </small>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <Card className="chat-input-card border-0 rounded-0">
        <Card.Body className="p-3">
          {!isConnected && <Alert variant="warning" className="small py-2 mb-2">Reconnecting...</Alert>}
          <Form onSubmit={handleSendMessage}>
            <Form.Control
              as="textarea"
              rows={2}
              value={message}
              onChange={handleInputChange}
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              disabled={sending || !isConnected}
              className="border-0 shadow-sm"
              style={{ resize: 'none' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && isConnected) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <div className="d-flex justify-content-end mt-2">
              <Button
                variant="primary"
                type="submit"
                disabled={sending || !message.trim() || !isConnected}
                size="sm"
              >
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ConversationDetail;