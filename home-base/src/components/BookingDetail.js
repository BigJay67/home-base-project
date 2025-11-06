import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Card, Row, Col, Button, Badge, Alert, Spinner, Table, Modal } from 'react-bootstrap'
import { ArrowLeft, Download, Printer, Share2, Calendar, MapPin, DollarSign, User, FileText, Mail, Shield } from 'react-feather'

function BookingDetail ({ user: currentUser }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)

  const checkAdminStatus = useCallback(async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/users/${currentUser.uid}`)
      if (response.ok) {
        const userData = await response.json()
        setIsAdmin(userData.role === 'admin')
      }
    } catch (err) {
      console.error('Error checking admin status:', err)
    }
  }, [currentUser])

  const fetchBookingDetail = useCallback(async () => {
    try {
      setLoading(true)
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/bookings/${id}`, {
        headers: {
          Authorization: currentUser.uid
        }
      })

      if (!response.ok) {
        if (response.status === 403 || response.status === 404) {
          const adminResponse = await fetch(`${backendUrl}/api/admin/bookings/${id}`, {
            headers: {
              Authorization: currentUser.uid
            }
          })

          if (adminResponse.ok) {
            const data = await adminResponse.json()
            setBooking(data)
            return
          }
        }
        throw new Error('Failed to fetch booking details')
      }

      const data = await response.json()
      setBooking(data)
    } catch (err) {
      console.error('Error fetching booking details:', err)
      setError('Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }, [currentUser, id])

  useEffect(() => {
    if (currentUser && id) {
      checkAdminStatus()
      fetchBookingDetail()
    }
  }, [currentUser, id, checkAdminStatus, fetchBookingDetail])

  const formatCurrency = (amount, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger',
      cancelled: 'secondary'
    }
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>
  }

  const handleDownloadReceipt = async () => {
    if (!booking) return

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/payments/${booking._id}/receipt`, {
        headers: {
          Authorization: currentUser.uid
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download receipt')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `receipt-${booking.paymentReference}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading receipt:', err)
      alert('Failed to download receipt: ' + err.message)
    }
  }

  const handleContactUser = () => {
    if (booking && booking.userEmail) {
      window.location.href = `mailto:${booking.userEmail}?subject=Regarding Booking ${booking.paymentReference}&body=Hello, I'm contacting you regarding your booking (Reference: ${booking.paymentReference})`
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const AdminActions = () => {
    if (!isAdmin || !booking) return null

    return (
      <Card className="mb-4 border-warning">
        <Card.Header className="bg-warning text-dark">
          <h6 className="mb-0">
            <Shield size={18} className="me-2" />
            Admin Actions
          </h6>
        </Card.Header>
        <Card.Body>
          <div className="d-grid gap-2">
            <Button variant="outline-primary" onClick={handleContactUser}>
              <Mail size={16} className="me-2" />
              Contact User
            </Button>
            <Button
              variant="outline-info"
              onClick={() => navigate(`/admin/users/${booking.userId}`)}
            >
              <User size={16} className="me-2" />
              View User Profile
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => navigate('/admin')}
            >
              <Shield size={16} className="me-2" />
              Admin Dashboard
            </Button>
          </div>
        </Card.Body>
      </Card>
    )
  }

  const HeaderBadges = () => {
    if (!booking) return null

    return (
      <div className="d-flex align-items-center gap-2 mt-2">
        {isAdmin && (
          <Badge bg="warning" text="dark">
            <Shield size={12} className="me-1" />
            ADMIN VIEW
          </Badge>
        )}
        {booking.userId !== currentUser.uid && isAdmin && (
          <Badge bg="info">
            User: {booking.userEmail}
          </Badge>
        )}
      </div>
    )
  }

  if (!currentUser) {
    return (
      <Container className="my-5">
        <Alert variant="warning">Please log in to view booking details.</Alert>
      </Container>
    )
  }

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading booking details...</p>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => navigate(isAdmin ? '/admin' : '/bookings')}>
          Back to {isAdmin ? 'Admin' : 'Bookings'}
        </Button>
      </Container>
    )
  }

  if (!booking) {
    return (
      <Container className="my-5">
        <Alert variant="warning">Booking not found.</Alert>
        <Button variant="primary" onClick={() => navigate(isAdmin ? '/admin' : '/bookings')}>
          Back to {isAdmin ? 'Admin' : 'Bookings'}
        </Button>
      </Container>
    )
  }

  const isOwnBooking = booking.userId === currentUser.uid

  return (
    <Container className="my-4 my-md-5">

      <div className="d-flex align-items-center mb-4">
        <Button
          variant="outline-secondary"
          onClick={() => {
            if (isAdmin && !isOwnBooking) {
              navigate('/admin')
            } else {
              navigate('/bookings')
            }
          }}
          className="me-3"
        >
          <ArrowLeft size={18} className="me-1" />
          Back {isAdmin && !isOwnBooking ? 'to Admin' : 'to Bookings'}
        </Button>
        <div className="flex-grow-1">
          <h1 className="h4 h-md-3 mb-1">Booking Details</h1>
          <p className="text-muted mb-0">Reference: {booking.paymentReference}</p>
          <HeaderBadges />
        </div>
        {booking.status === 'completed' && (
          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={handleDownloadReceipt}>
              <Download size={16} className="me-2" />
              Receipt
            </Button>
            <Button variant="outline-secondary" onClick={handlePrint}>
              <Printer size={16} className="me-2" />
              Print
            </Button>
          </div>
        )}
      </div>

      <AdminActions />

      <Row>

        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                <FileText size={20} className="me-2" />
                Booking Information
              </h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <div className="d-flex align-items-center mb-3">
                    <Calendar size={20} className="text-primary me-3" />
                    <div>
                      <small className="text-muted">Booking Date</small>
                      <div className="fw-semibold">{formatDate(booking.createdAt)}</div>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="d-flex align-items-center mb-3">
                    <DollarSign size={20} className="text-success me-3" />
                    <div>
                      <small className="text-muted">Amount Paid</small>
                      <div className="fw-semibold">{formatCurrency(booking.amount)}</div>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="d-flex align-items-center mb-3">
                    <Badge bg="primary" className="me-3" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      📅
                    </Badge>
                    <div>
                      <small className="text-muted">Status</small>
                      <div>{getStatusBadge(booking.status)}</div>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="d-flex align-items-center mb-3">
                    <User size={20} className="text-info me-3" />
                    <div>
                      <small className="text-muted">Booked By</small>
                      <div className="fw-semibold">{booking.userEmail}</div>
                      {isAdmin && (
                        <small className="text-muted">User ID: {booking.userId}</small>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>

              {booking.paidAt && (
                <div className="mt-3 p-3 bg-light rounded">
                  <small className="text-muted d-block">Payment Completed</small>
                  <div className="fw-semibold">{formatDate(booking.paidAt)}</div>
                </div>
              )}

              <div className="mt-3">
                <small className="text-muted d-block">Payment Reference</small>
                <code className="bg-light p-2 rounded">{booking.paymentReference}</code>
              </div>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                <MapPin size={20} className="me-2" />
                Property Details
              </h5>
            </Card.Header>
            <Card.Body>
              {booking.listingId
                ? (
                <>
                  <h6 className="text-primary">{booking.listingId.name}</h6>
                  <p className="text-muted mb-3">
                    <MapPin size={16} className="me-1" />
                    {booking.listingId.location}
                  </p>

                  {booking.listingId.type && (
                    <div className="mb-2">
                      <strong>Type:</strong>
                      <Badge bg="primary" className="ms-2 text-capitalize">
                        {booking.listingId.type}
                      </Badge>
                    </div>
                  )}

                  {booking.listingId.price && (
                    <div className="mb-2">
                      <strong>Listing Price:</strong> {booking.listingId.price}
                    </div>
                  )}

                  {booking.listingId.amenities && booking.listingId.amenities.length > 0 && (
                    <div>
                      <strong>Amenities:</strong>
                      <div className="mt-1">
                        {booking.listingId.amenities.map((amenity, index) => (
                          <Badge key={index} bg="secondary" className="me-1 mb-1">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    <Button
                      variant="outline-primary"
                      onClick={() => navigate(`/listing/${booking.listingId._id}`)}
                    >
                      View Property Details
                    </Button>
                  </div>
                </>
                  )
                : (
                <Alert variant="warning">
                  This listing is no longer available. The property may have been removed.
                </Alert>
                  )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Quick Actions</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                {booking.status === 'completed' && (
                  <>
                    <Button variant="outline-primary" onClick={handleDownloadReceipt}>
                      <Download size={16} className="me-2" />
                      Download Receipt
                    </Button>
                    <Button variant="outline-secondary" onClick={handlePrint}>
                      <Printer size={16} className="me-2" />
                      Print Details
                    </Button>
                  </>
                )}

                {booking.listingId && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate(`/listing/${booking.listingId._id}`)}
                  >
                    View Property
                  </Button>
                )}

                {(isAdmin || isOwnBooking) && (
                  <Button variant="outline-info">
                    <Share2 size={16} className="me-2" />
                    Share Booking
                  </Button>
                )}

                {isAdmin && !isOwnBooking && (
                  <Button variant="outline-warning" onClick={handleContactUser}>
                    <Mail size={16} className="me-2" />
                    Contact User
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Header className="bg-light">
              <h6 className="mb-0">Booking Summary</h6>
            </Card.Header>
            <Card.Body>
              <Table borderless size="sm">
                <tbody>
                  <tr>
                    <td><strong>Reference:</strong></td>
                    <td className="text-end">
                      <code className="small">{booking.paymentReference}</code>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Status:</strong></td>
                    <td className="text-end">{getStatusBadge(booking.status)}</td>
                  </tr>
                  <tr>
                    <td><strong>Amount:</strong></td>
                    <td className="text-end">{formatCurrency(booking.amount)}</td>
                  </tr>
                  <tr>
                    <td><strong>Booked On:</strong></td>
                    <td className="text-end">{formatDate(booking.createdAt)}</td>
                  </tr>
                  {booking.paidAt && (
                    <tr>
                      <td><strong>Paid On:</strong></td>
                      <td className="text-end">{formatDate(booking.paidAt)}</td>
                    </tr>
                  )}
                  {isAdmin && (
                    <>
                      <tr>
                        <td><strong>User Email:</strong></td>
                        <td className="text-end">{booking.userEmail}</td>
                      </tr>
                      <tr>
                        <td><strong>User ID:</strong></td>
                        <td className="text-end">
                          <small>{booking.userId.substring(0, 10)}...</small>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showContactModal} onHide={() => setShowContactModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Contact User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Contact user regarding booking <strong>{booking.paymentReference}</strong></p>
          <p><strong>User Email:</strong> {booking.userEmail}</p>
          <Button variant="primary" onClick={handleContactUser}>
            <Mail size={16} className="me-2" />
            Send Email
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowContactModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default BookingDetail