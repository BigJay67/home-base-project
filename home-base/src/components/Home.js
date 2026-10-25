import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle, Compass, Heart, Home as HomeIcon, MapPin, Search, Shield, Sliders, X } from 'react-feather'
import ListingCard from './ListingCard'
import { api } from '../api/client'

const SAVED_KEY = 'homebase:saved-listings'
function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

function Home({
  user, listings, error, loading, typeFilter, setTypeFilter,
  locationFilter, setLocationFilter, maxPriceFilter, setMaxPriceFilter,
  setPaymentMessage, fetchListings
}) {
  const navigate = useNavigate()
  const [destination, setDestination] = useState(locationFilter)
  const [budget, setBudget] = useState(maxPriceFilter)
  const [sortBy, setSortBy] = useState('newest')
  const [savedOnly, setSavedOnly] = useState(false)
  const [savedIds, setSavedIds] = useState(readSaved)
  const [smartQuery, setSmartQuery] = useState('')
  const [smartOpen, setSmartOpen] = useState(false)
  const [smartLoading, setSmartLoading] = useState(false)
  const [smartSummary, setSmartSummary] = useState('')

  const scrollToListings = () => document.getElementById('listings-section')?.scrollIntoView({ behavior: 'smooth' })
  const applySearch = event => {
    event.preventDefault()
    setLocationFilter(destination.trim())
    setMaxPriceFilter(budget.trim())
    scrollToListings()
  }
  const chooseType = type => { setTypeFilter(type); scrollToListings() }
  const clearFilters = () => {
    setTypeFilter(''); setLocationFilter(''); setMaxPriceFilter('')
    setDestination(''); setBudget(''); setSmartSummary(''); setSavedOnly(false)
  }
  const runSmartSearch = async event => {
    event.preventDefault()
    if (!smartQuery.trim()) return
    setSmartLoading(true)
    try {
      const parsed = await api.post('/api/search/parse', { query: smartQuery.trim() }, { auth: false })
      const place = parsed.location || ''
      const price = parsed.maxPrice ? String(parsed.maxPrice) : ''
      setTypeFilter(parsed.type || ''); setLocationFilter(place); setMaxPriceFilter(price)
      setDestination(place); setBudget(price); setSmartSummary(smartQuery.trim())
      setSmartOpen(false); scrollToListings()
    } catch (err) { setPaymentMessage(`Search failed: ${err.message}`) }
    finally { setSmartLoading(false) }
  }
  const toggleSaved = id => setSavedIds(current => {
    const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)) } catch { /* storage may be unavailable */ }
    return next
  })
  const handleDelete = async id => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return
    try {
      await api.delete(`/api/listings/${id}`)
      setPaymentMessage('Listing deleted successfully.')
      fetchListings()
    } catch (err) { setPaymentMessage(`Could not delete listing: ${err.message}`) }
  }
  const displayedListings = useMemo(() => {
    const result = savedOnly ? listings.filter(item => savedIds.includes(item._id)) : [...listings]
    if (sortBy === 'price-low') result.sort((a, b) => (a.priceValue || 0) - (b.priceValue || 0))
    if (sortBy === 'price-high') result.sort((a, b) => (b.priceValue || 0) - (a.priceValue || 0))
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return result
  }, [listings, savedIds, savedOnly, sortBy])
  const activeFilters = Boolean(typeFilter || locationFilter || maxPriceFilter || savedOnly)

  return <main className="home-page">
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-image" role="img" aria-label="Contemporary apartment interior" />
      <div className="home-hero-overlay" />
      <div className="home-hero-content">
        <span className="home-eyebrow"><span className="home-eyebrow-dot" /> Find your place in Nigeria</span>
        <h1 id="home-hero-title">A stay that feels<br /><em>like yours.</em></h1>
        <p>Discover apartments and hostels that fit the way you live. Explore real listings, connect with hosts, and book in one place.</p>
        <button className="home-hero-link" onClick={scrollToListings}>Explore stays <ArrowRight size={18} /></button>
      </div>
      <div className="home-hero-caption">Thoughtful spaces. Better stays.</div>
    </section>

    <div className="home-search-shell">
      <form className="home-search" onSubmit={applySearch} aria-label="Find accommodation">
        <div className="home-search-heading"><span>Find your next stay</span><span>Search available properties</span></div>
        <label className="home-search-field"><span>Where</span><div><MapPin size={18} /><input value={destination} onChange={e => setDestination(e.target.value)} placeholder="City or neighbourhood" aria-label="City or neighbourhood" /></div></label>
        <label className="home-search-field"><span>Property type</span><div><HomeIcon size={18} /><select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label="Property type"><option value="">Any type</option><option value="apartment">Apartment</option><option value="hostel">Hostel</option></select></div></label>
        <label className="home-search-field home-budget-field"><span>Max budget</span><div><span className="home-naira">₦</span><input type="number" min="0" inputMode="numeric" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Any budget" aria-label="Maximum budget in naira" /></div></label>
        <button className="home-search-submit" type="submit"><Search size={19} /><span>Search stays</span></button>
      </form>
    </div>

    <section className="home-intro"><div><span className="home-kicker">THE HOMEBASE WAY</span><h2>Space to settle in.<br /><em>Room to explore.</em></h2></div><p>Whether you need a student hostel or an apartment for a longer stay, start with a space that makes sense for you.</p></section>
    <section className="home-collections" aria-label="Browse by property type">
      <button className={`home-collection home-collection-all${typeFilter === '' ? ' selected' : ''}`} onClick={() => chooseType('')}><span className="home-collection-icon"><Compass size={25} /></span><span>All spaces</span><small>Explore the full collection</small><ArrowRight size={19} /></button>
      <button className={`home-collection home-collection-apartment${typeFilter === 'apartment' ? ' selected' : ''}`} onClick={() => chooseType('apartment')}><span className="home-collection-icon"><HomeIcon size={25} /></span><span>Apartments</span><small>Your own space, your own pace</small><ArrowRight size={19} /></button>
      <button className={`home-collection home-collection-hostel${typeFilter === 'hostel' ? ' selected' : ''}`} onClick={() => chooseType('hostel')}><span className="home-collection-icon"><MapPin size={25} /></span><span>Hostels</span><small>Practical stays near your day</small><ArrowRight size={19} /></button>
    </section>

    <section className="home-listings" id="listings-section">
      <div className="home-section-head"><div><span className="home-kicker">EXPLORE STAYS</span><h2>{typeFilter ? `${typeFilter === 'hostel' ? 'Hostels' : 'Apartments'} to discover` : 'Places worth exploring'}</h2><p>Browse current listings and find a space that feels right.</p></div><div className="home-results-count">{!loading && !error ? `${displayedListings.length} ${displayedListings.length === 1 ? 'property' : 'properties'}` : 'Live listings'}</div></div>
      <div className="home-toolbar"><div className="home-filter-pills">
        <button className={!typeFilter && !savedOnly ? 'active' : ''} onClick={() => { setTypeFilter(''); setSavedOnly(false) }}>All stays</button>
        <button className={typeFilter === 'apartment' && !savedOnly ? 'active' : ''} onClick={() => { setTypeFilter('apartment'); setSavedOnly(false) }}>Apartments</button>
        <button className={typeFilter === 'hostel' && !savedOnly ? 'active' : ''} onClick={() => { setTypeFilter('hostel'); setSavedOnly(false) }}>Hostels</button>
        <button className={savedOnly ? 'active' : ''} onClick={() => setSavedOnly(value => !value)}><Heart size={15} /> Saved {savedIds.length > 0 && `(${savedIds.length})`}</button>
      </div><label className="home-sort"><Sliders size={15} /><span>Sort by</span><select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort properties"><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div>
      {(activeFilters || smartSummary) && <div className="home-active-search"><span>{smartSummary ? `“${smartSummary}”` : 'Filters applied'}{locationFilter && ` · ${locationFilter}`}{maxPriceFilter && ` · up to ₦${Number(maxPriceFilter).toLocaleString('en-NG')}`}</span><button onClick={clearFilters}><X size={14} /> Clear filters</button></div>}
      {error && <div className="home-state home-state-error"><h3>We couldn’t load stays right now.</h3><p>{error}</p><button onClick={fetchListings}>Try again <ArrowRight size={16} /></button></div>}
      {loading && !error && <div className="home-listing-grid" aria-label="Loading properties">{[1,2,3,4,5,6].map(i => <div className="home-card-skeleton" key={i}><div /><span /><span /></div>)}</div>}
      {!loading && !error && displayedListings.length === 0 && <div className="home-state"><span className="home-state-icon"><Search size={27} /></span><h3>{savedOnly ? 'No saved stays yet' : 'No stays match your search'}</h3><p>{savedOnly ? 'Tap the heart on any property to keep it here.' : 'Try another location, budget, or property type.'}</p><button onClick={clearFilters}>Browse all stays <ArrowRight size={16} /></button></div>}
      {!loading && !error && displayedListings.length > 0 && <div className="home-listing-grid">{displayedListings.map((listing, index) => <ListingCard key={listing._id} listing={listing} user={user} index={index} isSaved={savedIds.includes(listing._id)} onToggleSaved={() => toggleSaved(listing._id)} handleEdit={() => navigate('/listings')} handleDelete={handleDelete} />)}</div>}
    </section>

    <section className="home-smart" aria-labelledby="home-smart-title">
      <div className="home-smart-copy"><span className="home-kicker">A MORE NATURAL WAY TO SEARCH</span><h2 id="home-smart-title">Tell us what you need.<br /><em>We’ll find the fit.</em></h2><p>Describe your ideal space in your own words. HomeBase turns it into property filters you can adjust.</p><button className="home-outline-button" onClick={() => setSmartOpen(value => !value)} aria-expanded={smartOpen}>{smartOpen ? 'Close smart search' : 'Try smart search'} <ArrowRight size={17} /></button></div>
      <div className="home-smart-panel"><span className="home-smart-spark">✳</span><p>“I’m looking for an apartment in Lagos under ₦500,000.”</p><div><span>Apartment</span><span>Lagos</span><span>Under ₦500k</span></div></div>
      {smartOpen && <form className="home-smart-form" onSubmit={runSmartSearch}><label htmlFor="smart-search-input">Describe your ideal stay</label><div><input id="smart-search-input" value={smartQuery} onChange={e => setSmartQuery(e.target.value)} maxLength={200} placeholder="e.g. a quiet apartment in Lagos under ₦500,000" /><button disabled={smartLoading || !smartQuery.trim()}>{smartLoading ? 'Searching…' : 'Find matches'}</button></div></form>}
    </section>
    <section className="home-how" id="how-it-works"><div><span className="home-kicker">SIMPLE FROM START TO STAY</span><h2>Your next chapter<br /><em>starts here.</em></h2></div><div className="home-steps"><div><span><Search size={22} /></span><strong>01. Explore</strong><p>Search by location, type, and budget, then compare property details.</p></div><div><span><CheckCircle size={22} /></span><strong>02. Choose</strong><p>Review photos, amenities, availability, and guest feedback.</p></div><div><span><Shield size={22} /></span><strong>03. Book</strong><p>Choose your dates, book through HomeBase, and connect with your host.</p></div></div></section>
    <section className="home-host-cta"><div><span className="home-kicker">HAVE A SPACE TO SHARE?</span><h2>Good spaces deserve<br />great guests.</h2><p>Create a listing and connect with people looking for their next home base.</p></div><Link to={user ? '/new-listing' : '/signup'}>List your property <ArrowRight size={18} /></Link></section>
  </main>
}

export default Home
