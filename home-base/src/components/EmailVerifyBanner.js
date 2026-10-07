import React, { useState } from 'react'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../firebase'
import { useToast } from '../context/ToastContext'
import { X, Mail, RefreshCw } from 'react-feather'

function EmailVerifyBanner({ user, onDismiss }) {
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const toast = useToast()

  if (!user || user.emailVerified || !user.email) return null

  const resend = async () => {
    if (!auth.currentUser) return
    setSending(true)
    try {
      await sendEmailVerification(auth.currentUser)
      toast.success('Verification email sent — check your inbox.')
    } catch (err) {
      toast.error('Could not send verification email: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  // Firebase's ID token caches the email_verified claim at the moment it was
  // issued — clicking the verification link updates Firebase's backend
  // immediately, but this browser's token won't reflect that until it's
  // force-refreshed. This is that force-refresh.
  const refreshStatus = async () => {
    if (!auth.currentUser) return
    setRefreshing(true)
    try {
      await auth.currentUser.reload()
      await auth.currentUser.getIdToken(true)
      if (auth.currentUser.emailVerified) {
        toast.success('Email verified! Reloading…')
        setTimeout(() => window.location.reload(), 600)
      } else {
        toast.info("Still showing as unverified — check your inbox, or wait a moment after clicking the link.")
      }
    } catch (err) {
      toast.error('Could not check verification status: ' + err.message)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="hb-verify-banner">
      <Mail size={15} />
      <span>Please verify your email address ({user.email}).</span>
      <button onClick={resend} disabled={sending}>
        {sending ? 'Sending…' : 'Resend email'}
      </button>
      <button onClick={refreshStatus} disabled={refreshing}>
        <RefreshCw size={12} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
        {refreshing ? 'Checking…' : "I've verified — refresh"}
      </button>
      <button className="hb-verify-x" onClick={onDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  )
}

export default EmailVerifyBanner