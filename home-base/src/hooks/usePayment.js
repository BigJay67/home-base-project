import { useCallback } from 'react'
import { api } from '../api/client'

function usePayment (user, notify) {
  const handlePayment = useCallback(async (listingId, moveInDate, checkOutDate) => {
    if (!user) {
      notify('Please log in to proceed with payment.')
      return
    }
    if (!moveInDate || !checkOutDate) {
      notify('Please choose your move-in and check-out dates first.')
      return
    }
    try {
      const data = await api.post('/api/payments/paystack/initialize', {
        listingId, moveInDate, checkOutDate, userEmail: user.email || undefined
      })
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        notify('Could not start payment. No payment link was returned.')
      }
    } catch (err) {
      console.error('Error initializing payment:', err)
      notify(`Could not start payment. ${err.message}`)
    }
  }, [user, notify])

  // Kept for any remaining callers
  const parsePrice = useCallback((price) => {
    return parseInt(String(price || '').replace(/[^0-9]/g, ''), 10) || 0
  }, [])

  return { handlePayment, parsePrice }
}

export default usePayment