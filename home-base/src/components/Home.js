import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert, Form, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import ListingCard from './ListingCard';
import ReviewModal from './ReviewModal';

function Home({ user, listings, error, loading, typeFilter, setTypeFilter, locationFilter, setLocationFilter, maxPriceFilter, setMaxPriceFilter, paymentMessage, setPaymentMessage, handleSearch, handlePayment, parsePrice, fetchListings, minRatingFilter, setMinRatingFilter, reviewKeywordFilter, setReviewKeywordFilter, handleSignOut }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editImages, setEditImages] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const navigate = useNavigate();

  const validateImageUrl = (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleEdit = (listing) => {
    setEditingListing(listing);
    setEditFormData({
      type: listing.type,
      name: listing.name,
      price: listing.price,
      priceValue: listing.priceValue.toString(),
      location: listing.location,
      amenities: listing.amenities.join(', '),
      distance: listing.distance || '',
      payment: listing.payment || '',
    });
    setEditImages(listing.images || []);
    setShowEditModal(true);
  };

  const handleEditImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      setPaymentMessage('Maximum 5 images allowed.');
      return;
    }
    
    const imagePromises = files.map((file) => {
      if (file.size > 1024 * 1024) {
        setPaymentMessage('Each image must be smaller than 1MB.');
        return null;
      }
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => {
          setPaymentMessage('Failed to read image file.');
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    }).filter(Boolean);

    Promise.all(imagePromises).then((newImageData) => {
      const existingImages = editImages.filter(img => 
        typeof img === 'string' && !img.startsWith('data:image/')
      );
      const allImages = [...existingImages, ...newImageData.filter(img => img !== null)];
      setEditImages(allImages);
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!user || !editingListing) return;
    
    setEditLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const newBase64Images = editImages.filter(img => 
        typeof img === 'string' && img.startsWith('data:image/')
      );
      
      const updateData = {
        type: editFormData.type,
        name: editFormData.name,
        price: editFormData.price,
        priceValue: parseInt(editFormData.priceValue) || 0,
        location: editFormData.location,
        amenities: editFormData.amenities.split(',').map(item => item.trim()).filter(Boolean),
        distance: editFormData.distance,
        payment: editFormData.payment,
        images: newBase64Images,
        userId: user.uid,
      };

      const response = await fetch(`${backendUrl}/api/listings/${editingListing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': user.uid },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        } catch (jsonErr) {
          console.error('Non-JSON response:', text);
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
      }
      
      setPaymentMessage('Listing updated successfully!');
      setShowEditModal(false);
      fetchListings();
    } catch (err) {
      console.error('Error updating listing:', err);
      setPaymentMessage('Failed to update listing: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/listings/${listingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': user.uid },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (!response.ok) {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        } catch (jsonErr) {
          console.error('Non-JSON response:', text);
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
      }
      setPaymentMessage('Listing deleted successfully!');
      fetchListings();
    } catch (err) {
      console.error('Error deleting listing:', err);
      setPaymentMessage('Failed to delete listing: ' + err.message);
    }
  };

  const removeImage = (index) => {
    const newImages = [...editImages];
    newImages.splice(index, 1);
    setEditImages(newImages);
  };

  const handleReviewSubmit = async (reviewData) => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': user.uid },
      body: JSON.stringify({
        ...reviewData,
        userId: user.uid,
        userEmail: user.email
      }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || 'Failed to submit review');
      } catch (jsonErr) {
        console.error('Non-JSON response:', text);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    }
    
    return response.json();
  };

  return (
    <Container className="my-4 my-md-5">
      <h1 className="h3 h-md-1">Home Base</h1>
      <div className="mb-4">
        {user ? (
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h5 className="mb-1">Welcome, {user.displayName || user.email}! </h5>
              <p className="text-muted mb-0">Ready to find your perfect accommodation?</p>
            </div>
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={handleSignOut}
            >
              Log Out
            </Button>
          </div>
        ) : (
          <div className="text-center py-3">
            <h5>Find Your Perfect Accommodation 🏠</h5>
            <p className="text-muted mb-3">
              Browse listings or log in to book properties and message hosts
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <Button 
                variant="primary" 
                onClick={() => navigate('/login')}
              >
                Log In to Book
              </Button>
              <Button 
                variant="outline-primary" 
                onClick={() => navigate('/login')}
              >
                Create Account
              </Button>
            </div>
          </div>
        )}
      </div>
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row className="g-2">
              <Col xs={6} md={3}>
                <Form.Select 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value)}
                  size="sm"
                >
                  <option value="">All Types</option>
                  <option value="hostel">Hostel</option>
                  <option value="apartment">Apartment</option>
                </Form.Select>
              </Col>
              <Col xs={6} md={3}>
                <Form.Control
                  type="text"
                  placeholder="Location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  size="sm"
                />
              </Col>
              <Col xs={6} md={2}>
                <Form.Control
                  type="number"
                  placeholder="Max Price"
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(e.target.value)}
                  size="sm"
                />
              </Col>
              <Col xs={6} md={2}>
                <Form.Control
                  type="number"
                  placeholder="Min Rating"
                  min="1"
                  max="5"
                  step="0.1"
                  value={minRatingFilter}
                  onChange={(e) => setMinRatingFilter(e.target.value)}
                  size="sm"
                />
              </Col>
              <Col xs={12} md={2}>
                <Button variant="primary" type="submit" className="w-100" size="sm">
                  <span className="d-none d-md-inline">Search</span>
                  <span className="d-md-none">🔍</span>
                </Button>
              </Col>
            </Row>
            <div className="mt-2">
              <Form.Control
                type="text"
                placeholder="Review keyword..."
                value={reviewKeywordFilter}
                onChange={(e) => setReviewKeywordFilter(e.target.value)}
                size="sm"
              />
            </div>
          </Form>
        </Card.Body>
      </Card>
      {paymentMessage && (
        <Alert variant="warning" className="py-2">
          <small>{paymentMessage}</small>
        </Alert>
      )}
      {loading && (
        <Alert variant="info" className="py-2 text-center">
          <small>Loading listings...</small>
        </Alert>
      )}
      {error && (
        <Alert variant="danger" className="py-2">
          <small>{error}</small>
        </Alert>
      )}
      {!loading && !error && listings.length === 0 && (
        <Alert variant="warning" className="py-2 text-center">
          <small>No listings found.</small>
        </Alert>
      )}
      <Row>
        {listings.map((listing) => (
          <Col xs={12} sm={6} lg={4} key={listing._id} className="mb-3">
            <ListingCard
              listing={listing}
              user={user}
              handlePayment={handlePayment}
              parsePrice={parsePrice}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
            />
          </Col>
        ))}
      </Row>
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Edit Listing</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Type *</Form.Label>
              <Form.Control as="select" value={editFormData.type} onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })} required>
                <option value="hostel">Hostel</option>
                <option value="apartment">Apartment</option>
              </Form.Control>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Price *</Form.Label>
              <Form.Control type="text" value={editFormData.price} onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Price Value *</Form.Label>
              <Form.Control type="number" value={editFormData.priceValue} onChange={(e) => setEditFormData({ ...editFormData, priceValue: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Location *</Form.Label>
              <Form.Control type="text" value={editFormData.location} onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Amenities</Form.Label>
              <Form.Control type="text" value={editFormData.amenities} onChange={(e) => setEditFormData({ ...editFormData, amenities: e.target.value })} placeholder="WiFi, Parking, Kitchen" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Distance</Form.Label>
              <Form.Control type="text" value={editFormData.distance} onChange={(e) => setEditFormData({ ...editFormData, distance: e.target.value })} placeholder="2km from UNIOSUN" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Payment Terms</Form.Label>
              <Form.Control type="text" value={editFormData.payment} onChange={(e) => setEditFormData({ ...editFormData, payment: e.target.value })} placeholder="Monthly, Quarterly" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Images</Form.Label>
              <Form.Control type="file" accept="image/*" multiple onChange={handleEditImageChange} />
              <Form.Text className="text-muted">Current images: {editImages.length}</Form.Text>
              {editImages.length > 0 && (
                <div className="mt-2">
                  <h6>Image Previews:</h6>
                  <Row>
                    {editImages.map((image, index) => (
                      <Col key={index} xs={4} className="mb-2 position-relative">
                        <img src={image} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                        <Button variant="danger" size="sm" className="position-absolute top-0 end-0" onClick={() => removeImage(index)} style={{ transform: 'translate(50%, -50%)' }}>×</Button>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Form.Group>
            <Button variant="primary" type="submit" disabled={editLoading}>
              {editLoading ? 'Updating...' : 'Update Listing'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <ReviewModal 
        show={showReviewModal && selectedListing !== null} 
        onHide={() => setShowReviewModal(false)} 
        listing={selectedListing} 
        user={user} 
        onSubmit={handleReviewSubmit} />
    </Container>
  );
}

export default Home;