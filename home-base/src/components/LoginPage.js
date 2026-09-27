import React, { useState } from 'react'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  sendPasswordResetEmail,
  RecaptchaVerifier
} from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Phone } from 'react-feather'
import { auth, googleProvider } from '../firebase'
import './LoginPage.css'

function LoginPage() {
  const [activeTab, setActiveTab] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const navigate = useNavigate()

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: () => {},
        'expired-callback': () => {}
      })
    }
    return window.recaptchaVerifier
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { setMessage('Please enter both email and password.'); return }
    setLoading(true); setMessage('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setMessage('success:Login successful!')
      setTimeout(() => navigate('/'), 900)
    } catch (err) {
      setMessage(getErrorMessage(err.code))
    } finally { setLoading(false) }
  }

  const handleGoogleLogin = async () => {
    setLoading(true); setMessage('')
    try {
      await signInWithPopup(auth, googleProvider)
      setMessage('success:Login successful!')
      setTimeout(() => navigate('/'), 900)
    } catch (err) {
      setMessage(getErrorMessage(err.code))
    } finally { setLoading(false) }
  }

  const handlePhoneLogin = async (e) => {
    e.preventDefault()
    if (!phoneNumber) { setMessage('Please enter your phone number.'); return }
    setLoading(true); setMessage('')
    try {
      const formatted = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+234${phoneNumber.replace(/^0/, '')}`
      const result = await signInWithPhoneNumber(auth, formatted, setupRecaptcha())
      setConfirmationResult(result)
      setMessage('success:Verification code sent!')
    } catch (err) {
      setMessage(getErrorMessage(err.code))
      if (window.recaptchaVerifier) window.recaptchaVerifier.clear()
    } finally { setLoading(false) }
  }

  const verifyCode = async (e) => {
    e.preventDefault()
    if (!verificationCode) { setMessage('Please enter the verification code.'); return }
    setLoading(true)
    try {
      await confirmationResult.confirm(verificationCode)
      setMessage('success:Verified!')
      setTimeout(() => navigate('/'), 900)
    } catch (err) {
      setMessage('Invalid verification code. Please try again.')
    } finally { setLoading(false) }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    if (!resetEmail) { setMessage('Please enter your email address.'); return }
    setLoading(true); setMessage('')
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setMessage(`success:Password reset link sent to ${resetEmail}.`)
    } catch (err) {
      setMessage(getErrorMessage(err.code))
    } finally { setLoading(false) }
  }

  const getErrorMessage = (code) => ({
    'auth/invalid-email':             'Invalid email address.',
    'auth/user-disabled':             'This account has been disabled.',
    'auth/user-not-found':            'No account found with this email.',
    'auth/wrong-password':            'Incorrect password.',
    'auth/invalid-phone-number':      'Invalid phone number format.',
    'auth/invalid-verification-code': 'Invalid verification code.',
    'auth/code-expired':              'Code has expired. Please resend.',
    'auth/too-many-requests':         'Too many attempts. Try again later.'
  }[code] || 'Login failed. Please try again.')

  const formatPhone = (v) => {
    const c = v.replace(/\D/g, '')
    if (c.length <= 3)  return c
    if (c.length <= 6)  return `${c.slice(0,3)} ${c.slice(3)}`
    if (c.length <= 10) return `${c.slice(0,3)} ${c.slice(3,6)} ${c.slice(6)}`
    return `${c.slice(0,3)} ${c.slice(3,6)} ${c.slice(6,10)}`
  }

  const isSuccess = message.startsWith('success:')
  const displayMsg = message.startsWith('success:') ? message.slice(8) : message

  return (
    <div className="lp-page">

      {/* Left panel — decorative (desktop only) */}
      <div className="lp-side">
        <div className="lp-side-bg" />
        <div className="hb-aurora" />
        <div className="lp-side-content">
          <div className="lp-side-logo">Home<em>Base</em></div>
          <h2 className="lp-side-h2">Your next<br /><em>home awaits</em></h2>
          <p className="lp-side-p">
            Premium apartments, studios and hostels across Nigeria. Message hosts directly, zero booking fees.
          </p>
          <div className="lp-side-stats">
            <div className="lp-side-stat">
              <span className="lp-side-num">Direct</span>
              <span className="lp-side-lbl">Message Hosts</span>
            </div>
            <div className="lp-side-stat">
              <span className="lp-side-num">₦0</span>
              <span className="lp-side-lbl">Booking Fees</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — the form */}
      <div className="lp-form-side">
        <div className="lp-box">

          <div className="lp-mobile-logo">Home<em>Base</em></div>

          {showForgotPassword ? (
            <>
              <h1 className="lp-title">Reset password</h1>
              <p className="lp-sub">We'll email you a reset link</p>

              {displayMsg && (
                <div className={`lp-msg ${isSuccess ? 'lp-msg-ok' : 'lp-msg-err'}`}>
                  {displayMsg}
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="lp-form">
                <div className="lp-field">
                  <label>Email Address</label>
                  <div className="lp-input-wrap">
                    <Mail size={15} className="lp-input-icon" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                <button type="submit" className="lp-submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  className="lp-ghost-btn"
                  onClick={() => { setShowForgotPassword(false); setMessage('') }}
                >
                  ← Back to Sign In
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="lp-title">Welcome back</h1>
              <p className="lp-sub">Sign in to your account</p>

              {displayMsg && (
                <div className={`lp-msg ${isSuccess ? 'lp-msg-ok' : 'lp-msg-err'}`}>
                  {displayMsg}
                </div>
              )}

              <div className="lp-tabs">
                <button
                  className={`lp-tab ${activeTab === 'email' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('email'); setMessage(''); setConfirmationResult(null) }}
                >
                  <Mail size={13} /> Email
                </button>
                <button
                  className={`lp-tab ${activeTab === 'phone' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('phone'); setMessage(''); setConfirmationResult(null) }}
                >
                  <Phone size={13} /> Phone
                </button>
              </div>

              {activeTab === 'email' && (
                <form onSubmit={handleEmailLogin} className="lp-form">
                  <div className="lp-field">
                    <label>Email Address</label>
                    <div className="lp-input-wrap">
                      <Mail size={15} className="lp-input-icon" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="lp-field">
                    <div className="lp-field-label-row">
                      <label>Password</label>
                      <button
                        type="button"
                        className="lp-forgot-link"
                        onClick={() => { setShowForgotPassword(true); setResetEmail(email); setMessage('') }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="lp-input-wrap">
                      <Lock size={15} className="lp-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Your password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        style={{ paddingRight: '2.75rem' }}
                      />
                      <button
                        type="button"
                        className="lp-eye"
                        onClick={() => setShowPassword(s => !s)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="lp-submit" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign In with Email'}
                  </button>
                </form>
              )}

              {activeTab === 'phone' && (
                !confirmationResult ? (
                  <form onSubmit={handlePhoneLogin} className="lp-form">
                    <div className="lp-field">
                      <label>Phone Number</label>
                      <div className="lp-input-wrap">
                        <Phone size={15} className="lp-input-icon" />
                        <input
                          type="tel"
                          placeholder="801 234 5678"
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(formatPhone(e.target.value))}
                          required
                        />
                      </div>
                      <span className="lp-hint">Nigerian number — no country code needed</span>
                    </div>
                    <div id="recaptcha-container" style={{ marginBottom: '1rem' }} />
                    <button type="submit" className="lp-submit" disabled={loading}>
                      {loading ? 'Sending…' : 'Send Verification Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={verifyCode} className="lp-form">
                    <div className="lp-field">
                      <label>Verification Code</label>
                      <div className="lp-input-wrap">
                        <Lock size={15} className="lp-input-icon" />
                        <input
                          type="text"
                          placeholder="6-digit code"
                          value={verificationCode}
                          onChange={e => setVerificationCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                          required
                          autoComplete="one-time-code"
                        />
                      </div>
                    </div>
                    <button type="submit" className="lp-submit" disabled={loading}>
                      {loading ? 'Verifying…' : 'Verify Code'}
                    </button>
                    <button
                      type="button"
                      className="lp-ghost-btn"
                      onClick={() => setConfirmationResult(null)}
                    >
                      ← Change Number
                    </button>
                  </form>
                )
              )}

              <div className="lp-divider"><span>or</span></div>

              <button className="lp-google" onClick={handleGoogleLogin} disabled={loading}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <p className="lp-footer-text">
                Don't have an account?{' '}
                <button type="button" className="lp-link" onClick={() => navigate('/signup')}>
                  Sign up
                </button>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default LoginPage