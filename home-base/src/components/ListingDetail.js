import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Carousel, Modal, Form } from 'react-bootstrap';
import MessageButton from './MessageButton';

function ListingDetail({ user, handlePayment, parsePrice }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState(new Set());
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id || id === ':id') {
      setError('Invalid listing ID');
      setLoading(false);
      return;
    }
    console.log('ListingDetail useEffect, id:', id);
    fetchListing();
    fetchReviews();
  }, [id]);

  const fetchListing = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://192.168.0.192:5000';
      const url = `${backendUrl}/api/listings/${id}`;
      console.log('Fetching listing, URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('Listing fetched:', data);
      setListing(data);
      setError('');
    } catch (err) {
      console.error('Error fetching listing:', err);
      setError(`Failed to load listing: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://192.168.0.192:5000';
      const url = `${backendUrl}/api/reviews/${id}`;
      console.log('Fetching reviews, URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('Reviews fetched:', data);
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setTotalReviews(data.totalReviews || 0);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const getImageUrl = (image, size = 'original') => {
    if (!image) return null;
    if (typeof image === 'string') return image;
    return image[size] || image.thumbnail || image;
  };

  const handleImageError = (index) => {
    setImageErrors(prev => new Set([...prev, index]));
  };

  const validImages = listing?.images ? listing.images.filter((_, index) => !imageErrors.has(index)) : [];

  const renderRatingStars = (rating, showNumber = false) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="d-flex align-items-center">
        <div className="d-flex">
          {[...Array(fullStars)].map((_, i) => (
            <span key={`full-${i}`} className="text-warning">★</span>
          ))}
          {hasHalfStar && <span className="text-warning">★</span>}
          {[...Array(emptyStars)].map((_, i) => (
            <span key={`empty-${i}`} className="text-muted">★</span>
          ))}
        </div>
        {showNumber && (
          <span className="ms-1 fw-bold">{rating.toFixed(1)}</span>
        )}
      </div>
    );
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setSubmittingReview(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://192.168.0.192:5000';
      const response = await fetch(`${backendUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId: id,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchReviews();
      setShowReviewModal(false);
      setReviewForm({ rating: 5, comment: '' });
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(`Failed to submit review: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
        <p className="mt-2">Loading listing details...</p>
      </Container>
    );
  }

  if (error || !listing) {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          {error || 'Listing not found'}
        </Alert>
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to Listings
        </Button>
      </Container>
    );
  }

  return (
    <Container className="my-4 my-md-5">
      <div className="d-flex align-items-center mb-4">
        <Button 
          variant="outline-secondary" 
          onClick={() => navigate('/')}
          className="me-3"
        >
          ← Back to Listings
        </Button>
        <div>
          <h1 className="h3 mb-1">{listing.name}</h1>
          <div className="d-flex align-items-center">
            <Badge bg="secondary" className="me-2">
              {listing.type}
            </Badge>
            {averageRating > 0 && (
              <div className="d-flex align-items-center">
                {renderRatingStars(averageRating, true)}
                <small className="text-muted ms-1">
                  ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
                </small>
              </div>
            )}
          </div>
        </div>
      </div>

      <Row>
        <Col lg={8}>
          {validImages.length > 0 ? (
            <Carousel 
              activeIndex={currentImageIndex} 
              onSelect={setCurrentImageIndex}
              indicators={validImages.length > 1}
              controls={validImages.length > 1}
              interval={null}
              className="mb-4"
            >
              {validImages.map((image, index) => (
                <Carousel.Item key={index}>
                  <div style={{ height: '400px', overflow: 'hidden', borderRadius: '0.375rem' }}>
                    <img
                      src={getImageUrl(image)}
                      alt={`${listing.name} - Image ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: imageLoaded ? 'block' : 'none'
                      }}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => handleImageError(index)}
                    />
                    {!imageLoaded && (
                      <div 
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#f8f9fa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '0.375rem'
                        }}
                      >
                        <Spinner animation="border" />
                      </div>
                    )}
                  </div>
                </Carousel.Item>
              ))}
            </Carousel>
          ) : (
            <div 
              style={{ 
                height: '400px', 
                backgroundColor: '#f8f9fa', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderRadius: '0.375rem'
              }}
              className="mb-4"
            >
              <span className="text-muted">No images available</span>
            </div>
          )}

          <Card className="mb-4">
            <Card.Body>
              <h5 className="mb-3">Description</h5>
              <Row>
                <Col md={6}>
                  <p><strong>Location:</strong> {listing.location}</p>
                  {listing.distance && (
                    <p><strong>Distance:</strong> {listing.distance}</p>
                  )}
                  {listing.payment && (
                    <p><strong>Payment Terms:</strong> {listing.payment}</p>
                  )}
                </Col>
                <Col md={6}>
                  {listing.amenities && listing.amenities.length > 0 && (
                    <div>
                      <strong>Amenities:</strong>
                      <ul className="mb-0 mt-2">
                        {listing.amenities.map((amenity, index) => (
                          <li key={index}>{amenity}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  Reviews {averageRating > 0 && `(${totalReviews})`}
                </h5>
                {user && (
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => setShowReviewModal(true)}
                  >
                    Write a Review
                  </Button>
                )}
              </div>

              {averageRating === 0 ? (
                <div className="text-center py-4 text-muted">
                  <p>No reviews yet. Be the first to review this property!</p>
                  {!user && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => navigate('/login')}
                    >
                      Log In to Review
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="d-flex align-items-center mb-2">
                      {renderRatingStars(averageRating, true)}
                    </div>
                    <p className="text-muted mb-0">
                      Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {displayedReviews.map((review, index) => (
                      <div key={index} className="border-bottom pb-3 mb-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <strong>{review.userName || review.userEmail}</strong>
                            <div className="mt-1">
                              {renderRatingStars(review.rating)}
                            </div>
                          </div>
                          <small className="text-muted">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </small>
                        </div>
                        <p className="mb-0">{review.comment}</p>
                      </div>
                    ))}
                  </div>

                  {reviews.length > 3 && (
                    <div className="text-center">
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => setShowAllReviews(!showAllReviews)}
                      >
                        {showAllReviews ? 'Show Less' : `Show All ${reviews.length} Reviews`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="sticky-top" style={{ top: '20px' }}>
            <Card.Body>
              <div className="text-center mb-4">
                <h4 className="text-primary">{listing.price}</h4>
                <p className="text-muted mb-0">{parsePrice(listing.price)}</p>
              </div>

              <div className="d-grid gap-2">
                {user ? (
                  user.uid === listing.createdBy ? (
                    <Alert variant="info" className="text-center mb-0">
                      <small>This is your listing</small>
                    </Alert>
                  ) : (
                    <>
                      <Button 
                        variant="primary" 
                        size="lg"
                        onClick={() => handlePayment(listing._id, parsePrice(listing.price))}

                      >
                        Book Now
                      </Button>
                      <MessageButton 
                        listing={listing}
                        user={user}
                        variant="outline-primary"
                        size="lg"
                      />
                    </>
                  )
                ) : (
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={() => navigate('/login')}
                  >
                    Log In to Book
                  </Button>
                )}
              </div>

              <div className="mt-4">
                <h6>Property Details</h6>
                <div className="small">
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span>Type:</span>
                    <span className="text-capitalize">{listing.type}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span>Location:</span>
                    <span>{listing.location}</span>
                  </div>
                  {listing.distance && (
                    <div className="d-flex justify-content-between py-1 border-bottom">
                      <span>Distance:</span>
                      <span>{listing.distance}</span>
                    </div>
                  )}
                  {listing.payment && (
                    <div className="d-flex justify-content-between py-1 border-bottom">
                      <span>Payment Terms:</span>
                      <span>{listing.payment}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Write a Review</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleReviewSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Rating</Form.Label>
              <div>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    type="button"
                    variant={star <= reviewForm.rating ? 'warning' : 'outline-secondary'}
                    size="sm"
                    className="me-1"
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  >
                    ★
                  </Button>
                ))}
              </div>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                placeholder="Share your experience with this property..."
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowReviewModal(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={submittingReview}
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default ListingDetail;