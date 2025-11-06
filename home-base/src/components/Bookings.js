import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Card, Alert, Button, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import './Bookings.css';

function Bookings({ user }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBookings = useCallback(async () => {
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
  }, [user, navigate]);

  useEffect(() => {
    fetchBookings();
  }, [user, fetchBookings]); 

  const formatCurrency = (amount, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger',
      cancelled: 'secondary',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  const listingsMap = bookings.reduce((acc, booking) => {
    if (booking.listingId) {
      acc[booking.listingId._id] = booking.listingId;
    }
    return acc;
  }, {});

  if (!user) {
    return <Container className="my-5"><Alert variant="info">Redirecting to home...</Alert></Container>;
  }

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading your bookings...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  const completedBookings = bookings.filter(b => b.status === 'completed');

  return (
    <Container className="my-4 my-md-5">
      <h1 className="h3 mb-4">My Bookings</h1>

      {completedBookings.length === 0 ? (
        <Alert variant="info" className="text-center py-5">
          <h4 className="alert-heading">No Completed Bookings Found!</h4>
          <p>Once you book a property and the payment is complete, it will appear here.</p>
          <Button variant="primary" onClick={() => navigate('/')}>Find a Property</Button>
        </Alert>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {completedBookings.map(booking => {
            const listing = listingsMap[booking.listingId._id] || {};
            const listingImage = listing.images?.[0] || 'default-image-url';

            return (
              <Col key={booking._id}>
                <Card
                  className="h-100 shadow-sm booking-card"
                  onClick={() => navigate(`/bookings/${booking._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <Card.Body className="d-flex flex-column">
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
      )}
    </Container>
  );
}

export default Bookings;