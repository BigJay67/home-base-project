import { useState, useCallback, useEffect, useRef } from 'react'
import { api } from '../api/client'

function useListings () {
  const [listings, setListings] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')

  const requestId = useRef(0)
  const firstLoad = useRef(true)

  const fetchListings = useCallback(async () => {
    const myId = ++requestId.current
    setLoading(true)
    setError(null)

    const query = new URLSearchParams({ status: 'active' })
    if (typeFilter) query.append('type', typeFilter)
    if (locationFilter) query.append('location', locationFilter)
    if (maxPriceFilter) query.append('maxPrice', maxPriceFilter)
    const path = `/api/listings?${query.toString()}`

    try {
      let data
      try {
        data = await api.get(path, { auth: false, timeoutMs: 30000 })
      } catch (firstErr) {
        // A sleeping server often needs a second try. Do not retry 4xx errors.
        if (firstErr.status && firstErr.status < 500 && firstErr.status !== 0) throw firstErr
        data = await api.get(path, { auth: false, timeoutMs: 30000 })
      }
      if (myId === requestId.current) {
        setListings(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Error fetching listings:', err)
      if (myId === requestId.current) {
        setError(err.message)
      }
    } finally {
      if (myId === requestId.current) setLoading(false)
    }
  }, [typeFilter, locationFilter, maxPriceFilter])

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false
      fetchListings()
      return undefined
    }
    const timer = setTimeout(fetchListings, 350)
    return () => clearTimeout(timer)
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
    fetchListings
  }
}

export default useListings