import React, { useEffect, useState } from 'react'
import { ArrowUpRight, Heart, MapPin } from 'react-feather'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const imageUrl = image => typeof image === 'string' ? image : image?.medium || image?.large || image?.original || image?.thumbnail

function ListingCard({ listing, user, handleEdit, handleDelete, index = 0, isSaved = false, onToggleSaved }) {
  const [rating, setRating] = useState(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [failedImages, setFailedImages] = useState([])
  const images = (listing.images || []).map(imageUrl).filter(Boolean).filter(url => !failedImages.includes(url))
  const detailUrl = `/listing/${listing._id}`
  const isOwner = Boolean(user && user.uid === listing.createdBy)
  useEffect(() => {
    let live = true
    api.get(`/api/reviews/${listing._id}/average`, { auth: false })
      .then(data => { if (live && data.averageRating > 0) setRating({ average: data.averageRating, count: data.totalReviews || 0 }) })
      .catch(() => {})
    return () => { live = false }
  }, [listing._id])
  const price = Number.isFinite(listing.priceValue) && listing.priceValue > 0
    ? `₦${listing.priceValue.toLocaleString('en-NG')}`
    : listing.price || 'Price on request'
  const currentImage = images[Math.min(imageIndex, images.length - 1)]

  return <article className="stay-card" style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}>
    <div className="stay-card-media">
      <Link to={detailUrl} aria-label={`View ${listing.name}`}>{currentImage
        ? <img src={currentImage} alt={listing.name} loading="lazy" onError={() => { setFailedImages(current => [...current, currentImage]); setImageIndex(0) }} />
        : <div className="stay-card-placeholder"><span>HOMEBASE</span><small>Find your next space</small></div>}</Link>
      <span className="stay-card-badge">{listing.type || 'Stay'}</span>
      {onToggleSaved && <button className={`stay-card-save${isSaved ? ' saved' : ''}`} type="button" onClick={onToggleSaved} aria-label={isSaved ? `Remove ${listing.name} from saved stays` : `Save ${listing.name}`} aria-pressed={isSaved}><Heart size={18} fill={isSaved ? 'currentColor' : 'none'} /></button>}
      {images.length > 1 && <div className="stay-card-image-nav"><button type="button" onClick={() => setImageIndex(current => (current - 1 + images.length) % images.length)} aria-label={`Previous image of ${listing.name}`}>‹</button><span>{Math.min(imageIndex, images.length - 1) + 1} / {images.length}</span><button type="button" onClick={() => setImageIndex(current => (current + 1) % images.length)} aria-label={`Next image of ${listing.name}`}>›</button></div>}
    </div>
    <div className="stay-card-content">
      <div className="stay-card-meta"><span><MapPin size={14} />{listing.location}</span>{rating && <span className="stay-card-rating">★ {rating.average.toFixed(1)} <small>({rating.count})</small></span>}</div>
      <h3><Link to={detailUrl}>{listing.name}</Link></h3>
      {listing.amenities?.length > 0 && <div className="stay-card-amenities">{listing.amenities.slice(0, 2).map((amenity, i) => <span key={`${amenity}-${i}`}>{amenity}</span>)}{listing.amenities.length > 2 && <span>+{listing.amenities.length - 2} more</span>}</div>}
      <div className="stay-card-bottom"><div><span>Booking amount</span><strong>{price}</strong></div><Link to={detailUrl} aria-label={`View details for ${listing.name}`}><ArrowUpRight size={20} /></Link></div>
      {isOwner && <div className="stay-card-owner"><button onClick={() => handleEdit(listing)}>Edit listing</button><button onClick={() => handleDelete(listing._id)}>Delete</button></div>}
    </div>
  </article>
}

export default ListingCard
