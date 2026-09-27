import React, { useState } from 'react'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../firebase'
import { useToast } from '../context/ToastContext'
import { X, Mail } from 'react-feather'

function EmailVerifyBanner({ user, onDismiss }) {
  const [sending, setSending] = useState(false)
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

  return (
    <div className="hb-verify-banner">
      <Mail size={15} />
      <span>Please verify your email address ({user.email}).</span>
      <button onClick={resend} disabled={sending}>
        {sending ? 'Sending…' : 'Resend email'}
      </button>
      <button className="hb-verify-x" onClick={onDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  )
}

export default EmailVerifyBanner