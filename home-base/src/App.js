import React, { useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { Container, Navbar, Nav, NavDropdown } from 'react-bootstrap';
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
    fetchListings,
  } = useListings();
  const { user, userProfile, paymentMessage, setPaymentMessage, refreshUserProfile, handleSignOut } =
    useAuth();
  const { handlePayment, parsePrice } = usePayment(user, setPaymentMessage);

  const handleSearch = e => {
    e.preventDefault();
    fetchListings();
  };

  const refreshNotifications = useCallback(() => {
    setNotificationRefresh(prev => prev + 1);
  }, []);

  return (
    <SocketProvider user={user}>
      <Router>
        <Navbar bg="light" expand="lg" className="mb-4 shadow-sm" collapseOnSelect>
          <Container fluid>
            <Navbar.Brand as={Link} to="/" className="fw-bold me-4">
              <span className="d-none d-sm-inline">Home Base</span>
              <span className="d-sm-none">🏠 HomeBase</span>
            </Navbar.Brand>
            <Navbar.Toggle
              aria-controls="basic-navbar-nav"
              className="border-0 rounded-circle p-2 d-lg-none"
              style={{
                backgroundColor: '#f8f9fa',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                className="navbar-toggler-icon"
                style={{
                  backgroundImage:
                    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 30 30%27%3E%3Cpath stroke=%27%23000%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-miterlimit=%2710%27 d=%27M4 7h22M4 15h22M4 23h22%27/%3E%3C/svg%3E")',
                }}
              ></span>
            </Navbar.Toggle>
            <Navbar.Collapse id="basic-navbar-nav" className="mt-2 mt-lg-0">
              <Nav className="me-auto mb-2 mb-lg-0">
                {user && (
                  <>
                    <Nav.Link
                      as={NavLink}
                      to="/bookings"
                      className={({ isActive }) =>
                        `text-nowrap mx-2 my-1 my-lg-0 rounded ${isActive ? 'bg-primary text-white' : ''}`
                      }
                      style={{
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <span className="d-lg-none me-2">📅</span>
                      My Bookings
                    </Nav.Link>
                    <Nav.Link
                      as={NavLink}
                      to="/new-listing"
                      className={({ isActive }) =>
                        `text-nowrap mx-2 my-1 my-lg-0 rounded ${isActive ? 'bg-primary text-white' : ''}`
                      }
                      style={{
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <span className="d-lg-none me-2">➕</span>
                      Create Listing
                    </Nav.Link>
                    <Nav.Link
                      as={NavLink}
                      to="/conversations"
                      className={({ isActive }) =>
                        `text-nowrap mx-2 my-1 my-lg-0 rounded ${isActive ? 'bg-primary text-white' : ''}`
                      }
                      style={{
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <span className="d-lg-none me-2">💬</span>
                      My Messages
                    </Nav.Link>
                    {userProfile?.role === 'admin' && (
                      <Nav.Link
                        as={NavLink}
                        to="/admin"
                        className={({ isActive }) =>
                          `text-nowrap mx-2 my-1 my-lg-0 rounded ${isActive ? 'bg-primary text-white' : ''}`
                        }
                        style={{
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <span className="d-lg-none me-2">⚙️</span>
                        Admin
                      </Nav.Link>
                    )}
                    <Nav.Link
                      as={NavLink}
                      to="/payment-history"
                      className={({ isActive }) =>
                        `text-nowrap mx-2 my-1 my-lg-0 rounded ${isActive ? 'bg-primary text-white' : ''}`
                      }
                      style={{
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        transition: 'background-color 0.2s ease',
                      }}
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
                      <div
                        className="d-flex align-items-center bg-light rounded p-1"
                        style={{ transition: 'background-color 0.2s ease' }}
                      >
                        <ProfileAvatar user={user} userProfile={userProfile} size={32} />
                        <span
                          className="ms-2 text-dark text-truncate"
                          style={{ maxWidth: '150px', fontSize: '0.9rem' }}
                        >
                          {user.displayName || user.email || 'User'}
                        </span>
                        <ChevronDown size={16} className="ms-1 text-muted" />
                      </div>
                    }
                    id="user-dropdown"
                    align="end"
                    className="dropdown-menu-end"
                    style={{ minWidth: '200px' }}
                    renderMenuOnMount={true}
                  >
                    <NavDropdown.Item
                      as={NavLink}
                      to="/profile"
                      className="d-flex align-items-center py-2"
                    >
                      <span>My Profile</span>
                    </NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item
                      onClick={handleSignOut}
                      className="d-flex align-items-center py-2 text-danger"
                    >
                      <span>Log Out</span>
                    </NavDropdown.Item>
                  </NavDropdown>
                ) : (
                  <Nav.Item>
                    <NavLink
                      to="/login"
                      className={({ isActive }) =>
                        `nav-link text-nowrap btn btn-outline-primary mx-2 rounded ${
                          isActive ? 'bg-primary text-white' : ''
                        }`
                      }
                      style={{
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        transition: 'background-color 0.2s ease',
                      }}
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
          <Route
            path="/listing/:id"
            element={<ListingDetail user={user} handlePayment={handlePayment} parsePrice={parsePrice} />}
          />
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
          <Route path="/listings" element={<UserListings user={user} />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;