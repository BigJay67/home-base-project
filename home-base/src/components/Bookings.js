import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Alert, Button, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import './Bookings.css';

function Bookings({ user }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBookings = async () => {
    if (!user) {
      navigate('/');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/bookings?userId=${user.uid}`, {
        headers: { Authorization: user.uid }
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setBookings(data.filter(booking => booking.status === 'completed'));
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, navigate, fetchBookings]);

  const getStatusBadge = (status) => {
    const variants = { completed: 'success', pending: 'warning', failed: 'danger', cancelled: 'secondary' };
    return <Badge bg={variants[status] || 'secondary'} className="text-uppercase fw-semibold">{status}</Badge>;
  };

  const formatCurrency = (amount, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <Container className="my-5 text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading your bookings...</p>
      </Container>
    );
  }

  if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;

  if (bookings.length === 0) {
    return (
      <Container className="my-5 text-center py-5">
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted mb-3">
            <path d="M3 3h18v18H3z" strokeWidth="1.5" />
            <path d="M9 9h6m-6 4h6m-6 4h4" strokeWidth="1.5" />
          </svg>
          <h4>No bookings yet</h4>
          <p className="text-muted">Your completed stays will appear here after payment.</p>
          <Button variant="primary" onClick={() => navigate('/')}>Explore Listings</Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h1 className="fw-bold">My Bookings</h1>
          <p className="text-muted">View all your confirmed stays</p>
        </div>
        <Button variant="outline-primary" size="sm" onClick={fetchBookings} className="d-flex align-items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M4 4v5h5m10 10v-5h-5m-9 9h18" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Refresh
        </Button>
      </div>

      <Row xs={1} md={2} lg={3} className="g-4">
        {bookings.map((booking) => {
          const listing = booking.listingId || {};
          return (
            <Col key={booking._id}>
              <Card
                className="booking-card h-100 border-0 shadow-sm"
                onClick={() => navigate(`/bookings/${booking._id}`)}
              >
                <Card.Body className="d-flex flex-column p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h6 className="fw-bold text-truncate mb-0 flex-grow-1">
                      {listing.name || 'Deleted Listing'}
                    </h6>
                    {getStatusBadge(booking.status)}
                  </div>

                  <p className="text-muted small mb-3">{listing.location || 'N/A'}</p>

                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="h6 fw-bold text-primary mb-0">
                        {formatCurrency(booking.amount)}
                      </span>
                      <small className="text-muted">{formatDate(booking.createdAt)}</small>
                    </div>

                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="flex-fill"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bookings/${booking._id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
}

export default Bookings;