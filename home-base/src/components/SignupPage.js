import React, { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup
} from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff } from 'react-feather'
import { auth, googleProvider } from '../firebase'
import './LoginPage.css'

function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const getErrorMessage = (code) => ({
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
    'auth/invalid-email':        'Invalid email address.',
    'auth/weak-password':        'Password should be at least 6 characters.',
  }[code] || 'Could not create your account. Please try again.')

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setMessage('Please enter your full name.'); return }
    if (password.length < 6) { setMessage('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setMessage('Passwords do not match.'); return }

    setLoading(true); setMessage('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name.trim() })
      await sendEmailVerification(cred.user)
      setMessage(`success:Account created! We've sent a verification link to ${email}.`)
      setTimeout(() => navigate('/'), 1800)
    } catch (err) {
      setMessage(getErrorMessage(err.code))
    } finally { setLoading(false) }
  }

  const handleGoogleSignup = async () => {
    setLoading(true); setMessage('')
    try {
      await signInWithPopup(auth, googleProvider)
      setMessage('success:Account created!')
      setTimeout(() => navigate('/'), 900)
    } catch (err) {
      setMessage(getErrorMessage(err.code))
    } finally { setLoading(false) }
  }

  const isSuccess = message.startsWith('success:')
  const displayMsg = isSuccess ? message.slice(8) : message

  return (
    <div className="lp-page">

      {/* Left panel — decorative (desktop only) */}
      <div className="lp-side">
        <div className="lp-side-bg" />
        <div className="hb-aurora" />
        <div className="lp-side-content">
          <div className="lp-side-logo">Home<em>Base</em></div>
          <h2 className="lp-side-h2">Join in<br /><em>minutes</em></h2>
          <p className="lp-side-p">
            Create an account to book properties, message hosts directly, and list your own space.
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

          <h1 className="lp-title">Create your account</h1>
          <p className="lp-sub">Start booking or hosting in minutes</p>

          {displayMsg && (
            <div className={`lp-msg ${isSuccess ? 'lp-msg-ok' : 'lp-msg-err'}`}>
              {displayMsg}
            </div>
          )}

          <form onSubmit={handleSignup} className="lp-form">
            <div className="lp-field">
              <label>Full Name</label>
              <div className="lp-input-wrap">
                <User size={15} className="lp-input-icon" />
                <input
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

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
              <label>Password</label>
              <div className="lp-input-wrap">
                <Lock size={15} className="lp-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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

            <div className="lp-field">
              <label>Confirm Password</label>
              <div className="lp-input-wrap">
                <Lock size={15} className="lp-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="lp-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="lp-divider"><span>or</span></div>

          <button className="lp-google" onClick={handleGoogleSignup} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="lp-footer-text">
            Already have an account?{' '}
            <button type="button" className="lp-link" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}

export default SignupPage