import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, Carousel, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'

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
    <Card className="h-100 listing-card">
      {validImages.length > 0
        ? (
        <Carousel
          activeIndex={currentImageIndex}
          onSelect={setCurrentImageIndex}
          indicators={validImages.length > 1}
          controls={validImages.length > 1}
          interval={null}
        >
          {validImages.map((image, index) => (
            <Carousel.Item key={index}>
              <div style={{ height: '200px', overflow: 'hidden' }}>
                <img
                  src={getImageUrl(image)}
                  alt={`${listing.name} - Image ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: imageLoaded ? 'block' : 'none'
                  }}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => handleImageError(index)}
                />
                {!imageLoaded && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Spinner animation="border" size="sm" />
                  </div>
                )}
              </div>
            </Carousel.Item>
          ))}
        </Carousel>
          )
        : (
        <div style={{ height: '200px', overflow: 'hidden' }}>
          <img
            src={getPlaceholderImage()}
            alt="Placeholder"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
          )}

      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title className="h6 mb-0 flex-grow-1">
            {listing.name}
          </Card.Title>
          <Badge bg="secondary" className="ms-2">
            {listing.type}
          </Badge>
        </div>

        <div className="mb-2">
          {averageRating > 0
            ? (
                renderRatingStars(averageRating)
              )
            : (
            <small className="text-muted">No reviews yet</small>
              )}
          {totalReviews > 0 && (
            <small className="text-muted d-block">
              {totalReviews} review{totalReviews !== 1 ? 's' : ''}
            </small>
          )}
        </div>

        <div className="flex-grow-1 small">
          <div className="mb-1">
            <strong>Location:</strong> {listing.location}
          </div>
          {listing.distance && (
            <div className="mb-1">
              <strong>Distance:</strong> {listing.distance}
            </div>
          )}
          {listing.amenities && listing.amenities.length > 0 && (
            <div className="mb-1">
              <strong>Amenities:</strong> {listing.amenities.slice(0, 3).join(', ')}
              {listing.amenities.length > 3 && '...'}
            </div>
          )}
          {listing.payment && (
            <div className="mb-1">
              <strong>Payment:</strong> {listing.payment}
            </div>
          )}
        </div>

        <div className="mt-auto pt-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="h6 mb-0 text-primary">
              {formatPrice(listing.price)}
            </div>
            <div className="text-muted small">
              {formatPrice(listing.price)}
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            {user && user.uid === listing.userId
              ? (
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
                )
              : (
              <>
                {user
                  ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-fill"
                    onClick={() => handlePayment(listing._id, parsePrice(listing.price))}
                  >
                    Book Now
                  </Button>
                    )
                  : (
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
              variant="outline-info"
              size="sm"
              className="flex-fill"
              as={Link}
              to={`/listing/${listing._id}`}
            >
              Details
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}

export default ListingCard;
