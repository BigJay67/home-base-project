import React, { useState, useEffect, useCallback } from 'react';  
import { Container, Row, Col, Card, Button, Badge, Modal, Alert, Spinner } from 'react-bootstrap';

function UserListings({ user, onEdit, onDelete, onStatusChange }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingListing, setEditingListing] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  const fetchUserListings = useCallback(async () => { 
    try {
      setLoading(true);
      setError('');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/listings?createdBy=${user.uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }
      const data = await response.json();
      setListings(data);
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
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      fetchUserListings();
    } catch (err) {
      console.error('Error updating listing status:', err);
      alert('Failed to update listing status');
    }
  };

  const handleEdit = (listing) => {
    setEditingListing(listing);
    setEditForm({
      name: listing.name,
      description: listing.description || '',
      price: listing.price,
      location: listing.location,
      type: listing.type,
      amenities: listing.amenities ? listing.amenities.join(', ') : ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingListing) return;

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
          amenities: editForm.amenities.split(',').map(a => a.trim()).filter(Boolean)
        })
      });
      if (!response.ok) {
        throw new Error('Failed to update listing');
      }
      setShowEditModal(false);
      setEditingListing(null);
      fetchUserListings();
    } catch (err) {
      console.error('Error updating listing:', err);
      alert('Failed to update listing');
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
        throw new Error('Failed to delete listing');
      }
      fetchUserListings();
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert('Failed to delete listing');
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
            
            <button type="submit" className="btn btn-primary">Update Listing</button>
          </form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default UserListings;