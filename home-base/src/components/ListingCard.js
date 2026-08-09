import React, { useState, useEffect } from 'react'
import { Carousel } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import './ListingCard.css'

function ListingCard({ listing, user, handlePayment, parsePrice, handleEdit, handleDelete, index = 0 }) {
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageErrors, setImageErrors] = useState(new Set())
  const [saved, setSaved] = useState(false)

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
      } catch (_) {}
    }
    fetchRating()
  }, [listing._id])

  const getImageUrl = (image) => {
    if (!image) return null
    if (typeof image === 'string') return image
    return image.thumbnail || image.original || image
  }

  const handleImageError = (i) => setImageErrors(prev => new Set([...prev, i]))

  const validImages = listing.images
    ? listing.images.filter((_, i) => !imageErrors.has(i))
    : []

  const formatPrice = (price) => {
    if (!price) return '₦0'
    const match = price.match(/(\d+[\d,]*\d*)(.*)/)
    if (!match) return `₦${price}`
    const num = parseInt(match[1].replace(/,/g, '')).toLocaleString('en-NG')
    return `₦${num}${match[2] || ''}`
  }

  const isOwner = user && user.uid === listing.userId

  return (
    <div
      className="hb-card hb-card-in"
      style={{ animationDelay: `${Math.min(index, 5) * 0.07}s` }}
    >
      {/* ── Image area ─────────────────────────────────────── */}
      {validImages.length > 0 ? (
        <div className="hb-card-img">
          <Carousel
            activeIndex={currentImageIndex}
            onSelect={setCurrentImageIndex}
            indicators={validImages.length > 1}
            controls={validImages.length > 1}
            interval={null}
            className="h-100"
          >
            {validImages.map((image, i) => (
              <Carousel.Item key={i} className="h-100">
                <img
                  src={getImageUrl(image)}
                  alt={`${listing.name} — view ${i + 1}`}
                  onError={() => handleImageError(i)}
                />
              </Carousel.Item>
            ))}
          </Carousel>

          {/* Bottom gradient for text readability */}
          <div className="hb-card-img-shade" />

          {/* Property type badge */}
          <span className="hb-card-type">{listing.type || 'Property'}</span>

          {/* Save / wishlist button */}
          <button
            className={`hb-card-fav${saved ? ' saved' : ''}`}
            onClick={() => setSaved(s => !s)}
            aria-label={saved ? 'Remove from saved' : 'Save property'}
          >
            {saved ? '♥' : '♡'}
          </button>
        </div>
      ) : (
        <div className="hb-card-img">
          <div className="hb-no-img">No image available</div>
          <span className="hb-card-type">{listing.type || 'Property'}</span>
        </div>
      )}

      {/* ── Card body ──────────────────────────────────────── */}
      <div className="hb-card-body">

        {/* Location + rating row */}
        <div className="hb-card-top">
          <span className="hb-card-loc">{listing.location}</span>
          <div className="hb-card-rating">
            {averageRating > 0 ? (
              <>
                <span className="hb-card-star">★</span>
                <span className="hb-card-rv">{averageRating.toFixed(1)}</span>
                {totalReviews > 0 && (
                  <span className="hb-card-rc">({totalReviews})</span>
                )}
              </>
            ) : (
              <span className="hb-card-rc">New</span>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="hb-card-name">{listing.name}</div>

        {/* Price */}
        <div className="hb-card-price-row">
          <span className="hb-card-price">{formatPrice(listing.price)}</span>
          <span className="hb-card-per">/ {listing.payment || 'month'}</span>
        </div>

        {/* Action buttons */}
        <div className="hb-card-acts">
          {isOwner ? (
            <>
              <button className="hb-card-act hb-act-edit" onClick={() => handleEdit(listing)}>
                Edit
              </button>
              <button className="hb-card-act hb-act-del" onClick={() => handleDelete(listing._id)}>
                Delete
              </button>
              <Link className="hb-card-act hb-act-view" to={`/listing/${listing._id}`}>
                View
              </Link>
            </>
          ) : (
            <>
              {user ? (
                <button
                  className="hb-card-act hb-act-book"
                  onClick={() => handlePayment(listing._id, parsePrice(listing.price))}
                >
                  Book Now
                </button>
              ) : (
                <Link className="hb-card-act hb-act-book" to="/login">
                  Log in to Book
                </Link>
              )}
              <Link className="hb-card-act hb-act-view" to={`/listing/${listing._id}`}>
                Details
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ListingCard