import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Alert, Spinner, Form } from 'react-bootstrap';

function UserListings({ user }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingListing, setEditingListing] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newImages, setNewImages] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);

  const fetchUserListings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/listings?createdBy=${user.uid}`, {
        headers: {
          'Authorization': user.uid
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }
      const data = await response.json();
      const userListings = data.filter(listing => listing.createdBy === user.uid);
      setListings(userListings);
    } catch (err) {
      console.error('Error fetching user listings:', err);
      setError('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserListings();
  }, [fetchUserListings]);

  const handleStatusChange = async (listingId, newStatus) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/listings/${listingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user.uid
        },
        body: JSON.stringify({ status: newStatus, userId: user.uid })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      fetchUserListings();
    } catch (err) {
      console.error('Error updating listing status:', err);
      alert('Failed to update listing status: ' + err.message);
    }
  };

  const handleEdit = (listing) => {
    if (listing.createdBy !== user.uid) {
      alert('You can only edit your own listings');
      return;
    }
    setEditingListing(listing);
    setEditForm({
      name: listing.name,
      description: listing.description || '',
      price: listing.price,
      location: listing.location,
      type: listing.type,
      amenities: listing.amenities ? listing.amenities.join(', ') : ''
    });
    setNewImages([]);
    setImagesToRemove([]);
    setShowEditModal(true);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + (editingListing.images.length - imagesToRemove.length) > 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    const newImageUrls = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(newImageUrls).then(urls => {
      setNewImages(urls);
    });
  };

  const toggleImageRemoval = (index) => {
    setImagesToRemove(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingListing || editingListing.createdBy !== user.uid) {
      alert('You can only edit your own listings');
      return;
    }

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/listings/${editingListing._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user.uid
        },
        body: JSON.stringify({
          ...editForm,
          amenities: editForm.amenities.split(',').map(a => a.trim()).filter(Boolean),
          images: newImages,
          imagesToRemove,
          userId: user.uid
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update listing');
      }
      setShowEditModal(false);
      setEditingListing(null);
      setNewImages([]);
      setImagesToRemove([]);
      fetchUserListings();
    } catch (err) {
      console.error('Error updating listing:', err);
      alert('Failed to update listing: ' + err.message);
    }
  };

  const handleDelete = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user.uid
        },
        body: JSON.stringify({ userId: user.uid })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete listing');
      }
      fetchUserListings();
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert('Failed to delete listing: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
        <p>Loading your listings...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          {error}
        </Alert>
        <Button variant="primary" onClick={fetchUserListings}>
          Try Again
        </Button>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>My Listings</h2>
        <Button variant="success" onClick={() => window.location.href = '/new-listing'}>
          Create New Listing
        </Button>
      </div>

      {listings.length === 0 ? (
        <Card className="text-center">
          <Card.Body>
            <p>You haven't created any listings yet.</p>
            <Button variant="primary" onClick={() => window.location.href = '/new-listing'}>
              Create Your First Listing
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {listings.map((listing) => (
            <Col md={6} lg={4} key={listing._id} className="mb-4">
              <Card className="h-100">
                {listing.images && listing.images.length > 0 && (
                  <Card.Img 
                    variant="top" 
                    src={listing.images[0].thumbnail || listing.images[0]} 
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                )}
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title className="h6 mb-1">{listing.name}</Card.Title>
                    <Badge bg={listing.status === 'active' ? 'success' : 'warning'}>
                      {listing.status}
                    </Badge>
                  </div>
                  
                  <div className="mb-2">
                    <small className="text-muted">
                      {listing.location}
                    </small>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0 text-primary">{listing.price}</h6>
                    <span className="text-muted small">
                      {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <Button variant="primary" size="sm" onClick={() => handleEdit(listing)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(listing._id)}>
                      Delete
                    </Button>
                    <Button 
                      variant={listing.status === 'active' ? 'outline-warning' : 'outline-success'} 
                      size="sm" 
                      onClick={() => handleStatusChange(listing._id, listing.status === 'active' ? 'inactive' : 'active')}
                    >
                      {listing.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Listing</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleEditSubmit}>
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={editForm.name} 
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                required 
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label">Price</label>
              <input 
                type="text" 
                className="form-control" 
                value={editForm.price} 
                onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                required 
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label">Location</label>
              <input 
                type="text" 
                className="form-control" 
                value={editForm.location} 
                onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                required 
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label">Type</label>
              <select 
                className="form-control" 
                value={editForm.type} 
                onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                required 
              >
                <option value="apartment">Apartment</option>
                <option value="hostel">Hostel</option>
                <option value="house">House</option>
              </select>
            </div>
            
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea 
                className="form-control" 
                rows="3" 
                value={editForm.description} 
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label">Amenities (comma separated)</label>
              <input 
                type="text" 
                className="form-control" 
                value={editForm.amenities} 
                onChange={(e) => setEditForm({...editForm, amenities: e.target.value})}
                placeholder="WiFi, Parking, Kitchen, etc..."
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Current Images</label>
              {editingListing && editingListing.images && editingListing.images.length > 0 ? (
                <Row>
                  {editingListing.images.map((img, index) => (
                    <Col xs={4} key={index} className="mb-2">
                      <div className="position-relative">
                        <img
                          src={img.thumbnail || img}
                          alt={`Image ${index + 1}`}
                          className="img-fluid rounded"
                          style={{ height: '100px', objectFit: 'cover' }}
                        />
                        <Button
                          variant={imagesToRemove.includes(index) ? 'danger' : 'outline-danger'}
                          size="sm"
                          className="position-absolute top-0 end-0"
                          onClick={() => toggleImageRemoval(index)}
                        >
                          {imagesToRemove.includes(index) ? 'Undo' : 'Remove'}
                        </Button>
                      </div>
                    </Col>
                  ))}
                </Row>
              ) : (
                <p>No images currently</p>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">Add New Images (max 5 total)</label>
              <Form.Control
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
              />
              <Form.Text className="text-muted">
                Upload new images (max 5MB each)
              </Form.Text>
            </div>

            {newImages.length > 0 && (
              <div className="mb-3">
                <label className="form-label">New Images Preview</label>
                <Row>
                  {newImages.map((img, index) => (
                    <Col xs={4} key={index} className="mb-2">
                      <img
                        src={img}
                        alt={`New Image ${index + 1}`}
                        className="img-fluid rounded"
                        style={{ height: '100px', objectFit: 'cover' }}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            )}

            <button type="submit" className="btn btn-primary">Update Listing</button>
          </form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default UserListings;