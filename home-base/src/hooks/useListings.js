import { useState, useCallback, useEffect } from 'react'

function useListings () {
  const [listings, setListings] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const [minRatingFilter, setMinRatingFilter] = useState('')
  const [reviewKeywordFilter, setReviewKeywordFilter] = useState('')

  const fetchListings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      const query = new URLSearchParams()
      if (typeFilter) query.append('type', typeFilter)
      if (locationFilter) query.append('location', locationFilter)
      if (maxPriceFilter) query.append('maxPrice', maxPriceFilter)
      if (minRatingFilter) query.append('minRating', minRatingFilter)
      if (reviewKeywordFilter) query.append('reviewKeyword', reviewKeywordFilter)
      query.append('status', 'active')

      if (process.env.NODE_ENV === 'development') { console.log('Fetching listings from:', `${backendUrl}/api/listings?${query.toString()}`) }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const response = await fetch(`${backendUrl}/api/listings?${query.toString()}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (process.env.NODE_ENV === 'development') { console.log('Response status:', response.status) }

        if (!response.ok) {
          const text = await response.text()
          console.error('Error response:', text)
          try {
            const errorData = JSON.parse(text)
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`)
          } catch (error) {
            throw new Error(`HTTP error! Status: ${response.status}, Response: ${text.substring(0, 100)}`)
          }
        }
        const data = await response.json()
        if (process.env.NODE_ENV === 'development') { console.log('Listings loaded:', data.length) }
        setListings(data)
      } catch (fetchErr) {
        if (fetchErr.name === 'AbortError') {
          throw new Error('Request timed out after 10 seconds')
        }
        throw fetchErr
      }
    } catch (err) {
      console.error('Error fetching listings:', err)
      setError(`Failed to load listings: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, locationFilter, maxPriceFilter, minRatingFilter, reviewKeywordFilter])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  return {
    listings,
    setListings,
    error,
    setError,
    loading,
    setLoading,
    typeFilter,
    setTypeFilter,
    locationFilter,
    setLocationFilter,
    maxPriceFilter,
    setMaxPriceFilter,
    minRatingFilter,
    setMinRatingFilter,
    reviewKeywordFilter,
    setReviewKeywordFilter,
    fetchListings
  }
}

export default useListings
