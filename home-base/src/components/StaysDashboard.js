import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clipboard, Home, MapPin, MessageCircle, PlusCircle } from 'react-feather';
import { api } from '../api/client';

const money = amount => `₦${Number(amount || 0).toLocaleString('en-NG')}`;
const date = value => value ? new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'To be confirmed';
const imageUrl = image => typeof image === 'string' ? image : image?.medium || image?.large || image?.original || image?.thumbnail;

export default function StaysDashboard({ user }) {
  const [bookings, setBookings] = useState([]);
  const [mode, setMode] = useState('guest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setBookings(await api.get('/api/bookings')); }
    catch (err) { setError(err.message || 'Could not load your stays'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);
  const visible = useMemo(() => bookings.filter(booking => mode === 'guest' ? booking.userId === user?.uid : booking.hostId === user?.uid), [bookings, mode, user]);
  const active = visible.filter(booking => ['completed', 'confirmed'].includes(booking.status));
  const other = visible.filter(booking => !active.includes(booking));

  const card = booking => {
    const listing = booking.listingId || {};
    const image = imageUrl(listing.images?.[0]);
    const ready = ['completed', 'confirmed'].includes(booking.status);
    return <article className="exp-booking" key={booking._id}>
      <div className="exp-booking-image">{image ? <img src={image} alt={listing.name || 'Accommodation'} /> : <Home size={46} />}</div>
      <div className="exp-booking-body">
        <div className="exp-booking-top"><span className="exp-chip">{mode === 'host' ? 'Hosting' : 'Your stay'}</span><span className={`exp-status exp-status-${booking.status}`}>{booking.status}</span></div>
        <h3>{listing.name || 'Property unavailable'}</h3>
        <p className="exp-location"><MapPin size={15} /> {listing.location || 'Location unavailable'}</p>
        <div className="exp-booking-meta"><span><Calendar size={16} /> {date(booking.moveInDate)} → {date(booking.checkOutDate)}</span><strong>{money(booking.totalAmount || booking.amount)}</strong></div>
        <div className="exp-booking-actions">
          {ready && <Link className="exp-action-primary" to={`/stays/${booking._id}`}>Open stay space <ArrowRight size={17} /></Link>}
          <Link className="exp-action-quiet" to={`/bookings/${booking._id}`}>Booking details</Link>
        </div>
      </div>
    </article>;
  };

  return <div className="exp-dashboard">
    <section className="exp-dashboard-hero"><div className="exp-kicker"><span /> YOUR SPACE, SORTED</div><h1>Every stay has<br /><em>a story.</em></h1><p>Bookings, agreements, move-in notes, and requests live together here.</p><div className="exp-dashboard-stats"><div><strong>{active.length}</strong><span>Active stays</span></div><div><strong>{visible.length}</strong><span>Total bookings</span></div><div><strong>{mode === 'host' ? 'Host' : 'Guest'}</strong><span>Current view</span></div></div></section>
    <div className="exp-dashboard-body"><div className="exp-dashboard-heading"><div><span className="exp-overline">YOUR HOMEBASE</span><h2>{mode === 'host' ? 'Hosted stays' : 'Your stays'}</h2></div><div className="exp-segment" role="group" aria-label="Booking view"><button className={mode === 'guest' ? 'active' : ''} onClick={() => setMode('guest')}>As guest</button><button className={mode === 'host' ? 'active' : ''} onClick={() => setMode('host')}>As host</button></div></div>
      {loading ? <div className="exp-state">Getting your stays ready…</div> : error ? <div className="exp-state"><p>{error}</p><button onClick={load}>Try again</button></div> : <>
        {active.length > 0 && <><div className="exp-list-heading"><Clipboard size={18} /><h3>In progress</h3><span>{active.length}</span></div><div className="exp-booking-grid">{active.map(card)}</div></>}
        {other.length > 0 && <><div className="exp-list-heading"><Calendar size={18} /><h3>Other bookings</h3><span>{other.length}</span></div><div className="exp-booking-grid">{other.map(card)}</div></>}
        {visible.length === 0 && <div className="exp-empty"><div><Home size={34} /></div><h3>{mode === 'host' ? 'Your hosting story starts here.' : 'No stays yet? Let’s change that.'}</h3><p>{mode === 'host' ? 'List your space, then manage bookings and guest needs from one place.' : 'Explore real spaces and book one that fits your life.'}</p><Link to={mode === 'host' ? '/new-listing' : '/#listings-section'}>{mode === 'host' ? <PlusCircle size={18} /> : <ArrowRight size={18} />}{mode === 'host' ? 'List a space' : 'Explore stays'}</Link></div>}
      </>}
      <div className="exp-dashboard-links"><Link to="/conversations"><MessageCircle size={21} /><span><strong>Messages</strong><small>Keep the conversation going</small></span><ArrowRight size={17} /></Link><Link to="/payment-history"><Clipboard size={21} /><span><strong>Payments</strong><small>See transactions and receipts</small></span><ArrowRight size={17} /></Link></div>
    </div>
  </div>;
}
