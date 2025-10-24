import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Tab, Tabs, ListGroup, ProgressBar, InputGroup } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Phone, Camera, Edit2, Save, X, Shield, Calendar, Star, Home, MessageCircle, List } from 'react-feather'

function Profile ({ user, onProfileUpdate }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [profilePicture, setProfilePicture] = useState('')
  const [newProfilePicture, setNewProfilePicture] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [userStats, setUserStats] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      setMessage('Please log in to view your profile.')
      setTimeout(() => navigate('/login'), 2000)
      return
    }

    fetchProfile()
    fetchUserStats()
  }, [user, navigate])

  const fetchProfile = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/users/${user.uid}`)

      if (response.status === 404) {
        if (process.env.NODE_ENV === 'development') { console.log('User profile not found, creating default...') }
        const createResponse = await fetch(`${backendUrl}/api/users/${user.uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: user.displayName || '',
            profilePicture: '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || ''
          })
        })
        const createData = await createResponse.json()
        setProfileData(createData)
        return
      }

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
      const data = await response.json()
      setProfileData(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setMessage(`Failed to load profile: ${err.message}`)
    }
  }

  const fetchUserStats = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

      const [listingsRes, bookingsRes, reviewsRes] = await Promise.all([
        fetch(`${backendUrl}/api/listings?createdBy=${user.uid}`, {
          headers: { Authorization: `Bearer ${user.uid}` }
        }),
        fetch(`${backendUrl}/api/bookings?userId=${user.uid}`, {
          headers: { Authorization: `Bearer ${user.uid}` }
        }),
        fetch(`${backendUrl}/api/reviews?userId=${user.uid}`, {
          headers: { Authorization: `Bearer ${user.uid}` }
        })
      ])

      const stats = {
        listings: listingsRes.ok ? (await listingsRes.json()).length : 0,
        bookings: bookingsRes.ok ? (await bookingsRes.json()).length : 0,
        reviews: reviewsRes.ok ? (await reviewsRes.json()).length : 0
      }

      setUserStats(stats)
    } catch (err) {
      console.error('Error fetching user stats:', err)

      setUserStats({
        listings: 0,
        bookings: 0,
        reviews: 0
      })
    }
  }

  const setProfileData = (data) => {
    setDisplayName(data.displayName || user.displayName || '')
    setEmail(data.email || user.email || '')
    setPhoneNumber(data.phoneNumber || '')
    setProfilePicture(data.profilePicture || '')
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('Image size too large. Please use an image smaller than 5MB.')
        setNewProfilePicture(null)
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewProfilePicture(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      setMessage('Please log in to update your profile.')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/users/${user.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          email,
          phoneNumber,
          profilePicture: newProfilePicture
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! Status: ${response.status}`)
      }

      setProfilePicture(data.profilePicture || '')
      setNewProfilePicture(null)
      setEditing(false)
      setMessage('Profile updated successfully!')

      if (onProfileUpdate) {
        onProfileUpdate()
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setMessage(`Failed to update profile: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
  }

  const ProfileHeader = () => (
    <Card className="bg-gradient-primary text-white mb-4">
      <Card.Body className="p-4">
        <Row className="align-items-center">
          <Col xs="auto">
            <div className="position-relative">
              {profilePicture
                ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="rounded-circle border border-3 border-white"
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                />
                  )
                : (
                <div
                  className="rounded-circle border border-3 border-white d-flex align-items-center justify-content-center bg-light text-primary fw-bold"
                  style={{ width: '100px', height: '100px', fontSize: '2rem' }}
                >
                  {getInitials(displayName)}
                </div>
                  )}
              {editing && (
                <label htmlFor="profile-picture-upload" className="position-absolute bottom-0 end-0 bg-primary rounded-circle p-2 border border-2 border-white cursor-pointer">
                  <Camera size={16} className="text-white" />
                  <input
                    id="profile-picture-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="d-none"
                  />
                </label>
              )}
            </div>
          </Col>
          <Col style={{ color: '#212529' }}>
            <h2 className="mb-1">{displayName || 'User'}</h2>
            <p className="mb-2 opacity-75">
              <Mail size={16} className="me-2" />
              {email}
            </p>
            {phoneNumber && (
              <p className="mb-2 opacity-75">
                <Phone size={16} className="me-2" />
                {phoneNumber}
              </p>
            )}
            <Badge bg="light" text="dark" className="mt-1">
              <Shield size={12} className="me-1" />
              {user.email ? 'Verified User' : 'User'}
            </Badge>
          </Col>
          <Col xs="auto">
            {!editing
              ? (
              <Button variant="light" onClick={() => setEditing(true)}>
                <Edit2 size={16} className="me-2" />
                Edit Profile
              </Button>
                )
              : (
              <div className="d-flex gap-2">
                <Button variant="outline-light" onClick={() => setEditing(false)}>
                  <X size={16} className="me-2" />
                  Cancel
                </Button>
                <Button variant="light" onClick={handleSubmit} disabled={loading}>
                  <Save size={16} className="me-2" />
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
                )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )

  const StatsCard = () => (
    <Row className="g-3 mb-4">
      <Col md={4}>
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                 style={{ width: '60px', height: '60px' }}>
              <Home size={24} className="text-primary" />
            </div>
            <h3 className="text-primary mb-1">{userStats.listings || 0}</h3>
            <p className="text-muted mb-0">Listings</p>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                 style={{ width: '60px', height: '60px' }}>
              <Calendar size={24} className="text-success" />
            </div>
            <h3 className="text-success mb-1">{userStats.bookings || 0}</h3>
            <p className="text-muted mb-0">Bookings</p>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                 style={{ width: '60px', height: '60px' }}>
              <Star size={24} className="text-warning" />
            </div>
            <h3 className="text-warning mb-1">{userStats.reviews || 0}</h3>
            <p className="text-muted mb-0">Reviews</p>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )

  const ProfileCompletion = () => {
    const completion = Math.min(
      (displayName ? 25 : 0) +
      (email ? 25 : 0) +
      (phoneNumber ? 25 : 0) +
      (profilePicture ? 25 : 0),
      100
    )

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Profile Completion</h5>
        </Card.Header>
        <Card.Body>
          <ProgressBar now={completion} className="mb-3" style={{ height: '8px' }} />
          <div className="small text-muted">
            {completion === 100
              ? (
                  '🎉 Your profile is complete!'
                )
              : (
              `Complete your profile to get the best experience (${completion}%)`
                )}
          </div>
          {completion < 100 && (
            <ListGroup variant="flush" className="mt-3">
              {!displayName && <ListGroup.Item className="px-0"><small>✏️ Add your display name</small></ListGroup.Item>}
              {!email && <ListGroup.Item className="px-0"><small>📧 Add your email</small></ListGroup.Item>}
              {!phoneNumber && <ListGroup.Item className="px-0"><small>📞 Add your phone number</small></ListGroup.Item>}
              {!profilePicture && <ListGroup.Item className="px-0"><small>🖼️ Add a profile picture</small></ListGroup.Item>}
            </ListGroup>
          )}
        </Card.Body>
      </Card>
    )
  }

  return (
    <Container className="my-4 my-md-5">
      {message && (
        <Alert variant={message.includes('successfully') ? 'success' : 'danger'} className="mb-4">
          {message}
        </Alert>
      )}

      {!user
        ? (
        <div className="text-center py-5">
          <p>Redirecting to login...</p>
        </div>
          )
        : (
        <>
          <ProfileHeader />
          <StatsCard />

          <Row>
            <Col lg={4}>
              <ProfileCompletion />

              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Quick Actions</h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-grid gap-2">
                    <Button variant="outline-primary" onClick={() => navigate('/new-listing')}>
                      <Home size={16} className="me-2" />
                      Create New Listing
                    </Button>
                    <Button variant="outline-secondary" onClick={() => navigate('/bookings')}>
                      <Calendar size={16} className="me-2" />
                      View My Bookings
                    </Button>
                    <Button variant="outline-info" onClick={() => navigate('/conversations')}>
                      <MessageCircle size={16} className="me-2" />
                      My Messages
                    </Button>
                    <Button variant="outline-success" onClick={() => navigate('/listings')}>
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
                  <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                    <Tab eventKey="profile" title="Profile Information">
                      {editing
                        ? (
                        <Form onSubmit={handleSubmit}>
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Display Name</Form.Label>
                                <InputGroup>
                                  <InputGroup.Text>
                                    <User size={16} />
                                  </InputGroup.Text>
                                  <Form.Control
                                    type="text"
                                    placeholder="Enter your display name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                  />
                                </InputGroup>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Phone Number</Form.Label>
                                <InputGroup>
                                  <InputGroup.Text>+234</InputGroup.Text>
                                  <Form.Control
                                    type="tel"
                                    placeholder="801 234 5678"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                  />
                                </InputGroup>
                              </Form.Group>
                            </Col>
                          </Row>

                          <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <InputGroup>
                              <InputGroup.Text>
                                <Mail size={16} />
                              </InputGroup.Text>
                              <Form.Control
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                              />
                            </InputGroup>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Profile Picture</Form.Label>
                            <Form.Control
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                            <Form.Text className="text-muted">
                              Upload a profile picture (max 5MB)
                            </Form.Text>
                          </Form.Group>

                          {newProfilePicture && (
                            <div className="mb-3">
                              <p className="small text-muted mb-2">Preview:</p>
                              <img
                                src={newProfilePicture}
                                alt="Preview"
                                className="rounded"
                                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                              />
                            </div>
                          )}
                        </Form>
                          )
                        : (
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="d-flex align-items-center p-3 bg-light rounded">
                              <User size={20} className="text-primary me-3" />
                              <div>
                                <small className="text-muted d-block">Display Name</small>
                                <div className="fw-semibold">{displayName || 'Not set'}</div>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="d-flex align-items-center p-3 bg-light rounded">
                              <Phone size={20} className="text-primary me-3" />
                              <div>
                                <small className="text-muted d-block">Phone Number</small>
                                <div className="fw-semibold">{phoneNumber || 'Not set'}</div>
                              </div>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="d-flex align-items-center p-3 bg-light rounded">
                              <Mail size={20} className="text-primary me-3" />
                              <div>
                                <small className="text-muted d-block">Email Address</small>
                                <div className="fw-semibold">{email}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                          )}
                    </Tab>

                    <Tab eventKey="activity" title="Recent Activity">
                      <div className="text-center py-4">
                        <div className="text-muted mb-2">
                          <Calendar size={48} />
                        </div>
                        <h5>Activity History</h5>
                        <p className="text-muted">Your recent activity will appear here</p>
                      </div>
                    </Tab>
                  </Tabs>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
          )}
    </Container>
  )
}

export default Profile
