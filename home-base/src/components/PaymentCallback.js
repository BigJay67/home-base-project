import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Alert, Spinner, Button } from 'react-bootstrap';
import { auth } from '../firebase';

function PaymentCallback({ user }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');

      if (!reference) {
        setMessage('No payment reference found. Redirecting...');
        setStatus('error');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      try {
        // Wait for Firebase to restore the user session.
        // When Paystack redirects back, Firebase takes 1-2 seconds to load.
        let currentUser = user;
        if (!currentUser) {
          currentUser = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 10000);
            const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
              clearTimeout(timeout);
              unsubscribe();
              resolve(firebaseUser);
            });
          });
        }

        if (!currentUser) {
          setMessage('Session expired. Please log in and check your payment history.');
          setStatus('error');
          return;
        }

        // Get a real Firebase JWT token
        const token = await currentUser.getIdToken();
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        };

        const response = await fetch(
          `${backendUrl}/api/payments/paystack/verify/${reference}`,
          { method: 'GET', headers }
        );

        if (!response.ok) {
          const text = await response.text();
          let errorMessage = `Verification failed (${response.status})`;
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch (_) {}
          throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data.status === 'success') {
          setMessage('Payment successful! Redirecting to payment history...');
          setStatus('success');
          setTimeout(() => navigate('/payment-history'), 3000);
        } else {
          setMessage(`Payment was not successful: ${data.message || 'Unknown error'}.`);
          setStatus('error');
          setTimeout(() => navigate('/'), 4000);
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setMessage(`Could not verify payment: ${err.message}`);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [navigate, searchParams, user, backendUrl]);

  return (
    <Container className="my-5 text-center">
      <h1 className="h3 mb-4">Payment Processing</h1>

      {status === 'loading' && (
        <div>
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Verifying your payment, please wait...</p>
          <p className="text-muted small">Do not close this page.</p>
        </div>
      )}

      {message && (
        <Alert variant={status === 'success' ? 'success' : 'danger'} className="mt-3">
          {message}
        </Alert>
      )}

      {status === 'error' && (
        <div className="mt-3">
          <p className="text-muted small mb-3">
            If your payment went through, check your Payment History.
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="primary" onClick={() => navigate('/payment-history')}>
              View Payment History
            </Button>
            <Button variant="outline-secondary" onClick={() => navigate('/')}>
              Go Home
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}

export default PaymentCallback;