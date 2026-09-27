import React, { useCallback, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useParams } from 'react-router-dom';
import { NavDropdown } from 'react-bootstrap';
import { ChevronDown, Search } from 'react-feather';
import Home from './components/Home';
import Bookings from './components/Bookings';
import PaymentCallback from './components/PaymentCallback';
import NewListing from './components/NewListing';
import Profile from './components/Profile';
import ListingDetail from './components/ListingDetail';
import AdminDashboard from './components/AdminDashboard';
import Notifications from './components/Notifications';
import Conversations from './components/Conversations';
import ConversationDetail from './components/ConversationDetail';
import PaymentHistory from './components/PaymentHistory';
import BookingDetail from './components/BookingDetail';
import UserDetail from './components/UserDetail';
import LoginPage from './components/LoginPage';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider, useToast } from './context/ToastContext';
import useListings from './hooks/useListings';
import useAuth from './hooks/useAuth';
import usePayment from './hooks/usePayment';
import ProfileAvatar from './components/ProfileAvatar';
import UserListings from './components/UserListings';
import './styles/cinematic.css';
import './styles/bootstrap-theme.css';
import CommandPalette from './components/CommandPalette';

function RequireAuth({ user, authLoading, children }) {
  if (authLoading) {
    return (
      <div className="hb-auth-loading">
        <div className="hb-auth-spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function LegacyListingRedirect() {
  const { id } = useParams();
  return <Navigate to={`/listing/${id}`} replace />;
}

function AppShell() {
  const [notificationRefresh, setNotificationRefresh] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const toast = useToast();

  const {
    listings, error, loading,
    typeFilter, setTypeFilter,
    locationFilter, setLocationFilter,
    maxPriceFilter, setMaxPriceFilter,
    fetchListings,
  } = useListings();

  // Every existing setPaymentMessage(...) call in the app now shows a toast instead of a permanent banner
  const setPaymentMessage = useCallback((message) => {
    if (!message) return;
    const isError = /fail|error|denied|invalid|expired|could not|unable|maximum|must be/i.test(message);
    const isSuccess = /success|logged out|deleted|updated|created/i.test(message);
    toast.show(message, isError ? 'error' : isSuccess ? 'success' : 'info', isError ? 7000 : 4500);
  }, [toast]);

  const { user, userProfile, authLoading, refreshUserProfile, handleSignOut } = useAuth(setPaymentMessage);
  const { handlePayment } = usePayment(user, setPaymentMessage);

  const guard = (element) => (
    <RequireAuth user={user} authLoading={authLoading}>{element}</RequireAuth>
  );

  const handleSearch = e => { e.preventDefault(); fetchListings(); };
  const refreshNotifications = useCallback(() => setNotificationRefresh(p => p + 1), []);

  // Detect scroll → switch navbar to frosted glass
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cmd/Ctrl+K opens the command palette from anywhere
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close mobile menu on navigation
  const closeMobile = () => setMobileOpen(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <SocketProvider user={user}>
      <Router>

        {/* ── Navbar ───────────────────────────────────────── */}
        <nav className={`hb-navbar${scrolled ? ' scrolled' : ''}`}>
          <div className="hb-navbar-inner">

            {/* Logo */}
            <Link to="/" className="hb-logo" onClick={closeMobile}>
              Home<em>Base</em>
            </Link>

            {/* Center nav links (desktop only) */}
            <ul className="hb-nav-links">
              {user && (
                <>
                  <li>
                    <NavLink to="/bookings" className={({ isActive }) => 'hb-nav-a' + (isActive ? ' active' : '')}>
                      Bookings
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/new-listing" className={({ isActive }) => 'hb-nav-a' + (isActive ? ' active' : '')}>
                      Host
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/payment-history" className={({ isActive }) => 'hb-nav-a' + (isActive ? ' active' : '')}>
                      History
                    </NavLink>
                  </li>
                  {userProfile?.role === 'admin' && (
                    <li>
                      <NavLink to="/admin" className={({ isActive }) => 'hb-nav-a' + (isActive ? ' active' : '')}>
                        Admin
                      </NavLink>
                    </li>
                  )}
                </>
              )}
            </ul>

            {/* Right side */}
            <div className="hb-nav-right">
              {/* Command palette trigger */}
              <button className="hb-cmdk-trigger" onClick={() => setCmdkOpen(true)} aria-label="Search">
                <Search size={15} />
                <span className="hb-cmdk-trigger-label">Search</span>
                <kbd className="hb-cmdk-kbd">⌘K</kbd>
              </button>
              {/* Notifications bell */}
              {user && <Notifications user={user} refresh={notificationRefresh} />}

              {/* User menu or login button */}
              {user ? (
                <NavDropdown
                  title={
                    <div className="hb-user-pill">
                      <ProfileAvatar user={user} userProfile={userProfile} size={28} />
                      <span className="hb-user-name">
                        {user.displayName || user.email.split('@')[0]}
                      </span>
                      <ChevronDown size={13} style={{ color: 'var(--hb-muted)', flexShrink: 0 }} />
                    </div>
                  }
                  id="user-menu"
                  align="end"
                >
                  <NavDropdown.Item as={NavLink} to="/profile" onClick={closeMobile}>
                    My Profile
                  </NavDropdown.Item>
                  <NavDropdown.Item as={NavLink} to="/bookings" onClick={closeMobile}>
                    My Bookings
                  </NavDropdown.Item>
                  <NavDropdown.Item as={NavLink} to="/conversations" onClick={closeMobile}>
                    Messages
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={() => { handleSignOut(); closeMobile(); }} className="text-danger">
                    Log Out
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <NavLink to="/login" className="hb-nav-btn hb-nav-btn-gold">
                  Enter
                </NavLink>
              )}

              {/* Hamburger (mobile) */}
              <button
                className={`hb-mobile-toggle${mobileOpen ? ' open' : ''}`}
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Menu"
              >
                <span /><span /><span />
              </button>
            </div>
          </div>
        </nav>

        {/* ── Mobile full-screen menu ───────────────────────── */}
        <div className={`hb-mobile-menu${mobileOpen ? ' open' : ''}`}>
          <Link to="/" className="hb-mobile-link" onClick={closeMobile}>Home</Link>
          {user ? (
            <>
              <NavLink to="/bookings"        className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>Bookings</NavLink>
              <NavLink to="/new-listing"     className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>Host a Property</NavLink>
              <NavLink to="/payment-history" className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>Payment History</NavLink>
              <NavLink to="/conversations"   className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>Messages</NavLink>
              <NavLink to="/profile"         className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>My Profile</NavLink>
              {userProfile?.role === 'admin' && (
                <NavLink to="/admin" className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>Admin</NavLink>
              )}
            </>
          ) : (
            <NavLink to="/login" className="hb-mobile-link" onClick={closeMobile}>Sign In</NavLink>
          )}
          {user && (
            <div className="hb-mobile-actions">
              <button
                onClick={() => { handleSignOut(); closeMobile(); }}
                style={{ background: 'none', border: '1px solid var(--hb-border2)', borderRadius: 'var(--r-pill)', color: 'var(--hb-red)', padding: '0.7rem 1.5rem', fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Log Out
              </button>
            </div>
          )}
        </div>

        {/* ── Routes ───────────────────────────────────────── */}
        <Routes>
          <Route path="/login" element={<LoginPage setPaymentMessage={setPaymentMessage} />} />
          <Route
            path="/"
            element={
              <Home
                user={user}
                listings={listings}
                error={error}
                loading={loading}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                locationFilter={locationFilter}
                setLocationFilter={setLocationFilter}
                maxPriceFilter={maxPriceFilter}
                setMaxPriceFilter={setMaxPriceFilter}
                setPaymentMessage={setPaymentMessage}
                handleSearch={handleSearch}
                fetchListings={fetchListings}
                handleSignOut={handleSignOut}
              />
            }
          />
          <Route path="/bookings"            element={guard(<Bookings user={user} />)} />
          <Route path="/payment-callback"    element={<PaymentCallback user={user} />} />
          <Route path="/new-listing"         element={guard(<NewListing user={user} />)} />
          <Route path="/profile"             element={guard(<Profile user={user} onProfileUpdate={refreshUserProfile} />)} />
          <Route path="/listing/:id"         element={<ListingDetail user={user} handlePayment={handlePayment} />} />
          <Route path="/listings/:id"        element={<LegacyListingRedirect />} />
          <Route path="/admin"               element={guard(<AdminDashboard user={user} />)} />
          <Route path="/conversations"       element={guard(<Conversations user={user} />)} />
          <Route path="/conversation/:id"    element={guard(<ConversationDetail user={user} onMessageSent={refreshNotifications} />)} />
          <Route path="/payment-history"     element={guard(<PaymentHistory user={user} />)} />
          <Route path="/bookings/:id"        element={guard(<BookingDetail user={user} />)} />
          <Route path="/admin/users/:userId" element={guard(<UserDetail user={user} />)} />
          <Route path="/listings"            element={guard(<UserListings user={user} />)} />
        </Routes>

        {/* ── Floating chat ────────────────────────────────── */}
        {user && (
          <Link to="/conversations" className="floating-chat-btn" title="Messages">
            <svg width="21" height="21" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="hb-footer">
          <div className="hb-footer-inner">
            <div className="hb-footer-grid">
              <div>
                <span className="hb-footer-logo">Home<em>Base</em></span>
                <p className="hb-footer-desc">
                  Premium accommodations across Nigeria. Apartments, studios and hostels — book with confidence.
                </p>
              </div>
              <div className="hb-footer-col">
                <h6>Explore</h6>
                <ul>
                  <li><Link to="/">Listings</Link></li>
                  <li><Link to="/bookings">My Bookings</Link></li>
                  <li><Link to="/new-listing">Host a Property</Link></li>
                  <li><Link to="/payment-history">Payment History</Link></li>
                </ul>
              </div>
              <div className="hb-footer-col">
                <h6>Support</h6>
                <ul>
                  <li><Link to="/conversations">Help Center</Link></li>
                  <li><button type="button">Safety</button></li>
                  <li><button type="button">Contact Us</button></li>
                </ul>
              </div>
              <div className="hb-footer-col">
                <h6>Legal</h6>
                <ul>
                  <li><button type="button">Terms of Service</button></li>
                  <li><button type="button">Privacy Policy</button></li>
                  <li><button type="button">Cookie Policy</button></li>
                </ul>
              </div>
            </div>
            <div className="hb-footer-bottom">
              <span className="hb-footer-copy">© {new Date().getFullYear()} HomeBase. All rights reserved.</span>
              <span className="hb-footer-copy">Built for Nigeria.</span>
            </div>
          </div>
        </footer>

        <CommandPalette
          open={cmdkOpen}
          onClose={() => setCmdkOpen(false)}
          user={user}
          userProfile={userProfile}
          handleSignOut={handleSignOut}
        />
      </Router>
    </SocketProvider>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

export default App;