import React, { useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { Container, Navbar, Nav, NavDropdown } from 'react-bootstrap';
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

function App() {
  const [notificationRefresh, setNotificationRefresh] = useState(0);
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
    minRatingFilter,
    setMinRatingFilter,
    reviewKeywordFilter,
    setReviewKeywordFilter,
    fetchListings
  } = useListings();
  
  const {
    user,
    userProfile,
    paymentMessage,
    setPaymentMessage,
    refreshUserProfile,
    handleSignOut
  } = useAuth();
  
  const { handlePayment, parsePrice } = usePayment(user, setPaymentMessage);
  
  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };
  
  const refreshNotifications = useCallback(() => {
    setNotificationRefresh(prev => prev + 1);
  }, []);

  return (
    <SocketProvider user={user}>
      <Router>
        <Navbar bg="light" expand="lg" className="mb-4" collapseOnSelect>
          <Container fluid>
            <Navbar.Brand as={Link} to="/" className="fw-bold me-4">
              <span className="d-none d-sm-inline">Home Base</span>
              <span className="d-sm-none">🏠 HomeBase</span>
            </Navbar.Brand>
            <Navbar.Toggle 
              aria-controls="basic-navbar-nav" 
              className="border-0"
              style={{ padding: '4px 8px' }}
            >
              <span className="navbar-toggler-icon"></span>
            </Navbar.Toggle>
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto mb-2 mb-lg-0">
                {user && (
                  <>
                    <Nav.Link 
                      as={NavLink} 
                      to="/bookings" 
                      className="text-nowrap mx-2 my-1 my-lg-0"
                      style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}
                    >
                      <span className="d-lg-none me-2">📅</span>
                      My Bookings
                    </Nav.Link>
                    <Nav.Link 
                      as={NavLink} 
                      to="/new-listing" 
                      className="text-nowrap mx-2 my-1 my-lg-0"
                      style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}
                    >
                      <span className="d-lg-none me-2">➕</span>
                      Create Listing
                    </Nav.Link>
                    <Nav.Link 
                      as={NavLink} 
                      to="/conversations" 
                      className="text-nowrap mx-2 my-1 my-lg-0"
                      style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}
                    >
                      <span className="d-lg-none me-2">💬</span>
                      My Messages
                    </Nav.Link>
                    {userProfile?.role === 'admin' && (
                      <Nav.Link 
                        as={NavLink} 
                        to="/admin" 
                        className="text-nowrap mx-2 my-1 my-lg-0"
                        style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}
                      >
                        <span className="d-lg-none me-2">⚙️</span>
                        Admin
                      </Nav.Link>
                    )}
                    <Nav.Link 
                      as={NavLink} 
                      to="/payment-history" 
                      className="text-nowrap mx-2 my-1 my-lg-0"
                      style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}
                    >
                      <span className="d-lg-none me-2">🧾</span>
                      Payment History
                    </Nav.Link>
                  </>
                )}
              </Nav>
              <Nav className="align-items-center flex-row">
                {user && (
                  <div className="d-flex align-items-center me-3">
                    <Notifications user={user} refresh={notificationRefresh} />
                  </div>
                )}
                {user ? (
                  <NavDropdown 
                    title={
                      <div className="d-flex align-items-center">
                        <ProfileAvatar user={user} userProfile={userProfile} size={36} />
                        <span className="ms-2 d-none d-lg-inline text-dark">
                          {user.displayName || user.email}
                        </span>
                        <i className="ms-1 d-none d-lg-inline small">▼</i>
                      </div>
                    } 
                    id="user-dropdown"
                    align="end"
                    className="dropdown-menu-end"
                    style={{ minWidth: '200px' }}
                  >
                    <NavDropdown.Item 
                      as={NavLink} 
                      to="/profile"
                      className="d-flex align-items-center py-2"
                    >
                      <span className="me-2">👤</span>
                      <span>My Profile</span>
                    </NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item 
                      onClick={handleSignOut}
                      className="d-flex align-items-center py-2 text-danger"
                    >
                      <span className="me-2">🚪</span>
                      <span>Log Out</span>
                    </NavDropdown.Item>
                  </NavDropdown>
                ) : (
                  <Nav.Item>
                    <NavLink 
                      to="/login" 
                      className="nav-link text-nowrap btn btn-outline-primary mx-2"
                      style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}
                    >
                      <span className="d-lg-none me-2">🔐</span>
                      Login
                    </NavLink>
                  </Nav.Item>
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
                minRatingFilter={minRatingFilter}
                setMinRatingFilter={setMinRatingFilter}
                reviewKeywordFilter={reviewKeywordFilter}
                setReviewKeywordFilter={setReviewKeywordFilter}
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
          <Route 
            path="/conversation/:id" 
            element={<ConversationDetail user={user} onMessageSent={refreshNotifications} />} 
          />
          <Route path="/payment-history" element={<PaymentHistory user={user} />} />
          <Route path="/bookings/:id" element={<BookingDetail user={user} />} />
          <Route path="/admin/users/:userId" element={<UserDetail user={user} />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;