import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Spinner, Form, InputGroup, Dropdown, Modal } from 'react-bootstrap'
import { Download, Search, FileText, Mail, Share2, Send, MoreVertical } from 'react-feather'
import { useNavigate } from 'react-router-dom'

function PaymentHistory ({ user }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sharing, setSharing] = useState({})
  const [emailing, setEmailing] = useState({})
  const [selectedPayments, setSelectedPayments] = useState(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkOperation, setBulkOperation] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      fetchPaymentHistory()
    }
  }, [user, filter])

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true)
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/payments/history?status=${filter}`, {
        headers: {
          Authorization: user.uid
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch payment history')
      }

      const data = await response.json()
      setPayments(data)
    } catch (err) {
      console.error('Error fetching payment history:', err)
      setError('Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReceipt = async (paymentId, template = 'standard') => {
    const payment = payments.find(p => p._id === paymentId)
    if (!payment) return

    if (payment.status !== 'completed') {
      alert(`Receipt download is only available for completed payments. Current status: ${payment.status}`)
      return
    }

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/payments/${paymentId}/receipt?template=${template}`, {
        headers: {
          Authorization: user.uid
        }
      })

      if (!response.ok) {
        throw new Error('Failed to generate receipt')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `receipt-${payment.paymentReference}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setMessage('Receipt downloaded successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Error downloading receipt:', err)
      setError('Failed to download receipt')
    }
  }

  const handleEmailReceipt = async (paymentId) => {
    const payment = payments.find(p => p._id === paymentId)
    if (!payment) return

    if (payment.status !== 'completed') {
      alert(`Receipt email is only available for completed payments. Current status: ${payment.status}`)
      return
    }

    try {
      setEmailing(prev => ({ ...prev, [paymentId]: true }))

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/payments/${paymentId}/email-receipt`, {
        method: 'POST',
        headers: {
          Authorization: user.uid
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to email receipt')
      }

      setMessage('Receipt sent to your email successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Error emailing receipt:', err)
      setError(`Failed to email receipt: ${err.message}`)
    } finally {
      setEmailing(prev => ({ ...prev, [paymentId]: false }))
    }
  }

  const handleShareReceipt = async (paymentId) => {
    const payment = payments.find(p => p._id === paymentId)
    if (!payment) return

    if (payment.status !== 'completed') {
      alert(`Shareable receipt is only available for completed payments. Current status: ${payment.status}`)
      return
    }

    try {
      setSharing(prev => ({ ...prev, [paymentId]: true }))

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/payments/${paymentId}/share`, {
        method: 'POST',
        headers: {
          Authorization: user.uid,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expiresIn: '7d' })
      })

      if (!response.ok) {
        throw new Error('Failed to create share link')
      }

      const result = await response.json()

      await navigator.clipboard.writeText(result.shareableLink)

      setMessage('Shareable link copied to clipboard!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Error sharing receipt:', err)
      setError(`Failed to create share link: ${err.message}`)
    } finally {
      setSharing(prev => ({ ...prev, [paymentId]: false }))
    }
  }

  const handleBulkEmail = async (paymentIds) => {
    const completedPayments = paymentIds.filter(id => {
      const payment = payments.find(p => p._id === id)
      return payment && payment.status === 'completed'
    })

    const pendingPayments = paymentIds.filter(id => {
      const payment = payments.find(p => p._id === id)
      return payment && payment.status !== 'completed'
    })

    if (completedPayments.length === 0) {
      alert('No completed payments selected. Receipts can only be emailed for completed payments.')
      return
    }

    if (pendingPayments.length > 0) {
      alert(`ℹ️ ${pendingPayments.length} pending payments skipped. Receipts are only available for completed payments.`)
    }

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

      for (const paymentId of completedPayments) {
        setEmailing(prev => ({ ...prev, [paymentId]: true }))

        const response = await fetch(`${backendUrl}/api/payments/${paymentId}/email-receipt`, {
          method: 'POST',
          headers: {
            Authorization: user.uid
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to email receipt for payment ${paymentId}`)
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      setMessage(`Successfully emailed ${completedPayments.length} receipts!`)
      setSelectedPayments(new Set())
    } catch (err) {
      throw err
    } finally {
      const resetEmailing = {}
      paymentIds.forEach(id => resetEmailing[id] = false)
      setEmailing(prev => ({ ...prev, ...resetEmailing }))
    }
  }

  const handleBulkDownload = async (paymentIds) => {
    const completedPayments = paymentIds.filter(id => {
      const payment = payments.find(p => p._id === id)
      return payment && payment.status === 'completed'
    })

    const pendingPayments = paymentIds.filter(id => {
      const payment = payments.find(p => p._id === id)
      return payment && payment.status !== 'completed'
    })

    if (completedPayments.length === 0) {
      alert('No completed payments selected. Receipts can only be downloaded for completed payments.')
      return
    }

    if (pendingPayments.length > 0) {
      alert(`ℹ️ ${pendingPayments.length} pending payments skipped. Receipts are only available for completed payments.`)
    }

    try {
      for (const paymentId of completedPayments) {
        await handleDownloadReceipt(paymentId)

        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (err) {
      throw err
    }
  }

  const toggleSelectAll = () => {
    if (selectedPayments.size === filteredPayments.length) {
      setSelectedPayments(new Set())
    } else {
      const allIds = new Set(filteredPayments.map(p => p._id))
      setSelectedPayments(allIds)
    }
  }

  const toggleSelectPayment = (paymentId) => {
    const newSelected = new Set(selectedPayments)
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId)
    } else {
      newSelected.add(paymentId)
    }
    setSelectedPayments(newSelected)
  }

  const handleBulkOperation = (operation) => {
    if (selectedPayments.size === 0) {
      alert('Please select at least one payment')
      return
    }

    setBulkOperation(operation)
    setShowBulkModal(true)
  }

  const confirmBulkOperation = async () => {
    const paymentIds = Array.from(selectedPayments)

    try {
      if (bulkOperation === 'email') {
        await handleBulkEmail(paymentIds)
      } else if (bulkOperation === 'download') {
        await handleBulkDownload(paymentIds)
      }
    } catch (err) {
      console.error('Bulk operation failed:', err)
      alert(`Bulk operation failed: ${err.message}`)
    } finally {
      setShowBulkModal(false)
      setBulkOperation('')
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger',
      refunded: 'info'
    }
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>
  }

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

  const filteredPayments = payments.filter(payment =>
    payment.listingId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.paymentReference.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const SelectionHeader = () => (
        <th style={{ width: '40px' }}>
            {filteredPayments.length > 0 && (
                <Form.Check
                    type="checkbox"
                    checked={selectedPayments.size === filteredPayments.length}
                    onChange={toggleSelectAll}
                    title={selectedPayments.size === filteredPayments.length ? 'Deselect all' : 'Select all'}
                />
            )}
        </th>
  )

  const SelectionCell = ({ paymentId }) => (
        <td>
            <Form.Check
                type="checkbox"
                checked={selectedPayments.has(paymentId)}
                onChange={() => toggleSelectPayment(paymentId)}
            />
        </td>
  )

  const BulkActionsToolbar = () => {
    if (selectedPayments.size === 0) return null

    return (
            <Card className="mb-3 bg-light">
                <Card.Body className="py-2">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>{selectedPayments.size} payment(s) selected</strong>
                        </div>
                        <div className="d-flex gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleBulkOperation('email')}
                                disabled={Array.from(selectedPayments).some(id => emailing[id])}
                            >
                                <Send size={14} className="me-1" />
                                Email Selected
                            </Button>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleBulkOperation('download')}
                            >
                                <Download size={14} className="me-1" />
                                Download Selected
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => setSelectedPayments(new Set())}
                            >
                                Clear Selection
                            </Button>
                        </div>
                    </div>
                </Card.Body>
            </Card>
    )
  }

  if (!user) {
    return (
            <Container className="my-5">
                <Alert variant="warning">Please log in to view your payment history.</Alert>
            </Container>
    )
  }

  return (
        <Container className="my-4 my-md-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
                <div>
                    <h1 className="h4 h-md-2 mb-1">Payment History</h1>
                    <p className="text-muted mb-0">View and download your payment receipts</p>
                </div>
                <Button variant="outline-primary" size="sm" onClick={fetchPaymentHistory}>
                    Refresh
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}

            <Card className="mb-4">
                <Card.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Filter by Status</Form.Label>
                                <Form.Select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    size="sm"
                                >
                                    <option value="all">All Payments</option>
                                    <option value="completed">Completed</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                    <option value="refunded">Refunded</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Search</Form.Label>
                                <InputGroup size="sm">
                                    <InputGroup.Text>
                                        <Search size={16} />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search by listing or reference..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <BulkActionsToolbar />

            {loading
              ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 text-muted">Loading payment history...</p>
                </div>
                )
              : (
                <>
                    {filteredPayments.length === 0
                      ? (
                        <Card>
                            <Card.Body className="text-center py-5">
                                <FileText size={48} className="text-muted mb-3" />
                                <h5>No payments found</h5>
                                <p className="text-muted">
                                    {searchTerm || filter !== 'all'
                                      ? 'Try adjusting your search or filters'
                                      : 'You haven\'t made any payments yet'
                                    }
                                </p>
                            </Card.Body>
                        </Card>
                        )
                      : (
                        <div className="table-responsive">
                            <Table hover className="align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <SelectionHeader />
                                        <th>Listing</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Reference</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayments.map((payment) => (
                                        <tr key={payment._id}>
                                            <SelectionCell paymentId={payment._id} />
                                            <td>
                                                <div>
                                                    <strong>{payment.listingId?.name || 'Deleted Listing'}</strong>
                                                    {payment.listingId?.location && (
                                                        <div className="text-muted small">
                                                            {payment.listingId.location}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <strong className="text-primary">
                                                    {formatCurrency(payment.amount, payment.currency)}
                                                </strong>
                                            </td>
                                            <td>{getStatusBadge(payment.status)}</td>
                                            <td>
                                                <div className="small">
                                                    {formatDate(payment.paidAt || payment.createdAt)}
                                                </div>
                                            </td>
                                            <td>
                                                <code className="small">{payment.paymentReference}</code>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    {payment.status === 'completed' && (
                                                        <>
                                                            <Dropdown>
                                                                <Dropdown.Toggle
                                                                    variant="outline-primary"
                                                                    size="sm"
                                                                    id="dropdown-receipt"
                                                                >
                                                                    <MoreVertical size={14} />
                                                                </Dropdown.Toggle>
                                                                <Dropdown.Menu>
                                                                    <Dropdown.Item
                                                                        onClick={() => handleDownloadReceipt(payment._id, 'standard')}
                                                                    >
                                                                        <Download size={14} className="me-2" />
                                                                        Download PDF
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Item
                                                                        onClick={() => handleDownloadReceipt(payment._id, 'minimal')}
                                                                    >
                                                                        <Download size={14} className="me-2" />
                                                                        Download Minimal
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Item
                                                                        onClick={() => handleDownloadReceipt(payment._id, 'corporate')}
                                                                    >
                                                                        <Download size={14} className="me-2" />
                                                                        Download Corporate
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Divider />
                                                                    <Dropdown.Item
                                                                        onClick={() => handleEmailReceipt(payment._id)}
                                                                        disabled={emailing[payment._id]}
                                                                    >
                                                                        <Mail size={14} className="me-2" />
                                                                        {emailing[payment._id] ? 'Sending...' : 'Email Receipt'}
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Item
                                                                        onClick={() => handleShareReceipt(payment._id)}
                                                                        disabled={sharing[payment._id]}
                                                                    >
                                                                        <Share2 size={14} className="me-2" />
                                                                        {sharing[payment._id] ? 'Sharing...' : 'Share Link'}
                                                                    </Dropdown.Item>
                                                                </Dropdown.Menu>
                                                            </Dropdown>
                                                        </>
                                                    )}
                                                    <Button
                                                        variant="outline-info"
                                                        size="sm"
                                                        onClick={() => navigate(`/bookings/${payment._id}`)}
                                                        title="View Booking Details"
                                                    >
                                                        <span className="d-none d-md-inline">View</span>
                                                        <span className="d-md-none">•••</span>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                        )}
                </>
                )}

            {!loading && payments.length > 0 && (
                <Card className="mt-4">
                    <Card.Body>
                        <Row className="text-center">
                            <Col xs={6} md={3}>
                                <div className="border-end">
                                    <h4 className="text-primary mb-1">{payments.length}</h4>
                                    <small className="text-muted">Total Payments</small>
                                </div>
                            </Col>
                            <Col xs={6} md={3}>
                                <div className="border-end">
                                    <h4 className="text-success mb-1">
                                        {payments.filter(p => p.status === 'completed').length}
                                    </h4>
                                    <small className="text-muted">Completed</small>
                                </div>
                            </Col>
                            <Col xs={6} md={3}>
                                <div className="border-end">
                                    <h4 className="text-warning mb-1">
                                        {payments.filter(p => p.status === 'pending').length}
                                    </h4>
                                    <small className="text-muted">Pending</small>
                                </div>
                            </Col>
                            <Col xs={6} md={3}>
                                <div>
                                    <h4 className="text-danger mb-1">
                                        {payments.filter(p => p.status === 'failed').length}
                                    </h4>
                                    <small className="text-muted">Failed</small>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            )}

            <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Bulk Operation</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to {bulkOperation} {selectedPayments.size} receipt(s)?
                    <br />
                    <small className="text-muted">
                        This action will process all selected payments.
                    </small>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBulkModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={confirmBulkOperation}>
                        Confirm {bulkOperation === 'email' ? 'Email' : 'Download'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
  )
}

export default PaymentHistory
