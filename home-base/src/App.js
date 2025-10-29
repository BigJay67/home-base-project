import React, { useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { Container, Navbar, Nav, NavDropdown, Button } from 'react-bootstrap';
import { ChevronDown } from 'react-feather';
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
import useListings from './hooks/useListings';
import useAuth from './hooks/useAuth';
import usePayment from './hooks/usePayment';
import './styles/mobile.css';
import './styles/responsive.css';
import ProfileAvatar from './components/ProfileAvatar';
import UserListings from './components/UserListings';
import './styles/Navbar.css';

function App() {
  const [notificationRefresh, setNotificationRefresh] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const {
    listings,
    error,
    loading,
    typeFilter,
    setTypeFilter,
    locationFilter,
    setLocationFilter,
    maxPriceFilter,
    setMaxPriceFilter,
    fetchListings,
  } = useListings();
  const { user, userProfile, paymentMessage, setPaymentMessage, refreshUserProfile, handleSignOut } = useAuth();
  const { handlePayment, parsePrice } = usePayment(user, setPaymentMessage);
  const handleSearch = e => {
    e.preventDefault();
    fetchListings();
  };
  const refreshNotifications = useCallback(() => {
    setNotificationRefresh(prev => prev + 1);
  }, []);
  const closeNavbar = () => setExpanded(false);

  return (
    <SocketProvider user={user}>
      <Router>
        <Navbar bg="white" expand="lg" expanded={expanded} onToggle={setExpanded} className="border-bottom shadow-sm py-2">
          <Container fluid>
            <Navbar.Brand as={Link} to="/" className="fw-bold text-primary fs-4">
              HomeBase
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="main-nav" className="border-0 p-2" />
            <Navbar.Collapse id="main-nav">
              <Nav className="mx-auto align-items-lg-center gap-2 gap-lg-4 flex-grow-1 justify-content-center">
                {user && (
                  <>
                    <Nav.Link as={NavLink} to="/bookings" onClick={closeNavbar} className="nav-link-lg">Bookings</Nav.Link>
                    <Nav.Link as={NavLink} to="/new-listing" onClick={closeNavbar} className="nav-link-lg">Host</Nav.Link>
                    <Nav.Link as={NavLink} to="/conversations" onClick={closeNavbar} className="nav-link-lg">Messages</Nav.Link>
                    {userProfile?.role === 'admin' && (
                      <Nav.Link as={NavLink} to="/admin" onClick={closeNavbar} className="nav-link-lg">Admin</Nav.Link>
                    )}
                    <Nav.Link as={NavLink} to="/payment-history" onClick={closeNavbar} className="nav-link-lg">History</Nav.Link>
                  </>
                )}
              </Nav>
              <Nav className="align-items-center gap-3">
                {user && (
                  <div className="d-flex align-items-center">
                    <Notifications user={user} refresh={notificationRefresh} />
                  </div>
                )}
                {user ? (
                  <NavDropdown
                    title={
                      <div className="d-flex align-items-center bg-light rounded-pill px-3 py-1 shadow-sm">
                        <ProfileAvatar user={user} userProfile={userProfile} size={32} />
                        <span className="ms-2 text-dark fw-medium text-truncate" style={{ maxWidth: '120px' }}>
                          {user.displayName || user.email.split('@')[0]}
                        </span>
                        <ChevronDown size={16} className="ms-1 text-muted" />
                      </div>
                    }
                    id="user-menu"
                    align="end"
                    className="dropdown-menu-end"
                  >
                    <NavDropdown.Item as={NavLink} to="/profile" onClick={closeNavbar}>My Profile</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={() => { handleSignOut(); closeNavbar(); }} className="text-danger">Log Out</NavDropdown.Item>
                  </NavDropdown>
                ) : (
                  <Button variant="outline-primary" size="sm" as={NavLink} to="/login" onClick={closeNavbar} className="rounded-pill px-4">
                    Login
                  </Button>
                )}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
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
                paymentMessage={paymentMessage}
                setPaymentMessage={setPaymentMessage}
                handleSearch={handleSearch}
                handlePayment={handlePayment}
                parsePrice={parsePrice}
                fetchListings={fetchListings}
                handleSignOut={handleSignOut}
              />
            }
          />
          <Route path="/bookings" element={<Bookings user={user} />} />
          <Route path="/payment-callback" element={<PaymentCallback />} />
          <Route path="/new-listing" element={<NewListing user={user} />} />
          <Route path="/profile" element={<Profile user={user} onProfileUpdate={refreshUserProfile} />} />
          <Route path="/listing/:id" element={<ListingDetail user={user} handlePayment={handlePayment} parsePrice={parsePrice} />} />
          <Route path="/listings/:id" element={<Navigate to="/listing/:id" replace />} />
          <Route path="/admin" element={<AdminDashboard user={user} />} />
          <Route path="/conversations" element={<Conversations user={user} />} />
          <Route path="/conversation/:id" element={<ConversationDetail user={user} onMessageSent={refreshNotifications} />} />
          <Route path="/payment-history" element={<PaymentHistory user={user} />} />
          <Route path="/bookings/:id" element={<BookingDetail user={user} />} />
          <Route path="/admin/users/:userId" element={<UserDetail user={user} />} />
          <Route path="/listings" element={<UserListings user={user} />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}
export default App;