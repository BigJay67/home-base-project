import React, { useState, useEffect } from 'react'
import { Card, Button, Alert, Row, Col, Badge } from 'react-bootstrap'

function ReviewsList ({ listingId, user }) {
  const [reviews, setReviews] = useState([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!listingId) return

    fetchReviews()
    fetchAverageRating()
  }, [listingId])

  const fetchReviews = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/reviews/${listingId}`)
      if (!response.ok) throw new Error('Failed to fetch reviews')
      const data = await response.json()
      setReviews(data)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setError('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  const fetchAverageRating = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/reviews/${listingId}/average`)

      if (!response.ok) {
        if (response.status >= 500) {
          console.error('Server error fetching average rating')
          setAverageRating(0)
          setTotalReviews(0)
          return
        }
        throw new Error('Failed to fetch rating')
      }

      const data = await response.json()
      setAverageRating(data.averageRating)
      setTotalReviews(data.totalReviews)
    } catch (err) {
      console.error('Error fetching average rating:', err)
      setAverageRating(0)
      setTotalReviews(0)
    }
  }

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      })

      if (!response.ok) throw new Error('Failed to delete review')

      window.location.reload()
    } catch (error) {
      setError('Failed to delete review')
    }
  }

  if (!listingId) {
    return <Alert variant="info">No listing selected</Alert>
  }

  if (loading) return <Alert variant="info">Loading reviews...</Alert>
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div className="mt-4">
      <h4>
        Reviews {averageRating > 0 && (
          <Badge bg="warning" text="dark" className="ms-2">
            ⭐ {averageRating} ({totalReviews} reviews)
          </Badge>
      )}
      </h4>

      {reviews.length === 0
        ? (
        <Alert variant="info">No reviews yet. Be the first to review!</Alert>
          )
        : (
            reviews.map((review) => (
          <Card key={review._id} className="mb-3">
            <Card.Body>
              <Row>
                <Col>
                  <div className="d-flex align-items-center mb-2">
                    <strong>{review.userName}</strong>
                    <Badge bg="warning" text="dark" className="ms-2">
                      ⭐ {review.rating}
                    </Badge>
                    <small className="text-muted ms-2">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  <p className="mb-0">{review.comment}</p>
                </Col>
                {user && user.uid === review.userId && (
                  <Col xs="auto">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteReview(review._id)}
                    >
                      Delete
                    </Button>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
            ))
          )}
    </div>
  )
}

export default ReviewsList
