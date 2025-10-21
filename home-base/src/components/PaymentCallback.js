import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container, Alert, Spinner } from "react-bootstrap";

function PaymentCallback() {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const verifyPayment = async () => {
            const reference = searchParams.get('reference');
            if (!reference) {
                setMessage('No payment reference found. Redirecting...');
                setLoading(false);
                setTimeout(() => navigate('/'), 3000);
                return;
            }
            
            try {
                const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
                const response = await fetch(`${backendUrl}/api/payments/paystack/verify/${reference}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!response.ok) {
                    const text = await response.text();
                    try {
                        const errorData = JSON.parse(text);
                        throw new Error(errorData.error || `Payment verification failed: ${errorData.details || 'Unknown server error'}`);
                    } catch (jsonErr) {
                        console.error('Non-JSON response:', text);
                        throw new Error(`HTTP error! Status: ${response.status}, Response: ${text.substring(0, 100)}`);
                    }
                }
                const data = await response.json();
                console.log('Verification response:', data);
                setMessage(data.status === 'success' ? 'Payment successful! Redirecting...' : `Payment failed: ${data.message || 'Unknown error'}. Redirecting...`);
                setLoading(false);
                setTimeout(() => navigate('/'), 3000);
            } catch (err) {
                console.error('Error verifying payment:', err);
                setMessage(`Failed to verify payment: ${err.message}. Please contact support. Redirecting...`);
                setLoading(false);
                setTimeout(() => navigate('/'), 3000);
            }
        };
        verifyPayment();
    }, [navigate, searchParams]);

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