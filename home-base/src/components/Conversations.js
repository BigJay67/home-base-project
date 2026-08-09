import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'react-feather';
import './Conversations.css';
import { getAuthToken } from '../hooks/useAuthToken';

function Conversations({ user }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/conversations`, {
        headers: { Authorization: await getAuthToken() }
      });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      setConversations(await response.json());
    } catch (err) {
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (hours < 168) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  if (!user) {
    return (
      <div className="cv-empty-page">
        <MessageCircle size={40} />
        <p>Please log in to view your messages.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cv-empty-page">
        <div className="cv-spinner" />
        <p>Loading conversations…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cv-empty-page">
        <p className="cv-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="cv-page">
      <div className="cv-header">
        <h1 className="cv-title">Messages</h1>
        <span className="cv-count">{conversations.length}</span>
      </div>

      {conversations.length === 0 ? (
        <div className="cv-empty-page">
          <MessageCircle size={40} />
          <p>No conversations yet.</p>
          <span>Find a property and start chatting with a host.</span>
          <Link to="/" className="cv-empty-btn">Browse Properties</Link>
        </div>
      ) : (
        <div className="cv-list">
          {conversations.map((conv) => {
            const other = conv.participants.find(p => p.userId !== user.uid);
            const unread = conv.readStatus?.[user.uid]?.unreadCount || 0;
            const name = other?.displayName || other?.email || 'User';

            return (
              <Link
                key={conv._id}
                to={`/conversation/${conv._id}`}
                className={`cv-row ${unread > 0 ? 'unread' : ''}`}
              >
                {/* Avatar */}
                <div className="cv-avatar">
                  {other?.profilePicture ? (
                    <img src={other.profilePicture} alt={name} />
                  ) : (
                    <span>{getInitials(name)}</span>
                  )}
                  {unread > 0 && <span className="cv-dot" />}
                </div>

                {/* Text content */}
                <div className="cv-content">
                  <div className="cv-row-top">
                    <span className="cv-name">{name}</span>
                    <span className="cv-time">{formatTime(conv.lastMessageAt)}</span>
                  </div>
                  <div className="cv-row-bottom">
                    <span className="cv-preview">{conv.lastMessage}</span>
                    {unread > 0 && <span className="cv-badge">{unread}</span>}
                  </div>
                  <span className="cv-listing">Re: {conv.listingName}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Conversations;