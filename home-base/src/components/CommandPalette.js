import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Home, Calendar, MessageCircle, User, DollarSign, Shield, LogOut, MapPin } from 'react-feather'
import { api } from '../api/client'

function CommandPalette ({ open, onClose, user, userProfile, handleSignOut }) {
  const [query, setQuery] = useState('')
  const [listingResults, setListingResults] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)
  const navigate = useNavigate()

  const go = useCallback((path) => {
    navigate(path)
    onClose()
  }, [navigate, onClose])

  const staticCommands = [
    { id: 'home', label: 'Browse properties', icon: Home, action: () => go('/') },
    ...(user
      ? [
          { id: 'bookings', label: 'My bookings', icon: Calendar, action: () => go('/bookings') },
          { id: 'host', label: 'List a property', icon: Home, action: () => go('/new-listing') },
          { id: 'messages', label: 'Messages', icon: MessageCircle, action: () => go('/conversations') },
          { id: 'profile', label: 'My profile', icon: User, action: () => go('/profile') },
          { id: 'history', label: 'Payment history', icon: DollarSign, action: () => go('/payment-history') },
          ...(userProfile?.role === 'admin'
            ? [{ id: 'admin', label: 'Admin dashboard', icon: Shield, action: () => go('/admin') }]
            : []),
          { id: 'logout', label: 'Log out', icon: LogOut, action: () => { handleSignOut(); onClose() } },
        ]
      : [{ id: 'login', label: 'Sign in', icon: User, action: () => go('/login') }]),
  ]

  const filteredCommands = query.trim()
    ? staticCommands.filter(c => c.label.toLowerCase().includes(query.trim().toLowerCase()))
    : staticCommands

  const items = [
    ...filteredCommands.map(c => ({ ...c, section: 'Go to' })),
    ...listingResults.map(l => ({
      id: `listing-${l._id}`,
      label: l.name,
      sub: l.location,
      icon: MapPin,
      section: 'Properties',
      action: () => go(`/listing/${l._id}`),
    })),
  ]

  // Live listing search once the query looks like a place name
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) { setListingResults([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get(`/api/listings?location=${encodeURIComponent(q)}`, { auth: false })
        setListingResults(Array.isArray(data) ? data.slice(0, 5) : [])
      } catch (_) {
        setListingResults([])
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  useEffect(() => { setActiveIndex(0) }, [query, listingResults.length])

  useEffect(() => {
    if (open) {
      setQuery('')
      setListingResults([])
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, items.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter') { e.preventDefault(); items[activeIndex]?.action(); }
  }

  if (!open) return null

  let lastSection = null

  return (
    <div className="hb-cmdk-backdrop" onMouseDown={onClose}>
      <div className="hb-cmdk" onMouseDown={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ marginLeft: '1.1rem', color: 'var(--hb-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="hb-cmdk-input"
            placeholder="Search properties or jump to a page…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ borderBottom: 'none' }}
          />
        </div>
        <div className="hb-cmdk-list">
          {items.length === 0 ? (
            <div className="hb-cmdk-empty">No matches for "{query}"</div>
          ) : (
            items.map((item, i) => {
              const showLabel = item.section !== lastSection
              lastSection = item.section
              const Icon = item.icon
              return (
                <React.Fragment key={item.id}>
                  {showLabel && (
                    <div style={{ padding: '0.5rem 0.8rem 0.25rem', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--hb-muted)' }}>
                      {item.section}
                    </div>
                  )}
                  <div
                    className={`hb-cmdk-item${i === activeIndex ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={item.action}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                    {item.sub && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--hb-muted)' }}>{item.sub}</span>}
                  </div>
                </React.Fragment>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default CommandPalette