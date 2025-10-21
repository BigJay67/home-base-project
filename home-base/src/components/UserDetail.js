import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Button, Alert, Badge, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { ArrowLeft, User, Mail, Phone, Calendar, Shield, Trash2, Edit, Save, X } from 'react-feather';

function UserDetail({ user: currentAdmin }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentAdmin && userId) {
      fetchUserDetails();
    }
  }, [currentAdmin, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/admin/users/${userId}`, {
        headers: {
          'Authorization': currentAdmin.uid
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      setUser(data);
      setEditForm({
        displayName: data.displayName || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        status: data.status || 'active',
        role: data.role || 'user'
      });
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': currentAdmin.uid
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      const data = await response.json();
      setUser(data.user);
      setEditing(false);
      setMessage('User updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMakeAdmin = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/admin/users/${userId}/make-admin`, {
        method: 'POST',
        headers: {
          'Authorization': currentAdmin.uid
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to make user admin');
      }

      const data = await response.json();
      setUser(data.user);
      setEditForm(prev => ({ ...prev, role: 'admin' }));
      setMessage('User promoted to admin successfully');
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': currentAdmin.uid
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      setMessage('User deleted successfully');
      setTimeout(() => navigate('/admin'), 2000);
    } catch (err) {
      setError(err.message);
      setShowDeleteModal(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      suspended: 'warning',
      banned: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  const getRoleBadge = (role) => {
    return role === 'admin' 
      ? <Badge bg="danger"><Shield size={12} className="me-1" /> ADMIN</Badge>
      : <Badge bg="secondary">USER</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentAdmin) {
    return (
      <Container className="my-5">
        <Alert variant="warning">Please log in to view user details.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading user details...</p>
      </Container>
    );
  }

  if (error && !user) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => navigate('/admin')}>
          Back to Admin
        </Button>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="my-5">
        <Alert variant="warning">User not found.</Alert>
        <Button variant="primary" onClick={() => navigate('/admin')}>
          Back to Admin
        </Button>
      </Container>
    );
  }

  const isCurrentUser = userId === currentAdmin.uid;

  return (
    <Container className="my-4 my-md-5">
      {/* Header */}
      <div className="d-flex align-items-center mb-4">
        <Button 
          variant="outline-secondary" 
          onClick={() => navigate('/admin')}
          className="me-3"
        >
          <ArrowLeft size={18} className="me-1" />
          Back to Admin
        </Button>
        <div className="flex-grow-1">
          <h1 className="h4 h-md-3 mb-1">User Management</h1>
          <p className="text-muted mb-0">User ID: {userId}</p>
        </div>
        
        {!editing ? (
          <div className="d-flex gap-2">
            {user.role !== 'admin' && !isCurrentUser && (
              <Button variant="warning" onClick={handleMakeAdmin}>
                <Shield size={16} className="me-2" />
                Make Admin
              </Button>
            )}
            <Button variant="outline-primary" onClick={() => setEditing(true)}>
              <Edit size={16} className="me-2" />
              Edit
            </Button>
            {!isCurrentUser && (
              <Button variant="outline-danger" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={16} className="me-2" />
                Delete
              </Button>
            )}
          </div>
        ) : (
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={() => setEditing(false)}>
              <X size={16} className="me-2" />
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save size={16} className="me-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        {/* User Information */}
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                <User size={20} className="me-2" />
                User Information
              </h5>
            </Card.Header>
            <Card.Body>
              {editing ? (
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Display Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={editForm.displayName}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={editForm.phoneNumber}
                        onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                        placeholder="+234 XXX XXX XXXX"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Role</Form.Label>
                      <Form.Select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        disabled={isCurrentUser} 
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </Form.Select>
                      {isCurrentUser && (
                        <Form.Text className="text-muted">
                          You cannot change your own role
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
              ) : (
                <Row className="g-3">
                  <Col md={6}>
                    <div className="d-flex align-items-center mb-3">
                      <User size={20} className="text-primary me-3" />
                      <div>
                        <small className="text-muted">Display Name</small>
                        <div className="fw-semibold">{user.displayName || 'Not set'}</div>
                      </div>
                    </div>
                  </Col>
                  
                  <Col md={6}>
                    <div className="d-flex align-items-center mb-3">
                      <Mail size={20} className="text-primary me-3" />
                      <div>
                        <small className="text-muted">Email</small>
                        <div className="fw-semibold">{user.email}</div>
                      </div>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="d-flex align-items-center mb-3">
                      <Phone size={20} className="text-primary me-3" />
                      <div>
                        <small className="text-muted">Phone Number</small>
                        <div className="fw-semibold">{user.phoneNumber || 'Not set'}</div>
                      </div>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="d-flex align-items-center mb-3">
                      <Calendar size={20} className="text-primary me-3" />
                      <div>
                        <small className="text-muted">Member Since</small>
                        <div className="fw-semibold">{formatDate(user.createdAt)}</div>
                      </div>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="mb-3">
                      <small className="text-muted d-block">Status</small>
                      {getStatusBadge(user.status)}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="mb-3">
                      <small className="text-muted d-block">Role</small>
                      {getRoleBadge(user.role)}
                    </div>
                  </Col>

                  {user.lastLogin && (
                    <Col md={12}>
                      <div className="mt-3 p-3 bg-light rounded">
                        <small className="text-muted d-block">Last Login</small>
                        <div className="fw-semibold">{formatDate(user.lastLogin)}</div>
                        <small className="text-muted">Total logins: {user.loginCount || 0}</small>
                      </div>
                    </Col>
                  )}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* User Statistics */}
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h6 className="mb-0">User Statistics</h6>
            </Card.Header>
            <Card.Body>
              <Table borderless size="sm">
                <tbody>
                  <tr>
                    <td><strong>Listings Created:</strong></td>
                    <td className="text-end">
                      <Badge bg="primary">{user.stats?.listingsCount || 0}</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Bookings Made:</strong></td>
                    <td className="text-end">
                      <Badge bg="success">{user.stats?.bookingsCount || 0}</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Reviews Written:</strong></td>
                    <td className="text-end">
                      <Badge bg="info">{user.stats?.reviewsCount || 0}</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Account Status:</strong></td>
                    <td className="text-end">{getStatusBadge(user.status)}</td>
                  </tr>
                  <tr>
                    <td><strong>User Role:</strong></td>
                    <td className="text-end">{getRoleBadge(user.role)}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Quick Actions */}
          <Card>
            <Card.Header className="bg-light">
              <h6 className="mb-0">Quick Actions</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                {user.role !== 'admin' && !isCurrentUser && (
                  <Button variant="warning" onClick={handleMakeAdmin}>
                    <Shield size={16} className="me-2" />
                    Make Admin
                  </Button>
                )}
                <Button 
                  variant="outline-secondary"
                  onClick={() => window.location.href = `mailto:${user.email}`}
                >
                  <Mail size={16} className="me-2" />
                  Send Email
                </Button>
                {!isCurrentUser && (
                  <Button 
                    variant="outline-danger" 
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 size={16} className="me-2" />
                    Delete User
                  </Button>
                )}
              </div>
              {isCurrentUser && (
                <Alert variant="info" className="mt-3 small">
                  <strong>Note:</strong> You cannot delete or change role of your own account.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm User Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>Warning:</strong> This action cannot be undone!
          </Alert>
          <p>Are you sure you want to delete the user <strong>{user.displayName || user.email}</strong>?</p>
          <p className="text-muted small">
            This will:
            <br />• Anonymize their listings and reviews
            <br />• Remove their user account
            <br />• Preserve booking records for analytics
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteUser}>
            Delete User
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default UserDetail;