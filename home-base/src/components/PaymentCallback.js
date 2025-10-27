import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Alert, Spinner } from 'react-bootstrap';

function PaymentCallback({ user }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');

      if (!user) {
        setMessage('User not authenticated. Redirecting to login...');
        setLoading(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!reference) {
        setMessage('No payment reference found. Redirecting to bookings...');
        setLoading(false);
        setTimeout(() => navigate('/bookings'), 3000);
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/payments/paystack/verify/${reference}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: user.uid,
          },
        });

        if (!response.ok) {
          const text = await response.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(
              errorData.error || `Payment verification failed: ${errorData.details || 'Unknown server error'}`
            );
          } catch (error) {
            console.error('Non-JSON response:', text);
            throw new Error(`HTTP error! Status: ${response.status}, Response: ${text.substring(0, 100)}`);
          }
        }

        const data = await response.json();
        setMessage(
          data.status === 'success'
            ? 'Payment successful! Redirecting to bookings...'
            : `Payment failed: ${data.message || 'Unknown error'}. Redirecting to bookings...`
        );
        setLoading(false);
        setTimeout(() => navigate('/bookings'), 3000);
      } catch (err) {
        console.error('Error verifying payment:', err);
        setMessage(`Failed to verify payment: ${err.message}. Please contact support. Redirecting to bookings...`);
        setLoading(false);
        setTimeout(() => navigate('/bookings'), 3000);
      }
    };

    verifyPayment();
  }, [navigate, searchParams, user]);

  return (
    <Container className="my-5">
      <h1>Payment Processing</h1>
      {loading && (
        <div className="text-center">
          <Spinner animation="border" />
          <p>Verifying payment...</p>
        </div>
      )}
      {message && <Alert variant={message.includes('successful') ? 'success' : 'danger'}>{message}</Alert>}
    </Container>
  );
}

export default PaymentCallback;