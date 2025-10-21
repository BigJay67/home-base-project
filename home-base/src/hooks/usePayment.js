import { useCallback } from 'react';

function usePayment(user, setPaymentMessage) {
  const handlePayment = useCallback(async (listingId, amount, name) => {
    if (!user) {
      setPaymentMessage('Please log in to proceed with payment.');
      return;
    }
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/payments/paystack/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user.uid
        },
        body: JSON.stringify({ listingId, userId: user.uid, userEmail: user.email, amount })
      });
      if (!response.ok) {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || `Payment failed: ${errorData.details || 'Unknown server error'}`);
        } catch (jsonErr) {
          console.error('Non-JSON response:', text);
          throw new Error(`HTTP error! Status: ${response.status}, Response: ${text.substring(0, 100)}`);
        }
      }
      const data = await response.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setPaymentMessage('Payment initialization failed: ' + (data.error || 'No authorization URL returned'));
      }
    } catch (err) {
      console.error('Error initializing payment:', err);
      setPaymentMessage(`Payment initialization failed: ${err.message}. Please try again or contact support.`);
    }
  }, [user, setPaymentMessage]);

  const parsePrice = useCallback((price) => {
    const numeric = price.replace(/[^0-9,]/g, '').replace(',', '');
    return parseInt(numeric);
  }, []);

  return { handlePayment, parsePrice };
}

export default usePayment;