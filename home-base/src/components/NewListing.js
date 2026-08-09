import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, MapPin, List, Image, X } from 'react-feather'
import { getAuthToken } from '../hooks/useAuthToken'
import './NewListing.css'

function NewListing({ user }) {
  const [type, setType] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [amenities, setAmenities] = useState('')
  const [distance, setDistance] = useState('')
  const [payment, setPayment] = useState('')
  const [images, setImages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 5) { setMessage('Maximum 5 images allowed.'); setImages([]); return }

    const validFiles = files.filter(file => {
      if (file.size > 1024 * 1024) { setMessage(`File ${file.name} is too large (max 1MB each).`); return false }
      if (!file.type.startsWith('image/')) { setMessage(`File ${file.name} is not an image.`); return false }
      return true
    })

    const imagePromises = validFiles.map(file => new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => { setMessage(`Failed to read file: ${file.name}`); resolve(null) }
      reader.readAsDataURL(file)
    }))

    Promise.all(imagePromises).then(imageData => setImages(imageData.filter(Boolean)))
  }

  const removeImage = (index) => setImages(images.filter((_, i) => i !== index))

  const formatPrice = (value) => {
    const numericValue = value.replace(/[^0-9,.]/g, '')
    const formatted = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return formatted ? `₦${formatted}` : ''
  }

  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    setPrice(formatPrice(rawValue))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) { setMessage('Please log in to create a listing.'); return }
    if (!type || !name || !price || !location) {
      setMessage('Please fill in all required fields: Type, Name, Price, and Location.')
      return
    }

    setLoading(true)
    try {
      const priceValue = parseInt(price.replace(/[^0-9]/g, '')) || 0
      if (priceValue <= 0) { setMessage('Please enter a valid price.'); setLoading(false); return }

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: await getAuthToken() },
        body: JSON.stringify({
          type, name, price, priceValue, location,
          amenities: amenities.split(',').map(i => i.trim()).filter(Boolean),
          distance, payment, images
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create listing')

      setMessage('success:Listing created successfully!')
      setTimeout(() => navigate('/listings'), 1800)
    } catch (err) {
      setMessage(`Failed to create listing: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const isSuccess = message.startsWith('success:')
  const displayMsg = isSuccess ? message.slice(8) : message

  return (
    <div className="nl-page">
      <div className="nl-wrap">

        {/* Header */}
        <div className="nl-header">
          <span className="nl-eyebrow">List a Property</span>
          <h1 className="nl-title">Add your <em>space</em></h1>
          <p className="nl-sub">Fill in the details below to publish your listing to thousands of renters.</p>
        </div>

        {/* Message */}
        {displayMsg && (
          <div className={`nl-msg ${isSuccess ? 'nl-msg-ok' : 'nl-msg-err'}`}>
            {displayMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="nl-form">

          {/* Section: Basics */}
          <div className="nl-section">
            <span className="nl-section-num">01</span>
            <div className="nl-section-body">
              <h2 className="nl-section-title">The Basics</h2>
              <div className="nl-row">
                <div className="nl-field">
                  <label>Type *</label>
                  <div className="nl-input-wrap">
                    <Home size={15} className="nl-icon" />
                    <select value={type} onChange={e => setType(e.target.value)} required>
                      <option value="">Select Type</option>
                      <option value="hostel">Hostel</option>
                      <option value="apartment">Apartment</option>
                    </select>
                  </div>
                </div>
                <div className="nl-field">
                  <label>Name *</label>
                  <div className="nl-input-wrap">
                    <Home size={15} className="nl-icon" />
                    <input
                      type="text"
                      placeholder="Cozy Student Hostel"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Pricing & Location */}
          <div className="nl-section">
            <span className="nl-section-num">02</span>
            <div className="nl-section-body">
              <h2 className="nl-section-title">Pricing & Location</h2>
              <div className="nl-row">
                <div className="nl-field">
                  <label>Price *</label>
                  <div className="nl-input-wrap">
                    <span className="nl-icon-text">₦</span>
                    <input
                      type="text"
                      placeholder="40,000/month"
                      value={price}
                      onChange={handlePriceChange}
                      required
                    />
                  </div>
                  <span className="nl-hint">e.g. ₦40,000/month</span>
                </div>
                <div className="nl-field">
                  <label>Location *</label>
                  <div className="nl-input-wrap">
                    <MapPin size={15} className="nl-icon" />
                    <input
                      type="text"
                      placeholder="Osogbo"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="nl-row">
                <div className="nl-field">
                  <label>Distance</label>
                  <div className="nl-input-wrap">
                    <MapPin size={15} className="nl-icon" />
                    <input
                      type="text"
                      placeholder="2km from UNIOSUN"
                      value={distance}
                      onChange={e => setDistance(e.target.value)}
                    />
                  </div>
                </div>
                <div className="nl-field">
                  <label>Payment Terms</label>
                  <div className="nl-input-wrap">
                    <span className="nl-icon-text">₦</span>
                    <input
                      type="text"
                      placeholder="Monthly"
                      value={payment}
                      onChange={e => setPayment(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Amenities */}
          <div className="nl-section">
            <span className="nl-section-num">03</span>
            <div className="nl-section-body">
              <h2 className="nl-section-title">Amenities</h2>
              <div className="nl-field nl-field-full">
                <label>Amenities (comma separated)</label>
                <div className="nl-input-wrap">
                  <List size={15} className="nl-icon" />
                  <input
                    type="text"
                    placeholder="WiFi, Parking, Water"
                    value={amenities}
                    onChange={e => setAmenities(e.target.value)}
                  />
                </div>
                <span className="nl-hint">Separate each amenity with a comma</span>
              </div>
            </div>
          </div>

          {/* Section: Images */}
          <div className="nl-section">
            <span className="nl-section-num">04</span>
            <div className="nl-section-body">
              <h2 className="nl-section-title">Photos</h2>
              <label className="nl-upload">
                <Image size={20} />
                <span>Click to upload images</span>
                <span className="nl-upload-hint">Up to 5 images, max 1MB each</span>
                <input type="file" accept="image/*" multiple onChange={handleImageChange} hidden />
              </label>

              {images.length > 0 && (
                <div className="nl-previews">
                  {images.map((img, i) => (
                    <div key={i} className="nl-preview">
                      <img src={img} alt={`Preview ${i + 1}`} />
                      <button type="button" className="nl-preview-remove" onClick={() => removeImage(i)}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="nl-actions">
            <button type="submit" className="nl-submit" disabled={loading || !user}>
              {loading ? 'Creating…' : 'Publish Listing'}
            </button>
            <button type="button" className="nl-cancel" onClick={() => navigate('/listings')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewListing