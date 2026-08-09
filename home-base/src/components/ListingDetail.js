import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Modal, Form } from 'react-bootstrap'
import { ArrowLeft } from 'react-feather'
import MessageButton from './MessageButton'
import { getAuthToken } from '../hooks/useAuthToken'
import './ListingDetail.css'

function ListingDetail({ user, handlePayment, parsePrice }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviews, setReviews] = useState([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [imageErrors, setImageErrors] = useState(new Set())
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (!id || id === ':id') { setError('Invalid listing ID'); setLoading(false); return }
    fetchListing()
    fetchReviews()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchListing = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/listings/${id}`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${response.status}`)
      }
      setListing(await response.json())
      setError('')
    } catch (err) {
      setError(`Failed to load listing: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/reviews/${id}`)
      if (!response.ok) return
      const data = await response.json()
      setReviews(data.reviews || [])
      setAverageRating(data.averageRating || 0)
      setTotalReviews(data.totalReviews || 0)
    } catch (_) {}
  }

  const getImageUrl = (image) => {
    if (!image) return null
    if (typeof image === 'string') return image
    return image.original || image.thumbnail || image
  }

  const validImages = listing?.images
    ? listing.images.filter((_, i) => !imageErrors.has(i))
    : []

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    setSubmittingReview(true)
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: await getAuthToken() },
        body: JSON.stringify({
          listingId: id,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${response.status}`)
      }
      await fetchReviews()
      setShowReviewModal(false)
      setReviewForm({ rating: 5, comment: '' })
    } catch (err) {
      setError(`Failed to submit review: ${err.message}`)
    } finally {
      setSubmittingReview(false)
    }
  }

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span key={i} className={`ld-star ${i < Math.round(rating) ? 'filled' : ''}`}>★</span>
    ))
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="ld-loading">
        <div className="ld-loading-inner">
          <div className="ld-spinner" />
          <p>Loading property…</p>
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────
  if (error || !listing) {
    return (
      <div className="ld-error">
        <div className="ld-error-inner">
          <p className="ld-error-msg">{error || 'Listing not found'}</p>
          <button className="ld-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to Listings
          </button>
        </div>
      </div>
    )
  }

  const isOwner = user && user.uid === listing.createdBy

  return (
    <div className="ld-page">

      {/* ── Fullscreen image header ─────────────────────────── */}
      <div className="ld-hero">
        {validImages.length > 0 ? (
          <>
            <img
              src={getImageUrl(validImages[activeImage])}
              alt={`${listing.name} — view ${activeImage + 1}`}
              className="ld-hero-img"
              onError={() => setImageErrors(prev => new Set([...prev, activeImage]))}
            />
            <div className="ld-hero-shade" />

            {/* Thumbnail strip */}
            {validImages.length > 1 && (
              <div className="ld-thumbs">
                {validImages.map((img, i) => (
                  <button
                    key={i}
                    className={`ld-thumb ${i === activeImage ? 'active' : ''}`}
                    onClick={() => setActiveImage(i)}
                  >
                    <img
                      src={getImageUrl(img)}
                      alt={`view ${i + 1}`}
                      onError={() => setImageErrors(prev => new Set([...prev, i]))}
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="ld-hero-empty">No images available</div>
        )}

        {/* Back button floating over hero */}
        <button className="ld-back-float" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Property name overlay at bottom of hero */}
        <div className="ld-hero-info">
          <div className="ld-hero-type">{listing.type}</div>
          <h1 className="ld-hero-title">{listing.name}</h1>
          <div className="ld-hero-meta">
            <span className="ld-hero-loc">📍 {listing.location}</span>
            {averageRating > 0 && (
              <span className="ld-hero-rating">
                ★ {averageRating.toFixed(1)}
                <span className="ld-hero-rc"> ({totalReviews})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="ld-body">

        {/* Left column */}
        <div className="ld-main">

          {/* Details card */}
          <div className="ld-card">
            <h2 className="ld-card-title">Property Details</h2>
            <div className="ld-details-grid">
              <div className="ld-detail-item">
                <span className="ld-detail-label">Location</span>
                <span className="ld-detail-val">{listing.location}</span>
              </div>
              <div className="ld-detail-item">
                <span className="ld-detail-label">Type</span>
                <span className="ld-detail-val" style={{ textTransform: 'capitalize' }}>{listing.type}</span>
              </div>
              {listing.distance && (
                <div className="ld-detail-item">
                  <span className="ld-detail-label">Distance</span>
                  <span className="ld-detail-val">{listing.distance}</span>
                </div>
              )}
              {listing.payment && (
                <div className="ld-detail-item">
                  <span className="ld-detail-label">Payment Terms</span>
                  <span className="ld-detail-val">{listing.payment}</span>
                </div>
              )}
            </div>
          </div>

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div className="ld-card">
              <h2 className="ld-card-title">Amenities</h2>
              <div className="ld-amenities">
                {listing.amenities.map((a, i) => (
                  <span key={i} className="ld-amenity">✓ {a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="ld-card">
            <div className="ld-reviews-hd">
              <div>
                <h2 className="ld-card-title" style={{ marginBottom: 0 }}>
                  Reviews {totalReviews > 0 && <span className="ld-review-count">({totalReviews})</span>}
                </h2>
                {averageRating > 0 && (
                  <div className="ld-avg-rating">
                    <div className="ld-stars">{renderStars(averageRating)}</div>
                    <span className="ld-avg-num">{averageRating.toFixed(1)}</span>
                    <span className="ld-avg-sub">out of 5</span>
                  </div>
                )}
              </div>
              {user && !isOwner && (
                <button className="ld-write-review" onClick={() => setShowReviewModal(true)}>
                  Write a Review
                </button>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="ld-no-reviews">
                <p>No reviews yet. Be the first to review this property.</p>
                {!user && (
                  <button className="ld-write-review" onClick={() => navigate('/login')}>
                    Log In to Review
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="ld-reviews-list">
                  {displayedReviews.map((review, i) => (
                    <div key={i} className="ld-review-item">
                      <div className="ld-review-hd">
                        <div>
                          <span className="ld-reviewer">{review.userName || review.userEmail}</span>
                          <div className="ld-stars sm">{renderStars(review.rating)}</div>
                        </div>
                        <span className="ld-review-date">
                          {new Date(review.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="ld-review-body">{review.comment}</p>
                    </div>
                  ))}
                </div>
                {reviews.length > 3 && (
                  <button
                    className="ld-show-more"
                    onClick={() => setShowAllReviews(s => !s)}
                  >
                    {showAllReviews ? 'Show Less' : `Show All ${reviews.length} Reviews`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right sticky sidebar */}
        <aside className="ld-sidebar">
          <div className="ld-sidebar-inner">

            {/* Price */}
            <div className="ld-price-block">
              <span className="ld-price">{listing.price}</span>
              <span className="ld-per">/ {listing.payment || 'month'}</span>
            </div>

            {/* Action */}
            <div className="ld-sidebar-acts">
              {isOwner ? (
                <div className="ld-owner-note">This is your listing</div>
              ) : user ? (
                <>
                  <button
                    className="ld-book-btn"
                    onClick={() => handlePayment(listing._id, parsePrice(listing.price))}
                  >
                    Book Now
                  </button>
                  <MessageButton listing={listing} user={user} className="ld-msg-btn" />
                </>
              ) : (
                <button className="ld-book-btn" onClick={() => navigate('/login')}>
                  Log In to Book
                </button>
              )}
            </div>

            {/* Quick details */}
            <div className="ld-sidebar-details">
              <div className="ld-sd-row">
                <span>Type</span>
                <span style={{ textTransform: 'capitalize' }}>{listing.type}</span>
              </div>
              <div className="ld-sd-row">
                <span>Location</span>
                <span>{listing.location}</span>
              </div>
              {listing.distance && (
                <div className="ld-sd-row">
                  <span>Distance</span>
                  <span>{listing.distance}</span>
                </div>
              )}
              {averageRating > 0 && (
                <div className="ld-sd-row">
                  <span>Rating</span>
                  <span>★ {averageRating.toFixed(1)} ({totalReviews})</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Review modal ─────────────────────────────────────── */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Write a Review</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleReviewSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Rating</Form.Label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '1.5rem', padding: '0.1rem',
                      color: star <= reviewForm.rating ? 'var(--hb-gold)' : 'var(--hb-border2)',
                      transition: 'color 0.15s'
                    }}
                  >★</button>
                ))}
              </div>
            </Form.Group>
            <Form.Group>
              <Form.Label>Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={reviewForm.comment}
                onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                placeholder="Share your experience with this property…"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="ld-ghost-btn" onClick={() => setShowReviewModal(false)}>Cancel</button>
            <button type="submit" className="ld-book-btn sm" disabled={submittingReview}>
              {submittingReview ? 'Submitting…' : 'Submit Review'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default ListingDetail