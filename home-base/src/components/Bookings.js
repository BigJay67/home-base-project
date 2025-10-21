import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Alert, Button, Badge } from "react-bootstrap";
import { useNavigate } from 'react-router-dom';

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
            
            const response = await fetch(`${backendUrl}/api/bookings?userId=${user.uid}&status=completed`, {
                headers: {
                    'Authorization': user.uid
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            setBookings(data);
        } catch (err) {
            console.error('Error fetching bookings:', err);
            setError('Failed to load bookings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [user, navigate]);

    const getStatusBadge = (status) => {
        const variants = {
            completed: 'success',
            pending: 'warning',
            failed: 'danger',
            cancelled: 'secondary'
        };
        return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
    };

    const formatCurrency = (amount, currency = 'NGN') => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    return (
        <Container className="my-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1>My Bookings</h1>
                    <p className="text-muted">View your completed accommodation bookings</p>
                </div>
                <Button variant="outline-primary" onClick={fetchBookings}>
                    Refresh
                </Button>
            </div>
            
            {loading && <Alert variant="info">Loading your bookings...</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            
            {!loading && !error && bookings.length === 0 && (
                <Alert variant="info">
                    No completed bookings found. Your completed bookings will appear here after successful payments.
                </Alert>
            )}

            <Row>
                {bookings.map((booking) => (
                    <Col key={booking._id} md={6} lg={4} className="mb-4">
                        <Card 
                            className="h-100 booking-card" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/bookings/${booking._id}`)}
                        >
                            <Card.Body className="d-flex flex-column">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <Card.Title className="h6 mb-0 flex-grow-1">
                                        {booking.listingId ? booking.listingId.name : "Deleted Listing"}
                                    </Card.Title>
                                    {getStatusBadge(booking.status)}
                                </div>
                                
                                <div className="card-text flex-grow-1 small">
                                    <div className="mb-2">
                                        <strong>Location:</strong> {booking.listingId ? booking.listingId.location : "N/A"}
                                    </div>
                                    <div className="mb-2">
                                        <strong>Amount:</strong> {formatCurrency(booking.amount)}
                                    </div>
                                    <div className="mb-2">
                                        <strong>Date:</strong> {new Date(booking.createdAt).toLocaleDateString()}
                                    </div>
                                    <div>
                                        <strong>Reference:</strong> 
                                        <code className="ms-1 small">{booking.paymentReference}</code>
                                    </div>
                                </div>
                                
                                <div className="mt-auto pt-3">
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm" 
                                        className="w-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/bookings/${booking._id}`);
                                        }}
                                    >
                                        View Details
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
}

export default Bookings;