import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, MapPin, List, Image, X } from 'react-feather'
import { api } from '../api/client'
import './NewListing.css'

function NewListing({ user }) {
  const [type, setType] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [billingPeriod, setBillingPeriod] = useState('')
  const [location, setLocation] = useState('')
  const [amenities, setAmenities] = useState('')
  const [distance, setDistance] = useState('')
  const [payment, setPayment] = useState('')
  const [longStayTerms, setLongStayTerms] = useState('')
  const [capacity, setCapacity] = useState('1')
  const [houseRules, setHouseRules] = useState('')
  const [checkInWindow, setCheckInWindow] = useState('')
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
    if (!type || !name || !price || !billingPeriod || !location) {
      setMessage('Please fill in the property type, name, rate, billing period, and location.')
      return
    }

    setLoading(true)
    try {
      const priceValue = parseInt(price.replace(/[^0-9]/g, '')) || 0
      if (priceValue <= 0) { setMessage('Please enter a valid price.'); setLoading(false); return }

      await api.post('/api/listings', {
        type, name, description, price, priceValue, billingPeriod, location,
        amenities: amenities.split(',').map(i => i.trim()).filter(Boolean),
        distance, payment, longStayTerms, images, houseRules, checkInWindow,
        capacity: parseInt(capacity, 10) || 1
      })

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
              <div className="nl-field nl-field-full"><label>What makes this space feel like home?</label><div className="nl-input-wrap nl-textarea-wrap"><textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={3000} rows={4} placeholder="Describe the rooms, atmosphere, and what guests can expect…" /></div></div>
            </div>
          </div>

          {/* Section: Pricing & Location */}
          <div className="nl-section">
            <span className="nl-section-num">02</span>
            <div className="nl-section-body">
              <h2 className="nl-section-title">Pricing & Location</h2>
              <div className="nl-row">
                <div className="nl-field">
                  <label>Rate per billing period *</label>
                  <div className="nl-input-wrap">
                    <span className="nl-icon-text">₦</span>
                    <input
                      type="text"
                      placeholder="40,000"
                      value={price}
                      onChange={handlePriceChange}
                      required
                    />
                  </div>
                  <span className="nl-hint">The full checkout total will be this rate × the guest’s selected number of periods.</span>
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
              <div className="nl-row"><div className="nl-field"><label>Billing period *</label><div className="nl-input-wrap"><select value={billingPeriod} onChange={e => setBillingPeriod(e.target.value)} required><option value="">Choose a period</option><option value="daily">Per day</option><option value="weekly">Per week</option><option value="monthly">Per calendar month</option><option value="yearly">Per calendar year</option></select></div></div></div>
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
                  <label>Additional payment notes</label>
                  <div className="nl-input-wrap">
                    <span className="nl-icon-text">₦</span>
                    <input
                      type="text"
                      placeholder="e.g. Utilities included in the rate"
                      value={payment}
                      onChange={e => setPayment(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {(billingPeriod === 'monthly' || billingPeriod === 'yearly') && <div className="nl-field nl-field-full"><label>Long-stay terms</label><div className="nl-input-wrap nl-textarea-wrap"><textarea value={longStayTerms} onChange={e => setLongStayTerms(e.target.value)} maxLength={2000} rows={3} placeholder="Move-in process, notice period, utilities, and other terms for a longer stay…" /></div><span className="nl-hint">Guests will see these before checkout and can review the shared stay agreement after payment.</span></div>}
              <div className="nl-row">
                <div className="nl-field">
                  <label>Units available</label>
                  <div className="nl-input-wrap">
                    <Home size={15} className="nl-icon" />
                    <input
                      type="number"
                      min="1"
                      max="500"
                      placeholder="1"
                      value={capacity}
                      onChange={e => setCapacity(e.target.value)}
                    />
                  </div>
                  <span className="nl-hint">Use 1 for a single apartment, or the number of rooms/beds for a hostel</span>
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
              <h2 className="nl-section-title">Before guests book</h2>
              <div className="nl-field nl-field-full"><label>House rules</label><div className="nl-input-wrap nl-textarea-wrap"><textarea value={houseRules} onChange={e => setHouseRules(e.target.value)} maxLength={3000} rows={4} placeholder="Be clear about visitors, quiet hours, shared spaces, pets, and anything guests need to know." /></div></div>
              <div className="nl-field nl-field-full"><label>Check-in window</label><div className="nl-input-wrap"><input value={checkInWindow} onChange={e => setCheckInWindow(e.target.value)} maxLength={160} placeholder="e.g. 2:00–8:00 pm; arrange late arrival with host" /></div></div>
            </div>
          </div>

          {/* Section: Images */}
          <div className="nl-section">
            <span className="nl-section-num">05</span>
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
