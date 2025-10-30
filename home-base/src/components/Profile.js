import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Tab, Tabs, ListGroup, ProgressBar, InputGroup, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Camera, Edit2, Save, X, Shield, Calendar, Star, Home, MessageCircle, List, Clock, MapPin, DollarSign } from 'react-feather';
import './Profile.css';

function Profile({ user, onProfileUpdate }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [newProfilePicture, setNewProfilePicture] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [userStats, setUserStats] = useState({});
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setMessage('Please log in to view your profile.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    fetchProfile();
    fetchUserStats();
    fetchRecentActivity();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/users/${user.uid}`);
      if (response.status === 404) {
        const createResponse = await fetch(`${backendUrl}/api/users/${user.uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: user.displayName || '',
            profilePicture: '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || ''
          })
        });
        const createData = await createResponse.json();
        setProfileData(createData);
        return;
      }
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setProfileData(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setMessage(`Failed to load profile: ${err.message}`);
    }
  };

  const fetchUserStats = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const [listingsRes, bookingsRes, reviewsRes] = await Promise.all([
        fetch(`${backendUrl}/api/listings?createdBy=${user.uid}`, { headers: { Authorization: `Bearer ${user.uid}` } }),
        fetch(`${backendUrl}/api/bookings?userId=${user.uid}`, { headers: { Authorization: `Bearer ${user.uid}` } }),
        fetch(`${backendUrl}/api/reviews?userId=${user.uid}`, { headers: { Authorization: `Bearer ${user.uid}` } })
      ]);
      const stats = {
        listings: listingsRes.ok ? (await listingsRes.json()).length : 0,
        bookings: bookingsRes.ok ? (await bookingsRes.json()).length : 0,
        reviews: reviewsRes.ok ? (await reviewsRes.json()).length : 0
      };
      setUserStats(stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setUserStats({ listings: 0, bookings: 0, reviews: 0 });
    }
  };

  const fetchRecentActivity = async () => {
    setActivityLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const [bookingsRes, listingsRes, messagesRes] = await Promise.all([
        fetch(`${backendUrl}/api/bookings?userId=${user.uid}&limit=5`, { headers: { Authorization: `Bearer ${user.uid}` } }),
        fetch(`${backendUrl}/api/listings?createdBy=${user.uid}&limit=5`, { headers: { Authorization: `Bearer ${user.uid}` } }),
        fetch(`${backendUrl}/api/conversations?userId=${user.uid}&limit=5`, { headers: { Authorization: `Bearer ${user.uid}` } })
      ]);

      const bookings = bookingsRes.ok ? await bookingsRes.json() : [];
      const listings = listingsRes.ok ? await listingsRes.json() : [];
      const conversations = messagesRes.ok ? await messagesRes.json() : [];

      const activity = [
        ...bookings.map(b => ({ type: 'booking', ...b, timestamp: b.createdAt })),
        ...listings.map(l => ({ type: 'listing', ...l, timestamp: l.createdAt })),
        ...conversations.map(c => ({ type: 'message', ...c, timestamp: c.lastMessageAt }))
      ];

      activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivities(activity.slice(0, 10));
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const setProfileData = (data) => {
    setDisplayName(data.displayName || user.displayName || '');
    setEmail(data.email || user.email || '');
    setPhoneNumber(data.phoneNumber || '');
    setProfilePicture(data.profilePicture || '');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => setNewProfilePicture(reader.result);
      reader.readAsDataURL(file);
    } else if (file) {
      setMessage('Image size too large. Max 5MB.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setMessage('');
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/users/${user.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, phoneNumber, profilePicture: newProfilePicture })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Update failed');
      setProfilePicture(data.profilePicture || '');
      setNewProfilePicture(null);
      setEditing(false);
      setMessage('Profile updated successfully!');
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      setMessage(`Failed to update: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const ProfileHeader = () => (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body className="p-4">
        <Row className="align-items-center">
          <Col xs="auto">
            <div className="position-relative">
              {newProfilePicture || profilePicture ? (
                <img
                  src={newProfilePicture || profilePicture}
                  alt="Profile"
                  className="rounded-circle"
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: '100px', height: '100px', fontSize: '2rem' }}
                >
                  {getInitials(displayName)}
                </div>
              )}
              {editing && (
                <label htmlFor="profile-pic" className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-2 cursor-pointer">
                  <Camera size={16} />
                  <input id="profile-pic" type="file" accept="image/*" onChange={handleImageChange} className="d-none" />
                </label>
              )}
            </div>
          </Col>
          <Col>
            <h2 className="mb-1">{displayName || 'User'}</h2>
            <p className="mb-1 text-muted">
              <Mail size={16} className="me-2" />
              {email}
            </p>
            {phoneNumber && (
              <p className="mb-1 text-muted">
                <Phone size={16} className="me-2" />
                {phoneNumber}
              </p>
            )}
            <Badge bg="success" className="mt-1">
              <Shield size={12} className="me-1" />
              Verified
            </Badge>
          </Col>
          <Col xs="auto">
            {!editing ? (
              <Button variant="outline-primary" size="sm" onClick={() => setEditing(true)}>
                <Edit2 size={16} className="me-1" />
                Edit
              </Button>
            ) : (
              <div className="d-flex gap-2">
                <Button variant="light" size="sm" onClick={() => { setEditing(false); setNewProfilePicture(null); }}>
                  <X size={16} />
                </Button>
                <Button variant="primary" size="sm" onClick={handleSubmit} disabled={loading}>
                  <Save size={16} className="me-1" />
                  {loading ? 'Saving' : 'Save'}
                </Button>
              </div>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  const StatsCard = () => (
    <Row className="g-3 mb-4">
      <Col md={4}>
        <Card className="h-100 border-0 shadow-sm text-center">
          <Card.Body>
            <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
              <Home size={24} className="text-primary" />
            </div>
            <h3 className="mb-0">{userStats.listings || 0}</h3>
            <p className="text-muted small">Listings</p>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="h-100 border-0 shadow-sm text-center">
          <Card.Body>
            <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
              <Calendar size={24} className="text-success" />
            </div>
            <h3 className="mb-0">{userStats.bookings || 0}</h3>
            <p className="text-muted small">Bookings</p>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="h-100 border-0 shadow-sm text-center">
          <Card.Body>
            <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
              <Star size={24} className="text-warning" />
            </div>
            <h3 className="mb-0">{userStats.reviews || 0}</h3>
            <p className="text-muted small">Reviews</p>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const ProfileCompletion = () => {
    const completion = Math.min(
      (displayName ? 25 : 0) +
      (email ? 25 : 0) +
      (phoneNumber ? 25 : 0) +
      (profilePicture ? 25 : 0),
      100
    );
    return (
      <Card className="mb-4">
        <Card.Header className="bg-light">
          <h6 className="mb-0">Profile Completion</h6>
        </Card.Header>
        <Card.Body>
          <ProgressBar now={completion} variant="success" className="mb-2" style={{ height: '6px' }} />
          <small className="text-muted">
            {completion === 100 ? 'Complete!' : `${completion}% complete`}
          </small>
          {completion < 100 && (
            <ListGroup variant="flush" className="mt-3 small">
              {!displayName && <ListGroup.Item className="px-0">Add display name</ListGroup.Item>}
              {!email && <ListGroup.Item className="px-0">Add email</ListGroup.Item>}
              {!phoneNumber && <ListGroup.Item className="px-0">Add phone</ListGroup.Item>}
              {!profilePicture && <ListGroup.Item className="px-0">Add photo</ListGroup.Item>}
            </ListGroup>
          )}
        </Card.Body>
      </Card>
    );
  };

  const ActivityItem = ({ act }) => {
    const icons = {
      booking: <Calendar className="text-success" size={16} />,
      listing: <Home className="text-primary" size={16} />,
      message: <MessageCircle className="text-info" size={16} />
    };
    const titles = {
      booking: `Booked: ${act.listingId?.name || 'Unknown'}`,
      listing: `Created: ${act.name || 'New Listing'}`,
      message: `Message from ${act.participants?.find(p => p.userId !== user.uid)?.displayName || 'Someone'}`
    };
    return (
      <div className="d-flex align-items-start mb-3 p-3 bg-light rounded">
        <div className="me-3">{icons[act.type]}</div>
        <div className="flex-grow-1">
          <p className="mb-1 fw-medium small">{titles[act.type]}</p>
          <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
            <Clock size={12} className="me-1" />
            {formatTimeAgo(act.timestamp)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Container className="my-4 my-md-5">
      {message && (
        <Alert variant={message.includes('successfully') ? 'success' : 'danger'} className="mb-4">
          {message}
        </Alert>
      )}
      {!user ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3">Redirecting to login...</p>
        </div>
      ) : (
        <>
          <ProfileHeader />
          <StatsCard />
          <Row>
            <Col lg={4}>
              <ProfileCompletion />
              <Card className="mb-4">
                <Card.Header className="bg-light">
                  <h6 className="mb-0">Quick Actions</h6>
                </Card.Header>
                <Card.Body>
                  <div className="d-grid gap-2">
                    <Button variant="outline-primary" size="sm" onClick={() => navigate('/new-listing')}>
                      <Home size={16} className="me-2" />
                      New Listing
                    </Button>
                    <Button variant="outline-secondary" size="sm" onClick={() => navigate('/bookings')}>
                      <Calendar size={16} className="me-2" />
                      My Bookings
                    </Button>
                    <Button variant="outline-info" size="sm" onClick={() => navigate('/conversations')}>
                      <MessageCircle size={16} className="me-2" />
                      Messages
                    </Button>
                    <Button variant="outline-success" size="sm" onClick={() => navigate('/listings')}>
                      <List size={16} className="me-2" />
                      My Listings
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={8}>
              <Card>
                <Card.Body>
                  <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3 border-bottom">
                    <Tab eventKey="profile" title="Profile">
                      {editing ? (
                        <Form onSubmit={handleSubmit}>
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Display Name</Form.Label>
                                <InputGroup>
                                  <InputGroup.Text><User size={16} /></InputGroup.Text>
                                  <Form.Control value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Enter name" />
                                </InputGroup>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Phone</Form.Label>
                                <InputGroup>
                                  <InputGroup.Text>+234</InputGroup.Text>
                                  <Form.Control value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} placeholder="8012345678" />
                                </InputGroup>
                              </Form.Group>
                            </Col>
                          </Row>
                          <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <InputGroup>
                              <InputGroup.Text><Mail size={16} /></InputGroup.Text>
                              <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} />
                            </InputGroup>
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label>Photo</Form.Label>
                            <Form.Control type="file" accept="image/*" onChange={handleImageChange} />
                            {newProfilePicture && (
                              <img src={newProfilePicture} alt="Preview" className="mt-2 rounded" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                            )}
                          </Form.Group>
                        </Form>
                      ) : (
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="d-flex align-items-center p-3 bg-light rounded">
                              <User size={20} className="text-primary me-3" />
                              <div>
                                <small className="text-muted d-block">Name</small>
                                <div className="fw-semibold">{displayName || 'Not set'}</div>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="d-flex align-items-center p-3 bg-light rounded">
                              <Phone size={20} className="text-primary me-3" />
                              <div>
                                <small className="text-muted d-block">Phone</small>
                                <div className="fw-semibold">{phoneNumber || 'Not set'}</div>
                              </div>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="d-flex align-items-center p-3 bg-light rounded">
                              <Mail size={20} className="text-primary me-3" />
                              <div>
                                <small className="text-muted d-block">Email</small>
                                <div className="fw-semibold">{email}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Tab>
                    <Tab eventKey="activity" title="Recent Activity">
                      {activityLoading ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" size="sm" />
                          <p className="mt-2 text-muted small">Loading activity...</p>
                        </div>
                      ) : activities.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                          <Calendar size={48} className="mb-3 opacity-50" />
                          <p>No recent activity</p>
                        </div>
                      ) : (
                        <div className="activity-list">
                          {activities.map((act, i) => (
                            <ActivityItem key={i} act={act} />
                          ))}
                        </div>
                      )}
                    </Tab>
                  </Tabs>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}

export default Profile;