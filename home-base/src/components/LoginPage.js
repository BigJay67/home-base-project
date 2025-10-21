import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, InputGroup } from 'react-bootstrap';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Lock, Eye, EyeOff, User, Smartphone } from 'react-feather';

function LoginPage({ setPaymentMessage }) {
  const [activeTab, setActiveTab] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const navigate = useNavigate();

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': (response) => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });
    }
    return window.recaptchaVerifier;
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage('Login successful!');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      console.error('Login error:', err);
      setMessage(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage('');
    try {
      await signInWithPopup(auth, googleProvider);
      setMessage('Google login successful!');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      console.error('Google login error:', err);
      setMessage(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      setMessage('Please enter your phone number.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+234${phoneNumber.replace(/^0/, '')}`;
      const recaptchaVerifier = setupRecaptcha();
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);
      setMessage('Verification code sent to your phone!');
    } catch (err) {
      console.error('Phone login error:', err);
      setMessage(getErrorMessage(err.code));
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      setMessage('Please enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
      setMessage('Phone verification successful!');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      console.error('Code verification error:', err);
      setMessage('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    const errorMessages = {
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-phone-number': 'Invalid phone number format.',
      'auth/invalid-verification-code': 'Invalid verification code.',
      'auth/code-expired': 'Verification code has expired.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
    };
    return errorMessages[errorCode] || 'Login failed. Please try again.';
  };

  const formatPhoneNumber = (value) => {
    
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    } else if (cleaned.length <= 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    } else {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
    }
  };

  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <Card className="shadow-lg border-0">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                     style={{ width: '60px', height: '60px' }}>
                  <User size={24} className="text-white" />
                </div>
                <h2 className="fw-bold text-primary">Welcome Back</h2>
                <p className="text-muted">Sign in to your Home Base account</p>
              </div>

              {message && (
                <Alert variant={message.includes('successful') ? 'success' : 'danger'} className="mb-3">
                  {message}
                </Alert>
              )}

              
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
                justify
              >
                
                <Tab eventKey="email" title={
                  <span className="d-flex align-items-center">
                    <Mail size={16} className="me-2" />
                    Email
                  </span>
                }>
                  <Form onSubmit={handleEmailLogin}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>
                          <Mail size={18} className="text-muted" />
                        </InputGroup.Text>
                        <Form.Control
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Password</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>
                          <Lock size={18} className="text-muted" />
                        </InputGroup.Text>
                        <Form.Control
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </InputGroup>
                    </Form.Group>

                    <Button
                      variant="primary"
                      type="submit"
                      className="w-100 py-2 fw-semibold"
                      disabled={loading}
                    >
                      {loading ? 'Signing In...' : 'Sign In with Email'}
                    </Button>
                  </Form>
                </Tab>

                
                <Tab eventKey="phone" title={
                  <span className="d-flex align-items-center">
                    <Phone size={16} className="me-2" />
                    Phone
                  </span>
                }>
                  {!confirmationResult ? (
                    <Form onSubmit={handlePhoneLogin}>
                      <Form.Group className="mb-3">
                        <Form.Label>Phone Number</Form.Label>
                        <InputGroup>
                          <InputGroup.Text>+234</InputGroup.Text>
                          <Form.Control
                            type="tel"
                            placeholder="801 234 5678"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                            required
                          />
                          <InputGroup.Text>
                            <Smartphone size={18} className="text-muted" />
                          </InputGroup.Text>
                        </InputGroup>
                        <Form.Text className="text-muted">
                          Enter your Nigerian phone number without the country code
                        </Form.Text>
                      </Form.Group>

                      
                      <div id="recaptcha-container" className="mb-3"></div>

                      <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-2 fw-semibold"
                        disabled={loading}
                      >
                        {loading ? 'Sending Code...' : 'Send Verification Code'}
                      </Button>
                    </Form>
                  ) : (
                    <Form onSubmit={verifyCode}>
                      <Form.Group className="mb-3">
                        <Form.Label>Verification Code</Form.Label>
                        <InputGroup>
                          <InputGroup.Text>
                            <Lock size={18} className="text-muted" />
                          </InputGroup.Text>
                          <Form.Control
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                          />
                        </InputGroup>
                        <Form.Text className="text-muted">
                          Enter the 6-digit code sent to your phone
                        </Form.Text>
                      </Form.Group>

                      <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-2 fw-semibold"
                        disabled={loading}
                      >
                        {loading ? 'Verifying...' : 'Verify Code'}
                      </Button>

                      <Button
                        variant="outline-secondary"
                        className="w-100 mt-2"
                        onClick={() => setConfirmationResult(null)}
                      >
                        Change Phone Number
                      </Button>
                    </Form>
                  )}
                </Tab>
              </Tabs>

              
              <div className="text-center my-4">
                <div className="border-bottom"></div>
                <span className="bg-white px-3 text-muted">OR</span>
              </div>

              
              <Button
                variant="outline-danger"
                className="w-100 py-2 fw-semibold mb-3"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <img
                  src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2LjUxIDkuMjA0NTVWOS4wOTU0NUg5LjE4VjEwLjc5NTVIMTMuNDcgMTAuMTg0QzEzLjE1IDExLjcyOTUgMTEuODkgMTIuODQ0NSAxMC4yIDEzLjE1OTVDOC41MSAxMy40NzQ1IDYuNjIgMTIuOTU5NSA1LjM5IDExLjY0NDVDNC4xNiAxMC4zMjk1IDMuNjggOC41NDQ1MyA0LjA5IDYuODQ0NTNDNC41IDUuMTQ0NTMgNS43NCAzLjc0OTUzIDcuMzkgMy4yNTQ1M0M5LjA0IDIuNzU5NTMgMTAuODkgMy4yMjQ1MyAxMi4xNyA0LjQ5OTUzTDE0LjI4IDIuMzg5NTNDMTIuNDIgMC42MTk1MjcgOS43MSAtMC4yMDA0NzMgNy4xMiAwLjA0OTUyNzJDNC41MyAwLjI5OTUyNyAyLjIyIDEuOTg5NTMgMC44NiA0LjI5OTUzQy0wLjUgNi42MDk1MyAtMC4yOSA5LjQ0OTUzIDEuMjIgMTEuNTU0NUMzLjI0IDE0LjE1OTUgNi40MiAxNS41NjQ1IDkuNDggMTUuMTU0NUMxMi4wOSAxNC44MDQ1IDE0LjM3IDEzLjA4OTUgMTUuNDIgMTAuNjU0NUMxNi4xIDkuMDM5NTUgMTYuNTEgOS4yMDQ1NSAxNi41MSA5LjIwNDU1WiIgZmlsbD0iI0RENSIvPgo8L3N2Zz4K"
                  alt="Google"
                  width="20"
                  height="20"
                  className="me-2"
                />
                Sign in with Google
              </Button>

              
              <div className="text-center mt-4">
                <p className="text-muted mb-0">
                  Don't have an account?{' '}
                  <Button
                    variant="link"
                    className="p-0 fw-semibold"
                    onClick={() => navigate('/')}
                  >
                    Explore Listings First
                  </Button>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default LoginPage;