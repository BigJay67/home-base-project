import { useState, useEffect, useCallback } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { api, ApiError } from '../api/client'

function useAuth (notify) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUserProfile(null)
      return
    }
    try {
      setUserProfile(await api.get(`/api/users/${firebaseUser.uid}`))
    } catch (err) {
      console.error('Error loading user profile:', err)
    }
  }, [])

  const refreshUserProfile = useCallback(() => loadProfile(auth.currentUser), [loadProfile])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(
      (currentUser) => {
        setUser(currentUser)
        setAuthLoading(false)
        loadProfile(currentUser)
      },
      (error) => {
        setAuthLoading(false)
        notify('Auth error: ' + error.message)
      }
    )
    return () => unsubscribe()
  }, [loadProfile, notify])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      notify('Logged out successfully!')
    } catch (err) {
      console.error('Logout error:', err)
      const message = err instanceof ApiError ? err.message : err.message
      notify('Logout failed: ' + message)
    }
  }

  return {
    user,
    userProfile,
    authLoading,
    refreshUserProfile,
    handleSignOut
  }
}

export default useAuth