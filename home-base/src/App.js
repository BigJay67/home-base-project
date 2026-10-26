import React, { useCallback, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useParams, useLocation } from 'react-router-dom';
import { NavDropdown } from 'react-bootstrap';
import { Search } from 'react-feather';
import Home from './components/Home';
import Notifications from './components/Notifications';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider, useToast } from './context/ToastContext';
import useListings from './hooks/useListings';
import useAuth from './hooks/useAuth';
import usePayment from './hooks/usePayment';
import ProfileAvatar from './components/ProfileAvatar';
import './styles/cinematic.css';
import './styles/bootstrap-theme.css';
import './styles/homebase-refresh.css';
import CommandPalette from './components/CommandPalette';
import EmailVerifyBanner from './components/EmailVerifyBanner';
import CookieConsent from './components/CookieConsent';
import './styles/inner-pages.css';
import './styles/experience.css';

const StaysDashboard = React.lazy(() => import('./components/StaysDashboard'));
const StaySpace = React.lazy(() => import('./components/StaySpace'));
const PaymentCallback = React.lazy(() => import('./components/PaymentCallback'));
const NewListing = React.lazy(() => import('./components/NewListing'));
const Profile = React.lazy(() => import('./components/Profile'));
const ListingDetail = React.lazy(() => import('./components/ListingDetail'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const Conversations = React.lazy(() => import('./components/Conversations'));
const ConversationDetail = React.lazy(() => import('./components/ConversationDetail'));
const PaymentHistory = React.lazy(() => import('./components/PaymentHistory'));
const BookingDetail = React.lazy(() => import('./components/BookingDetail'));
const UserDetail = React.lazy(() => import('./components/UserDetail'));
const LoginPage = React.lazy(() => import('./components/LoginPage'));
const UserListings = React.lazy(() => import('./components/UserListings'));
const SignupPage = React.lazy(() => import('./components/SignupPage'));

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

function PageSurface({ children }) {
  const { pathname } = useLocation();
  return <main key={pathname} className={pathname === '/' ? 'hb-home-route' : 'hb-inner-route'}>{children}</main>;
}

function AppShell() {
  const [notificationRefresh, setNotificationRefresh] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [verifyDismissed, setVerifyDismissed] = useState(false);
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
  const { handlePayment } = usePayment(user, userProfile?.email, setPaymentMessage);

  const guard = (element) => (
    <RequireAuth user={user} authLoading={authLoading}>{element}</RequireAuth>
  );

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

        {user && !verifyDismissed && (
          <EmailVerifyBanner user={user} onDismiss={() => setVerifyDismissed(true)} />
        )}
        {/* ── Navbar ───────────────────────────────────────── */}
        <nav className={`hb-navbar${scrolled ? ' scrolled' : ''}`}>
          <div className="hb-navbar-inner">

            {/* Logo */}
            <Link to="/" className="hb-logo" onClick={closeMobile}>
              <span className="hb-logo-mark">H</span><span className="hb-logo-word">home<em>base</em></span>
            </Link>

            {/* Center nav links (desktop only) */}
            <ul className="hb-nav-links">
              <li><a href="/#listings-section" className="hb-nav-a">Explore stays</a></li>
              {!user && <li><Link to="/signup" className="hb-nav-a">List your space</Link></li>}
              {user && (
                <>
                  <li>
                    <NavLink to="/bookings" className={({ isActive }) => 'hb-nav-a' + (isActive ? ' active' : '')}>
                      My stays
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
              <button className="hb-cmdk-trigger" onClick={() => setCmdkOpen(true)} aria-label="Open quick search">
                <Search size={15} />
                <span className="hb-cmdk-trigger-label">Search</span>
                <kbd className="hb-cmdk-kbd">⌘K</kbd>
              </button>
              {/* User menu or login button */}
              {user ? (
                <NavDropdown
                  title={
                    <div className="hb-user-pill">
                      <ProfileAvatar user={user} userProfile={userProfile} size={28} />
                    </div>
                  }
                  id="user-menu"
                  aria-label="Account menu"
                  align="end"
                >
                  <NavDropdown.Item as={NavLink} to="/profile" onClick={closeMobile}>
                    My Profile
                  </NavDropdown.Item>
                  <NavDropdown.Item as={NavLink} to="/bookings" onClick={closeMobile}>
                    My Stays
                  </NavDropdown.Item>
                  <NavDropdown.Item as={NavLink} to="/listings" onClick={closeMobile}>
                    My Listings
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
                  Sign in
                </NavLink>
              )}

              {/* Hamburger (mobile) */}
              <button
                className={`hb-mobile-toggle${mobileOpen ? ' open' : ''}`}
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Menu"
                aria-expanded={mobileOpen}
                aria-controls="homebase-mobile-menu"
              >
                <span /><span /><span />
              </button>
            </div>
          </div>
        </nav>

        {/* ── Mobile full-screen menu ───────────────────────── */}
        <div id="homebase-mobile-menu" className={`hb-mobile-menu${mobileOpen ? ' open' : ''}`} hidden={!mobileOpen}>
          <Link to="/" className="hb-mobile-link" onClick={closeMobile}>Home</Link>
          <a href="/#listings-section" className="hb-mobile-link" onClick={closeMobile}>Explore stays</a>
          {user ? (
            <>
              <NavLink to="/bookings"        className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>My Stays</NavLink>
              <NavLink to="/new-listing"     className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>Host a Property</NavLink>
              <NavLink to="/listings"        className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>My Listings</NavLink>
              <NavLink to="/payment-history" className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>Payment History</NavLink>
              <NavLink to="/conversations"   className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>Messages</NavLink>
              <NavLink to="/profile"         className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>My Profile</NavLink>
              {userProfile?.role === 'admin' && (
                <NavLink to="/admin" className={({isActive}) => 'hb-mobile-link' + (isActive ? ' active' : '')} onClick={closeMobile}>Admin</NavLink>
              )}
            </>
          ) : (
            <>
              <NavLink to="/signup" className="hb-mobile-link" onClick={closeMobile}>List your space</NavLink>
              <NavLink to="/login" className="hb-mobile-link" onClick={closeMobile}>Sign In</NavLink>
            </>
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
        <PageSurface><React.Suspense fallback={<div className="hb-auth-loading"><div className="hb-auth-spinner" /></div>}>
        <Routes>
          <Route path="/login" element={<LoginPage setPaymentMessage={setPaymentMessage} />} />
          <Route path="/signup" element={<SignupPage />} />
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
                fetchListings={fetchListings}
              />
            }
          />
          <Route path="/bookings"            element={guard(<StaysDashboard user={user} />)} />
          <Route path="/stays/:bookingId"    element={guard(<StaySpace />)} />
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
        </React.Suspense></PageSurface>

        {/* ── Floating chat ────────────────────────────────── */}
        {user && (
          <div className="hb-floating-actions">
          <Notifications user={user} refresh={notificationRefresh} />
          <Link to="/conversations" className="floating-chat-btn" title="Messages" aria-label="Messages">
            <svg width="21" height="21" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="hb-footer">
          <div className="hb-footer-inner">
            <div className="hb-footer-grid">
              <div>
                <span className="hb-footer-logo">home<em>base</em></span>
                <p className="hb-footer-desc">
                  Find a place that feels like yours. Explore apartments and hostels across Nigeria.
                </p>
              </div>
              <div className="hb-footer-col">
                <h6>Discover</h6>
                <ul>
                  <li><a href="/#listings-section">All stays</a></li>
                  <li><Link to={user ? '/new-listing' : '/signup'}>List your space</Link></li>
                </ul>
              </div>
              <div className="hb-footer-col">
                <h6>Your account</h6>
                <ul>
                  <li><Link to={user ? '/bookings' : '/login'}>My stays</Link></li>
                  <li><Link to={user ? '/conversations' : '/login'}>Messages</Link></li>
                  <li><Link to={user ? '/profile' : '/signup'}>{user ? 'Profile' : 'Create account'}</Link></li>
                </ul>
              </div>
            </div>
            <div className="hb-footer-bottom">
              <span className="hb-footer-copy">© {new Date().getFullYear()} HomeBase. All rights reserved.</span>
              <span className="hb-footer-copy">Made for finding your place.</span>
              <CookieConsent />
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
