import React, { useState } from 'react'
import { Modal, Form, Button, Row, Col } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import ListingCard from './ListingCard'
import ReviewModal from './ReviewModal'
import { getAuthToken } from '../hooks/useAuthToken'

function Home({
  user, listings, error, loading,
  typeFilter, setTypeFilter,
  locationFilter, setLocationFilter,
  maxPriceFilter, setMaxPriceFilter,
  paymentMessage, setPaymentMessage,
  handleSearch, handlePayment, parsePrice, fetchListings
}) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingListing, setEditingListing] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [editImages, setEditImages] = useState([])
  const [editLoading, setEditLoading] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedListing] = useState(null)
  const navigate = useNavigate()

  const handleEdit = (listing) => {
    setEditingListing(listing)
    setEditFormData({
      type: listing.type, name: listing.name,
      price: listing.price, priceValue: listing.priceValue.toString(),
      location: listing.location,
      amenities: listing.amenities.join(', '),
      distance: listing.distance || '', payment: listing.payment || ''
    })
    setEditImages(listing.images || [])
    setShowEditModal(true)
  }

  const handleEditImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 5) { setPaymentMessage('Maximum 5 images allowed.'); return }
    const imagePromises = files.map(file => {
      if (file.size > 1024 * 1024) { setPaymentMessage('Each image must be smaller than 1MB.'); return null }
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => { setPaymentMessage('Failed to read image.'); resolve(null) }
        reader.readAsDataURL(file)
      })
    }).filter(Boolean)
    Promise.all(imagePromises).then(newImageData => {
      const existing = editImages.filter(img => typeof img === 'string' && !img.startsWith('data:image/'))
      setEditImages([...existing, ...newImageData.filter(Boolean)])
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!user || !editingListing) return
    setEditLoading(true)
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const updateData = {
        type: editFormData.type, name: editFormData.name,
        price: editFormData.price, priceValue: parseInt(editFormData.priceValue) || 0,
        location: editFormData.location,
        amenities: editFormData.amenities.split(',').map(i => i.trim()).filter(Boolean),
        distance: editFormData.distance, payment: editFormData.payment,
        images: editImages.filter(img => typeof img === 'string' && img.startsWith('data:image/'))
      }
      const response = await fetch(`${backendUrl}/api/listings/${editingListing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: await getAuthToken() },
        body: JSON.stringify(updateData)
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`)
      }
      setPaymentMessage('Listing updated successfully!')
      setShowEditModal(false)
      fetchListings()
    } catch (err) {
      setPaymentMessage('Failed to update listing: ' + err.message)
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/listings/${listingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: await getAuthToken() }
      })
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
      setPaymentMessage('Listing deleted successfully!')
      fetchListings()
    } catch (err) {
      setPaymentMessage('Failed to delete listing: ' + err.message)
    }
  }

  const removeImage = (index) => {
    const imgs = [...editImages]
    imgs.splice(index, 1)
    setEditImages(imgs)
  }

  const handleReviewSubmit = async (reviewData) => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
    const response = await fetch(`${backendUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await getAuthToken() },
      body: JSON.stringify({ ...reviewData, userId: user.uid, userEmail: user.email })
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to submit review')
    }
    return response.json()
  }

  const scrollToListings = () =>
    document.getElementById('listings-section')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <>
      {/* ════════════════════════════════════════════════════
          HERO — fullscreen cinematic opening
          ════════════════════════════════════════════════════ */}
      <section className="hb-hero">

        {/* Layered depth background */}
        <div className="hb-hero-bg" />

        {/* Vertical editorial grid lines */}
        <div className="hb-hero-grid" />

        {/* Content — each element has a staggered fade-up animation */}
        <div className="hb-hero-content">

          <div className="hb-hero-eyebrow">
            Premium Accommodation · Nigeria
          </div>

          <h1 className="hb-hero-h1">
            {user ? (
              <>Welcome back,<br /><em>{user.displayName?.split(' ')[0] || 'home'}</em></>
            ) : (
              <>Find your<br /><em>perfect space</em></>
            )}
          </h1>

          <p className="hb-hero-p">
            {user
              ? 'Explore premium listings, manage your bookings and connect with hosts across Nigeria.'
              : 'Curated apartments, studios and hostels across Nigeria. Book directly with verified hosts.'
            }
          </p>

          <div className="hb-hero-ctas">
            <button className="hb-btn hb-btn-gold" onClick={scrollToListings}>
              Browse Properties
            </button>
            {!user && (
              <button className="hb-btn hb-btn-outline" onClick={() => navigate('/login')}>
                Sign In
              </button>
            )}
            {user && (
              <button className="hb-btn hb-btn-outline" onClick={() => navigate('/new-listing')}>
                List a Property
              </button>
            )}
          </div>
        </div>

        {/* Animated scroll cue */}
        <div className="hb-scroll-cue" onClick={scrollToListings} style={{ cursor: 'pointer' }}>
          <span>Scroll</span>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12l7 7 7-7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          STATS STRIP
          ════════════════════════════════════════════════════ */}
      <div className="hb-stats">
        <div className="hb-stat">
          <span className="hb-stat-n">{listings.length > 0 ? `${listings.length}+` : '—'}</span>
          <span className="hb-stat-l">Active Listings</span>
        </div>
        <div className="hb-stat">
          <span className="hb-stat-n">24h</span>
          <span className="hb-stat-l">Avg Response</span>
        </div>
        <div className="hb-stat">
          <span className="hb-stat-n">₦0</span>
          <span className="hb-stat-l">Booking Fees</span>
        </div>
        <div className="hb-stat">
          <span className="hb-stat-n">100%</span>
          <span className="hb-stat-l">Verified Hosts</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          SEARCH BAR
          ════════════════════════════════════════════════════ */}
      <div className="hb-search-wrap">
        <span className="hb-search-label">Filter Properties</span>
        <form onSubmit={handleSearch}>
          <div className="hb-search-bar">
            <select className="hb-search-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="hostel">Hostel</option>
              <option value="apartment">Apartment</option>
            </select>
            <input className="hb-search-input" type="text" placeholder="Location..." value={locationFilter} onChange={e => setLocationFilter(e.target.value)} />
            <input className="hb-search-input" type="number" placeholder="Max price (₦)" value={maxPriceFilter} onChange={e => setMaxPriceFilter(e.target.value)} />
            <button type="submit" className="hb-search-go">Search</button>
          </div>
        </form>
      </div>

      {/* ════════════════════════════════════════════════════
          LISTINGS SECTION
          ════════════════════════════════════════════════════ */}
      <section className="hb-section" id="listings-section">
        <div className="hb-section-hd">
          <div>
            <span className="hb-section-tag">Available Now</span>
            <h2 className="hb-section-title">
              {typeFilter ? typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1) + 's' : 'All'} <em>Properties</em>
            </h2>
          </div>
          {user && (
            <button className="hb-btn hb-btn-outline" onClick={() => navigate('/new-listing')}>
              + List Property
            </button>
          )}
        </div>

        {paymentMessage && <div className="hb-alert hb-alert-warn">{paymentMessage}</div>}
        {error && <div className="hb-alert hb-alert-err">{error}</div>}

        {loading && (
          <div className="hb-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="hb-card">
                <div className="hb-skeleton-img" />
                <div style={{ padding: '1.1rem' }}>
                  <div className="hb-skeleton-line w70" />
                  <div className="hb-skeleton-line w50" />
                  <div className="hb-skeleton-line w40" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="hb-grid">
            <div className="hb-empty">
              <span className="hb-empty-i">🏠</span>
              <h3>No properties found</h3>
              <p>Try adjusting your search filters</p>
            </div>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="hb-grid">
            {listings.map((listing, i) => (
              <ListingCard
                key={listing._id}
                listing={listing}
                user={user}
                handlePayment={handlePayment}
                parsePrice={parsePrice}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                index={i}
              />
            ))}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════
          EDIT MODAL
          ════════════════════════════════════════════════════ */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Edit Listing</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Control as="select" value={editFormData.type || ''} onChange={e => setEditFormData({...editFormData, type: e.target.value})} required>
                    <option value="hostel">Hostel</option>
                    <option value="apartment">Apartment</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control type="text" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price (display)</Form.Label>
                  <Form.Control type="text" value={editFormData.price || ''} onChange={e => setEditFormData({...editFormData, price: e.target.value})} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price Value (₦)</Form.Label>
                  <Form.Control type="number" value={editFormData.priceValue || ''} onChange={e => setEditFormData({...editFormData, priceValue: e.target.value})} required />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Control type="text" value={editFormData.location || ''} onChange={e => setEditFormData({...editFormData, location: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Amenities (comma separated)</Form.Label>
              <Form.Control type="text" value={editFormData.amenities || ''} onChange={e => setEditFormData({...editFormData, amenities: e.target.value})} placeholder="WiFi, Parking, Kitchen" />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Distance</Form.Label>
                  <Form.Control type="text" value={editFormData.distance || ''} onChange={e => setEditFormData({...editFormData, distance: e.target.value})} placeholder="2km from UNIOSUN" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Terms</Form.Label>
                  <Form.Control type="text" value={editFormData.payment || ''} onChange={e => setEditFormData({...editFormData, payment: e.target.value})} placeholder="Monthly, Quarterly" />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Images (max 5, each under 1MB)</Form.Label>
              <Form.Control type="file" accept="image/*" multiple onChange={handleEditImageChange} />
              {editImages.length > 0 && (
                <Row className="mt-2">
                  {editImages.map((image, index) => (
                    <Col key={index} xs={4} className="mb-2 position-relative">
                      <img src={image} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                      <Button variant="danger" size="sm" className="position-absolute top-0 end-0" onClick={() => removeImage(index)} style={{ transform: 'translate(50%,-50%)', borderRadius: '50%', width: '22px', height: '22px', padding: 0 }}>×</Button>
                    </Col>
                  ))}
                </Row>
              )}
            </Form.Group>
            <div className="d-flex gap-2 mt-2">
              <Button variant="secondary" onClick={() => setShowEditModal(false)} className="flex-fill">Cancel</Button>
              <Button type="submit" disabled={editLoading} className="flex-fill" style={{ background: 'var(--hb-gold)', border: 'none', color: 'var(--hb-black)', fontWeight: 600 }}>
                {editLoading ? 'Updating…' : 'Update Listing'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <ReviewModal
        show={showReviewModal && selectedListing !== null}
        onHide={() => setShowReviewModal(false)}
        listing={selectedListing}
        user={user}
        onSubmit={handleReviewSubmit}
      />
    </>
  )
}

export default Home