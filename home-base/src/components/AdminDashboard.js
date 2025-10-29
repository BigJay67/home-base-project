import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Container, Row, Col, Card, Table, Button, Alert, Badge, Form, Modal, Dropdown } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, ToggleLeft, ToggleRight, Mail, User, DollarSign, Check, X, RefreshCw, Download, Trash2 } from 'react-feather'

function AdminDashboard ({ user }) {
  const [listings, setListings] = useState([])
  const [users, setUsers] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('listings')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [listingToDelete, setListingToDelete] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedListings, setSelectedListings] = useState(new Set())

  const navigate = useNavigate()
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

  const filteredListings = useMemo(() => {
  return listings.filter((listing) => {
    const matchesSearch = listing.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  }, [listings, searchTerm, statusFilter]);

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await window.fetch(`${backendUrl}/api/users/${user?.uid}`)
      if (response.ok) {
        const userData = await response.json()
        if (userData.role !== 'admin') {
          setError('Access denied. Admin privileges required.')
          setLoading(false)
        }
      }
    } catch (err) {
      setError('Error verifying admin access')
      setLoading(false)
    }
  }, [user?.uid, backendUrl])

  const fetchData = useCallback(async () => {
    try {
      const listingsResponse = await window.fetch(`${backendUrl}/api/admin/listings`, {
        headers: {
          Authorization: user?.uid
        }
      })

      if (!listingsResponse.ok) throw new Error('Failed to fetch listings')
      const listingsData = await listingsResponse.json()
      setListings(listingsData)

      const usersResponse = await window.fetch(`${backendUrl}/api/admin/users`, {
        headers: {
          Authorization: user?.uid
        }
      })
      let usersData = []
      if (usersResponse.ok) {
        usersData = await usersResponse.json()
        setUsers(usersData)
      }

      const bookingsResponse = await window.fetch(`${backendUrl}/api/admin/bookings`, {
        headers: {
          Authorization: user?.uid
        }
      })
      let bookingsData = []
      if (bookingsResponse.ok) {
        bookingsData = await bookingsResponse.json()
        setBookings(bookingsData)
      }

      setStats({
        totalListings: listingsData.length,
        activeListings: listingsData.filter((listing) => listing.status === 'active').length,
        inactiveListings: listingsData.filter((listing) => listing.status === 'inactive').length,
        totalUsers: usersData.length,
        totalBookings: bookingsData.length
      })
    } catch (err) {
      setError('Failed to load admin data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.uid, backendUrl])

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }

    const initialize = async () => {
      await checkAdminStatus()
      await fetchData()
    }

    initialize()
  }, [user, navigate, checkAdminStatus, fetchData])

  const handleBookingAction = useCallback(async (bookingId, action, actionName) => {
    try {
      let endpoint = ''
      const method = 'PUT'
      let body = null

      switch (action) {
        case 'refund':
          endpoint = `/api/admin/bookings/${bookingId}/refund`
          body = { status: 'refunded' }
          break
        case 'approve':
          endpoint = `/api/admin/bookings/${bookingId}/status`
          body = { status: 'completed' }
          break
        case 'cancel':
          endpoint = `/api/admin/bookings/${bookingId}/status`
          body = { status: 'cancelled' }
          break
        case 'retry':
          endpoint = `/api/admin/bookings/${bookingId}/retry`
          break
        default:
          return
      }

      const response = await window.fetch(`${backendUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: user?.uid
        },
        body: body ? JSON.stringify(body) : undefined
      })

      if (!response.ok) {
        throw new Error(`Failed to ${actionName.toLowerCase()}`)
      }

      await fetchData()
      setMessage(`${actionName} successful`)
    } catch (err) {
      setError(`Failed to ${actionName.toLowerCase()}: ${err.message}`)
    }
  }, [user?.uid, backendUrl, fetchData])

  const handleExportBooking = useCallback(async (bookingId) => {
    try {
      const response = await window.fetch(`${backendUrl}/api/admin/bookings/${bookingId}/export`, {
        headers: {
          Authorization: user?.uid
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export booking')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `booking-${bookingId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setMessage('Booking exported successfully')
    } catch (err) {
      setError('Failed to export booking: ' + err.message)
    }
  }, [user?.uid, backendUrl])

  const handleDeleteBooking = useCallback(async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      return
    }

    try {
      const response = await window.fetch(`${backendUrl}/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: user?.uid
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete booking')
      }

      setBookings(bookings.filter((booking) => booking._id !== bookingId))
      setMessage('Booking deleted successfully')
    } catch (err) {
      setError('Failed to delete booking: ' + err.message)
    }
  }, [user?.uid, bookings, backendUrl])

  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    inactiveListings: 0,
    totalUsers: 0,
    totalBookings: 0
  })

  const toggleListingStatus = useCallback(async (listingId, newStatus) => {
    try {
      const response = await window.fetch(`${backendUrl}/api/admin/listings/${listingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user?.uid
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update listing status')

      setListings(listings.map((listing) =>
        listing._id === listingId ? { ...listing, status: newStatus } : listing
      ))

      setStats((prev) => ({
        ...prev,
        activeListings: newStatus === 'active'
          ? prev.activeListings + 1
          : prev.activeListings - 1,
        inactiveListings: newStatus === 'inactive'
          ? prev.inactiveListings + 1
          : prev.inactiveListings - 1
      }))

      setMessage(`Listing status updated to ${newStatus}`)
    } catch (err) {
      setError('Failed to update listing status: ' + err.message)
    }
  }, [user?.uid, listings, backendUrl])

  const handleBulkStatusUpdate = useCallback(async (status) => {
    if (selectedListings.size === 0) {
      setError('Please select at least one listing')
      return
    }

    try {
      const response = await window.fetch(`${backendUrl}/api/admin/listings/bulk-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user?.uid
        },
        body: JSON.stringify({
          listingIds: Array.from(selectedListings),
          status
        })
      })

      if (!response.ok) throw new Error('Failed to bulk update listings')

      const data = await response.json()

      setListings(listings.map((listing) =>
        selectedListings.has(listing._id) ? { ...listing, status } : listing
      ))

      const updatedCount = data.modifiedCount
      setStats((prev) => ({
        ...prev,
        activeListings: status === 'active'
          ? prev.activeListings + updatedCount
          : prev.activeListings - updatedCount,
        inactiveListings: status === 'inactive'
          ? prev.inactiveListings + updatedCount
          : prev.inactiveListings - updatedCount
      }))

      setSelectedListings(new Set())
      setMessage(`Updated ${updatedCount} listings to ${status}`)
    } catch (err) {
      setError('Failed to bulk update listings: ' + err.message)
    }
  }, [user?.uid, listings, selectedListings, backendUrl])

  const toggleSelectListing = useCallback((listingId) => {
    const newSelected = new Set(selectedListings)
    if (newSelected.has(listingId)) {
      newSelected.delete(listingId)
    } else {
      newSelected.add(listingId)
    }
    setSelectedListings(newSelected)
  }, [selectedListings])

  const toggleSelectAll = useCallback(() => {
    if (selectedListings.size === filteredListings.length) {
      setSelectedListings(new Set())
    } else {
      const allIds = new Set(filteredListings.map((l) => l._id))
      setSelectedListings(allIds)
    }
  }, [selectedListings, filteredListings])

  const handleDeleteListing = useCallback(async () => {
    if (!listingToDelete) return

    try {
      const response = await window.fetch(`${backendUrl}/api/admin/listings/${listingToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user?.uid
        }
      })

      if (!response.ok) throw new Error('Failed to delete listing')

      setListings(listings.filter((listing) => listing._id !== listingToDelete._id))
      setMessage('Listing deleted successfully')
      setShowDeleteModal(false)
      setListingToDelete(null)

      setStats((prev) => ({
        ...prev,
        totalListings: prev.totalListings - 1,
        activeListings: listingToDelete.status === 'active' ? prev.activeListings - 1 : prev.activeListings,
        inactiveListings: listingToDelete.status === 'inactive' ? prev.inactiveListings - 1 : prev.inactiveListings
      }))
    } catch (err) {
      setError('Failed to delete listing: ' + err.message)
    }
  }, [user?.uid, listingToDelete, listings, backendUrl])

  const confirmDelete = useCallback((listing) => {
    setListingToDelete(listing)
    setShowDeleteModal(true)
  }, [])

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString()
  }, [])

  const getStatusBadge = useCallback((listing) => {
    const variants = {
      active: 'success',
      inactive: 'danger',
      pending: 'warning'
    }
    return (
      <Badge bg={variants[listing.status] || 'secondary'}>
        {listing.status.toUpperCase()}
      </Badge>
    )
  }, [])

  

  const BulkActionsToolbar = () => {
    if (selectedListings.size === 0) return null

    return (
      <Card className="mb-3 bg-light">
        <Card.Body className="py-2">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>{selectedListings.size} listing(s) selected</strong>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleBulkStatusUpdate('active')}
              >
                <Check size={14} className="me-1" />
                Activate Selected
              </Button>
              <Button
                variant="warning"
                size="sm"
                onClick={() => handleBulkStatusUpdate('inactive')}
              >
                <X size={14} className="me-1" />
                Deactivate Selected
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setSelectedListings(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  if (loading) return <Container className="my-5"><Alert variant="info">Loading admin dashboard...</Alert></Container>
  if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>

  return (
    <Container className="my-3 my-md-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <h1 className="h4 h-md-2 mb-0">Admin Dashboard</h1>
        <Button variant="outline-primary" size="sm" onClick={fetchData}>
          <span className="d-none d-md-inline">Refresh Data</span>
          <span className="d-md-none">Refresh</span>
        </Button>
      </div>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-2 mb-4">
        {[
          { title: 'Total Listings', value: stats.totalListings, color: 'primary' },
          { title: 'Active Listings', value: stats.activeListings, color: 'success' },
          { title: 'Inactive Listings', value: stats.inactiveListings, color: 'warning' },
          { title: 'Total Users', value: stats.totalUsers, color: 'info' },
          { title: 'Total Bookings', value: stats.totalBookings, color: 'secondary' }
        ].map((stat, index) => (
          <Col xs={6} md={3} lg={index === 0 ? 3 : index === 4 ? 3 : 2} key={index}>
            <Card className="text-center h-100">
              <Card.Body className="p-2 p-md-3">
                <Card.Title as="div" className={`h5 h-md-2 text-${stat.color}`}>
                  {stat.value}
                </Card.Title>
                <Card.Text className="small mb-0">{stat.title}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <Card.Header className="p-2 p-md-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
            <div className="d-flex flex-wrap gap-1">
              <Button
                variant={activeTab === 'listings' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => setActiveTab('listings')}
              >
                <span className="d-none d-md-inline">Listings</span>
                <span className="d-md-none">Listings</span>
              </Button>
              <Button
                variant={activeTab === 'users' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => setActiveTab('users')}
              >
                <span className="d-none d-md-inline">Users</span>
                <span className="d-md-none">Users</span>
              </Button>
              <Button
                variant={activeTab === 'bookings' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => setActiveTab('bookings')}
              >
                <span className="d-none d-md-inline">Bookings</span>
                <span className="d-md-none">Bookings</span>
              </Button>
            </div>

            {activeTab === 'listings' && (
              <div className="d-flex flex-wrap gap-2" style={{ width: '100%', maxWidth: '500px' }}>
                <Form.Control
                  type="text"
                  placeholder="Search listings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                  style={{ flex: '1', minWidth: '150px' }}
                />
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  size="sm"
                  style={{ width: 'auto' }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </Form.Select>
              </div>
            )}
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {activeTab === 'listings' && (
            <>
              <BulkActionsToolbar />

              <div className="table-responsive">
                <Table striped hover className="mb-0 small">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        {filteredListings.length > 0 && (
                          <Form.Check
                            type="checkbox"
                            checked={selectedListings.size === filteredListings.length}
                            onChange={toggleSelectAll}
                            title="Select all"
                          />
                        )}
                      </th>
                      <th>Name</th>
                      <th className="d-none d-md-table-cell">Type</th>
                      <th className="d-none d-sm-table-cell">Location</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th className="d-none d-md-table-cell">Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredListings.length === 0
                      ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <div className="text-muted">
                            {searchTerm || statusFilter !== 'all' ? 'No listings match your search' : 'No listings found'}
                          </div>
                        </td>
                      </tr>
                        )
                      : (
                          filteredListings.map((listing) => (
                        <tr key={listing._id}>
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={selectedListings.has(listing._id)}
                              onChange={() => toggleSelectListing(listing._id)}
                            />
                          </td>
                          <td>
                            <div>
                              <strong className="d-block">{listing.name}</strong>
                              <small className="text-muted d-block d-md-none">
                                {listing.type} • {listing.location}
                              </small>
                              <small className="text-muted d-none d-md-block">
                                {listing.amenities?.slice(0, 2).join(', ')}
                                {listing.amenities?.length > 2 && '...'}
                              </small>
                            </div>
                          </td>
                          <td className="d-none d-md-table-cell">
                            <Badge bg="primary">{listing.type}</Badge>
                          </td>
                          <td className="d-none d-sm-table-cell">{listing.location}</td>
                          <td>{listing.price}</td>
                          <td>{getStatusBadge(listing)}</td>
                          <td className="d-none d-md-table-cell">{formatDate(listing.createdAt)}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-info"
                                size="sm"
                                className="me-1"
                                onClick={() => navigate(`/listing/${listing._id}`)}
                              >
                                <span className="d-none d-sm-inline">View</span>
                                <span className="d-sm-none">•••</span>
                              </Button>

                              <Dropdown>
                                <Dropdown.Toggle
                                  variant="outline-secondary"
                                  size="sm"
                                  id={`dropdown-${listing._id}`}
                                >
                                  <MoreVertical size={14} />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  {listing.status === 'active'
                                    ? (
                                    <Dropdown.Item
                                      onClick={() => toggleListingStatus(listing._id, 'inactive')}
                                      className="text-warning"
                                    >
                                      <ToggleLeft size={14} className="me-2" />
                                      Deactivate
                                    </Dropdown.Item>
                                      )
                                    : (
                                    <Dropdown.Item
                                      onClick={() => toggleListingStatus(listing._id, 'active')}
                                      className="text-success"
                                    >
                                      <ToggleRight size={14} className="me-2" />
                                      Activate
                                    </Dropdown.Item>
                                      )}
                                  <Dropdown.Divider />
                                  <Dropdown.Item
                                    onClick={() => confirmDelete(listing)}
                                    className="text-danger"
                                  >
                                    <X size={14} className="me-2" />
                                    Delete
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>
                            </div>
                          </td>
                        </tr>
                          ))
                        )}
                  </tbody>
                </Table>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div className="table-responsive">
              <Table striped hover className="mb-0 small">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email</th>
                    <th className="d-none d-md-table-cell">Display Name</th>
                    <th>Role</th>
                    <th className="d-none d-sm-table-cell">Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0
                    ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <div className="text-muted">No users found</div>
                      </td>
                    </tr>
                      )
                    : (
                        users.map((user) => (
                      <tr key={user.userId}>
                        <td>
                          <small className="font-monospace">{user.userId.substring(0, 10)}...</small>
                        </td>
                        <td>{user.email}</td>
                        <td className="d-none d-md-table-cell">{user.displayName || 'N/A'}</td>
                        <td>
                          <Badge bg={user.role === 'admin' ? 'danger' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="d-none d-sm-table-cell">{formatDate(user.createdAt)}</td>
                        <td>
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => navigate(`/admin/users/${user.userId}`)}
                          >
                            <span className="d-none d-sm-inline">Manage</span>
                            <span className="d-sm-none">•••</span>
                          </Button>
                        </td>
                      </tr>
                        ))
                      )}
                </tbody>
              </Table>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="table-responsive">
              <Table striped hover className="mb-0 small">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>User Email</th>
                    <th>Listing</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th className="d-none d-sm-table-cell">Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0
                    ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <div className="text-muted">No bookings found</div>
                      </td>
                    </tr>
                      )
                    : (
                        bookings.map((booking) => (
                      <tr key={booking._id}>
                        <td>
                          <small className="font-monospace">{booking._id.substring(0, 10)}...</small>
                        </td>
                        <td>
                          <small>{booking.userEmail}</small>
                        </td>
                        <td>
                          {booking.listingId?.name || 'Deleted Listing'}
                          {booking.listingId?.location && (
                            <div className="text-muted small">{booking.listingId.location}</div>
                          )}
                        </td>
                        <td>₦{booking.amount?.toLocaleString()}</td>
                        <td>
                          <Badge bg={
                            booking.status === 'completed'
                              ? 'success'
                              : booking.status === 'pending' ? 'warning' : 'danger'
                          }>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="d-none d-sm-table-cell">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => navigate(`/bookings/${booking._id}`)}
                            >
                              <span className="d-none d-sm-inline">View</span>
                              <span className="d-sm-none">•••</span>
                            </Button>

                            <Dropdown>
                              <Dropdown.Toggle
                                variant="outline-secondary"
                                size="sm"
                                id={`dropdown-actions-${booking._id}`}
                              >
                                <span className="d-none d-sm-inline">Actions</span>
                                <span className="d-sm-none">Actions</span>
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item
                                  href={`mailto:${booking.userEmail}?subject=Regarding Booking ${booking.paymentReference}`}
                                >
                                  <Mail size={14} className="me-2" />
                                  Contact User
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onClick={() => navigate(`/admin/users/${booking.userId}`)}
                                >
                                  <User size={14} className="me-2" />
                                  View User Profile
                                </Dropdown.Item>

                                <Dropdown.Divider />

                                {booking.status === 'completed' && (
                                  <Dropdown.Item
                                    onClick={() => handleBookingAction(booking._id, 'refund', 'Mark as Refunded')}
                                    className="text-warning"
                                  >
                                    <DollarSign size={14} className="me-2" />
                                    Mark as Refunded
                                  </Dropdown.Item>
                                )}

                                {booking.status === 'pending' && (
                                  <>
                                    <Dropdown.Item
                                      onClick={() => handleBookingAction(booking._id, 'approve', 'Approve Booking')}
                                      className="text-success"
                                    >
                                      <Check size={14} className="me-2" />
                                      Approve Booking
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                      onClick={() => handleBookingAction(booking._id, 'cancel', 'Cancel Booking')}
                                      className="text-danger"
                                    >
                                      <X size={14} className="me-2" />
                                      Cancel Booking
                                    </Dropdown.Item>
                                  </>
                                )}

                                {booking.status === 'failed' && (
                                  <Dropdown.Item
                                    onClick={() => handleBookingAction(booking._id, 'retry', 'Retry Payment')}
                                    className="text-info"
                                  >
                                    <RefreshCw size={14} className="me-2" />
                                    Retry Payment
                                  </Dropdown.Item>
                                )}

                                <Dropdown.Divider />

                                <Dropdown.Item
                                  onClick={() => handleExportBooking(booking._id)}
                                >
                                  <Download size={14} className="me-2" />
                                  Export Details
                                </Dropdown.Item>

                                <Dropdown.Item
                                  onClick={() => handleDeleteBooking(booking._id)}
                                  className="text-danger"
                                >
                                  <Trash2 size={14} className="me-2" />
                                  Delete Booking
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </div>
                        </td>
                      </tr>
                        ))
                      )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the listing &quot;<strong>{listingToDelete?.name}</strong>&quot;?
          <br />
          <small className="text-muted">This action cannot be undone and will remove all associated reviews and bookings.</small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteListing}>
            Delete Listing
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default AdminDashboard