import { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

function useAuth() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');

  const refreshUserProfile = useCallback(async () => {
    if (user) {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/users/${user.uid}`, {
          headers: { 'Authorization': user.uid }
        });
        if (response.ok) {
          const profileData = await response.json();
          setUserProfile(profileData);
        }
      } catch (err) {
        console.error('Error refreshing user profile:', err);
      }
    } else {
      setUserProfile(null);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      refreshUserProfile();
    }, (error) => {
      setPaymentMessage('Auth error: ' + error.message);
    });
    return () => unsubscribe();
  }, [refreshUserProfile]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setPaymentMessage('Logged out successfully!');
    } catch (err) {
      console.error('Logout error:', err);
      setPaymentMessage('Logout failed: ' + err.message);
    }
  };

  return {
    user,
    userProfile,
    paymentMessage,
    setPaymentMessage,
    refreshUserProfile,
    handleSignOut
  };
}

export default useAuth;