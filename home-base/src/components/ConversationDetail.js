import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'react-feather';
import { useConversationSocket } from '../hooks/useConversationSocket';
import { api } from '../api/client';
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

  const fetchConversation = useCallback(async () => {
    try {
      setConversation(await api.get(`/api/conversations/${id}`));
    } catch (err) {
      if (err.status === 404) {
        setError('Conversation not found.');
      } else {
        setError('Failed to load conversation.');
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { if (user && id) fetchConversation(); }, [user, id, fetchConversation]);

  useEffect(() => {
    const unsubscribe = handleNewMessage((data) => {
      setConversation(data.conversation);
      scrollToBottom();
    });
    return unsubscribe;
  }, [handleNewMessage]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [conversation?.messages]);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim() && isConnected) startTyping();
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => isConnected && stopTyping(), 1000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !conversation) return;
    setSending(true);
    setError('');
    try {
      const toUserId = conversation.participants.find(p => p.userId !== user.uid)?.userId;
      const listingId = conversation.listingId?._id || conversation.listingId;
      setConversation(await api.post('/api/conversations', { toUserId, message: message.trim(), listingId }));
      setMessage('');
      if (isConnected) markMessagesRead();
    } catch (err) {
      setError(err.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  // Group messages by date for date separators
  const getDateLabel = (d) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) return <div className="cd-state"><div className="cd-spinner" /></div>;
  if (error && !conversation) return <div className="cd-state"><p className="cd-error">{error}</p></div>;
  if (!conversation) return <div className="cd-state"><p>Conversation not found.</p></div>;

  const other = conversation.participants.find(p => p.userId !== user.uid);
  const otherName = other?.displayName || other?.email || 'User';

  let lastDate = null;

  return (
    <div className="cd-page">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="cd-header">
        <button className="cd-back" onClick={() => navigate('/conversations')}>
          <ArrowLeft size={20} />
        </button>

        <div className="cd-avatar">
          {other?.profilePicture ? (
            <img src={other.profilePicture} alt={otherName} />
          ) : (
            <span>{getInitials(otherName)}</span>
          )}
        </div>

        <div className="cd-header-info">
          <span className="cd-header-name">{otherName}</span>
          <span className="cd-header-listing">Re: {conversation.listingName}</span>
        </div>

        <span className={`cd-status ${isConnected ? 'online' : ''}`}>
          {isConnected ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* ── Messages ───────────────────────────────────────── */}
      <div className="cd-messages">
        {conversation.messages.length === 0 ? (
          <div className="cd-empty">
            <p>No messages yet.</p>
            <span>Say hello to {otherName.split(' ')[0]} 👋</span>
          </div>
        ) : (
          conversation.messages.map((msg, i) => {
            const isMine = msg.senderId === user.uid;
            const dateLabel = getDateLabel(msg.createdAt);
            const showDateSep = dateLabel !== lastDate;
            lastDate = dateLabel;

            return (
              <React.Fragment key={i}>
                {showDateSep && (
                  <div className="cd-date-sep"><span>{dateLabel}</span></div>
                )}
                <div className={`cd-msg-row ${isMine ? 'mine' : 'theirs'}`}>
                  <div className={`cd-bubble ${isMine ? 'mine' : 'theirs'}`}>
                    <p>{msg.content}</p>
                    <span className="cd-bubble-time">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────── */}
      <div className="cd-input-bar">
        {!isConnected && <div className="cd-reconnect">Reconnecting…</div>}
        <form onSubmit={handleSendMessage} className="cd-form">
          <textarea
            rows={1}
            value={message}
            onChange={handleInputChange}
            placeholder="Type a message…"
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            className="cd-send-btn"
            disabled={sending || !message.trim()}
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ConversationDetail;