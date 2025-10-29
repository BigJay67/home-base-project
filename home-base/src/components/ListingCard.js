import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, Carousel, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import './ListingCard.css'

function ListingCard ({ listing, user, handlePayment, parsePrice, handleEdit, handleDelete }) {
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageErrors, setImageErrors] = useState(new Set())

  useEffect(() => {
    const fetchRating = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
        const response = await fetch(`${backendUrl}/api/reviews/${listing._id}/average`)
        if (response.ok) {
          const data = await response.json()
          setAverageRating(data.averageRating)
          setTotalReviews(data.totalReviews)
        }
      } catch (err) {
        console.error('Error fetching rating:', err)
      }
    }

    fetchRating()
  }, [listing._id])

  const getImageUrl = (image, size = 'thumbnail') => {
    if (!image) return null

    if (typeof image === 'string') {
      return image
    }

    return image[size] || image.original || image
  }

  const getPlaceholderImage = (width = 400, height = 300) => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8f9fa"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" fill="#6c757d">No Image</text>
      </svg>
    `)}`
  }

  const handleImageError = (index) => {
    setImageErrors(prev => new Set([...prev, index]))
  }

  const validImages = listing.images ? listing.images.filter((_, index) => !imageErrors.has(index)) : []

  const formatPrice = (price) => {
    if (!price) return '₦0'
    const match = price.match(/(\d+[\d,]*\d*)(.*)/)
    if (!match) return `₦${price}`
    const numericValue = match[1].replace(/,/g, '')
    const terms = match[2] || ''
    const formattedNumeric = parseInt(numericValue).toLocaleString('en-NG')
    return `₦${formattedNumeric}${terms}`
  }

  const renderRatingStars = (rating) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <div className="d-flex align-items-center">
        <div className="d-flex">
          {[...Array(fullStars)].map((_, i) => (
            <span key={`full-${i}`} className="text-warning">★</span>
          ))}
          {hasHalfStar && <span className="text-warning">★</span>}
          {[...Array(emptyStars)].map((_, i) => (
            <span key={`empty-${i}`} className="text-muted">★</span>
          ))}
        </div>
        <small className="text-muted ms-1">
          ({rating.toFixed(1)})
        </small>
      </div>
    )
  }

  return (
    <Card className="listing-card h-100 border-0 shadow-sm">
      {validImages.length > 0 ? (
        <div className="position-relative overflow-hidden" style={{ height: '280px' }}>
          <Carousel
            activeIndex={currentImageIndex}
            onSelect={setCurrentImageIndex}
            indicators={validImages.length > 1}
            controls={validImages.length > 1}
            interval={null}
            className="h-100"
          >
            {validImages.map((image, index) => (
              <Carousel.Item key={index} className="h-100">
                <img
                  src={getImageUrl(image)}
                  alt={`${listing.name} - ${index + 1}`}
                  className="d-block w-100 h-100"
                  style={{ objectFit: 'cover' }}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => handleImageError(index)}
                />
              </Carousel.Item>
            ))}
          </Carousel>
          <button
            className="position-absolute top-0 end-0 m-3 btn p-0 border-0 bg-transparent"
            style={{ zIndex: 10 }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                strokeWidth="2"
                className="text-white"
              />
            </svg>
          </button>
        </div>
      ) : (
        <div style={{ height: '280px', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="text-muted">No Image</span>
        </div>
      )}
      <Card.Body className="p-3 d-flex flex-column">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <div className="d-flex align-items-center gap-1">
            {averageRating > 0 ? (
              <>
                <span className="fw-bold">{averageRating.toFixed(1)}</span>
                <span className="text-warning">★</span>
                {totalReviews > 0 && (
                  <span className="text-muted small">· {totalReviews} review{totalReviews > 1 ? 's' : ''}</span>
                )}
              </>
            ) : (
              <span className="text-muted small">New</span>
            )}
          </div>
          {listing.isSuperhost && (
            <Badge bg="dark" className="small px-2 py-1">Superhost</Badge>
          )}
        </div>
        <h6 className="mb-1 text-dark fw-semibold text-truncate">{listing.name}</h6>
        <p className="text-muted small mb-2 text-truncate">{listing.location}</p>
        <div className="mt-auto">
          <div className="d-flex align-items-baseline gap-1">
            <span className="fw-bold text-dark">{formatPrice(listing.price)}</span>
            <span className="text-muted small">/ {listing.payment || 'month'}</span>
          </div>
        </div>
        <div className="d-flex gap-2 mt-3">
          {user && user.uid === listing.userId ? (
            <>
              <Button
                variant="outline-primary"
                size="sm"
                className="flex-fill"
                onClick={() => handleEdit(listing)}
              >
                Edit
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                className="flex-fill"
                onClick={() => handleDelete(listing._id)}
              >
                Delete
              </Button>
            </>
          ) : (
            <>
              {user ? (
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-fill"
                  onClick={() => handlePayment(listing._id, parsePrice(listing.price))}
                >
                  Book Now
                </Button>
              ) : (
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="flex-fill"
                  as={Link}
                  to="/login"
                >
                  Log In to Book
                </Button>
              )}
            </>
          )}

          <Button
            variant="outline-secondary"
            size="sm"
            className="flex-fill"
            as={Link}
            to={`/listing/${listing._id}`}
          >
            Details
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default ListingCard;