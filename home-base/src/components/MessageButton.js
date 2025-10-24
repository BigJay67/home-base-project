import React, { useState } from 'react'
import { Button, Modal, Form, Alert, Spinner } from 'react-bootstrap'

function MessageButton ({ listing, user, variant = 'outline-primary', size = 'sm', className = '' }) {
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!user) {
      setError('Please log in to send messages')
      return
    }

    if (!message.trim()) {
      setError('Please enter a message')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

      const response = await fetch(`${backendUrl}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.uid
        },
        body: JSON.stringify({
          listingId: listing._id,
          message: message.trim(),
          senderId: user.uid,
          senderName: user.displayName || user.email
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }
      setSuccess('Message sent successfully!')
      setMessage('')
      setTimeout(() => {
        setShowModal(false)
        setSuccess('')
      }, 2000)
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleButtonClick = () => {
    if (!user) {
      setError('Please log in to message the host')
      return
    }
    setShowModal(true)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleButtonClick}
      >
        Message Host
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Message Host</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSendMessage}>
          <Modal.Body>
            <p className="text-muted mb-3">
              Send a message to the host of <strong>{listing.name}</strong>
            </p>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form.Group>
              <Form.Label>Your Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about availability, pricing, or any other questions..."
                disabled={loading || success}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading || !message.trim() || success}
            >
              {loading
                ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Sending...
                </>
                  )
                : (
                    'Send Message'
                  )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default MessageButton
