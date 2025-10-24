import React from 'react'
import { Card, Row, Col, Badge, Button } from 'react-bootstrap'
import { Download, Printer, Share2 } from 'react-feather'

function Receipt ({ payment, onDownload, onPrint, onShare }) {
  if (!payment) return null

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

  return (
        <Card className="receipt-card border-primary">
            <Card.Body className="p-4">

                <div className="text-center mb-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="text-start">
                            <h5 className="mb-1">Home Base</h5>
                            <small className="text-muted">Accommodation Booking</small>
                        </div>
                        <Badge bg="success" className="fs-6">PAID</Badge>
                    </div>
                    <h4 className="text-primary">OFFICIAL RECEIPT</h4>
                    <small className="text-muted">Transaction #{payment.paymentReference}</small>
                </div>

                <Row className="mb-3">
                    <Col>
                        <strong>Issued To:</strong>
                        <div>{payment.userEmail}</div>
                        <small className="text-muted">User ID: {payment.userId}</small>
                    </Col>
                    <Col className="text-end">
                        <strong>Date Paid:</strong>
                        <div>{formatDate(payment.paidAt || payment.createdAt)}</div>
                    </Col>
                </Row>

                <hr />

                <Row className="mb-2">
                    <Col>
                        <strong>Description</strong>
                    </Col>
                    <Col className="text-end">
                        <strong>Amount</strong>
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Col>
                        {payment.listingId?.name || 'Accommodation Booking'}
                        {payment.listingId?.location && (
                            <div className="text-muted small">{payment.listingId.location}</div>
                        )}
                    </Col>
                    <Col className="text-end">
                        {formatCurrency(payment.amount, payment.currency)}
                    </Col>
                </Row>

                <Card className="bg-light">
                    <Card.Body className="p-3">
                        <h6 className="mb-3">Transaction Details</h6>
                        <Row className="small">
                            <Col sm={6}>
                                <div className="mb-2">
                                    <strong>Reference:</strong>
                                    <div className="text-muted">{payment.paymentReference}</div>
                                </div>
                                <div className="mb-2">
                                    <strong>Status:</strong>
                                    <div>
                                        <Badge bg="success" className="ms-1">Completed</Badge>
                                    </div>
                                </div>
                            </Col>
                            <Col sm={6}>
                                <div className="mb-2">
                                    <strong>Payment Method:</strong>
                                    <div className="text-muted">{payment.paymentMethod || 'Card'}</div>
                                </div>
                                <div className="mb-2">
                                    <strong>Channel:</strong>
                                    <div className="text-muted">{payment.receiptData?.channel || 'Online'}</div>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Row className="mt-4 pt-3 border-top">
                    <Col>
                        <h5 className="mb-0">Total Paid</h5>
                    </Col>
                    <Col className="text-end">
                        <h4 className="text-primary mb-0">
                            {formatCurrency(payment.amount, payment.currency)}
                        </h4>
                    </Col>
                </Row>

                <div className="text-center mt-4 pt-3 border-top">
                    <small className="text-muted">
                        Thank you for your business!<br />
                        This is an official receipt for your records.<br />
                        For inquiries, contact support@homebase.com
                    </small>
                </div>
            </Card.Body>

            <Card.Footer className="bg-transparent">
                <div className="d-flex gap-2 justify-content-center">
                    <Button variant="primary" onClick={onDownload}>
                        <Download size={16} className="me-2" />
                        Download PDF
                    </Button>
                    <Button variant="outline-secondary" onClick={onPrint}>
                        <Printer size={16} className="me-2" />
                        Print
                    </Button>
                    <Button variant="outline-info" onClick={onShare}>
                        <Share2 size={16} className="me-2" />
                        Share
                    </Button>
                </div>
            </Card.Footer>
        </Card>
  )
}

export default Receipt
