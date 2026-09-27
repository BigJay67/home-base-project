import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (user && user.uid) {
      if (import.meta.env.DEV) { console.log('Initializing WebSocket connection for user:', user.uid) }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
      if (import.meta.env.DEV) { console.log('Connecting to WebSocket server:', backendUrl) }

      const newSocket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        // A fresh Firebase token is sent on every connect and reconnect
        auth: async (cb) => {
          try {
            cb({ token: await user.getIdToken() })
          } catch (err) {
            cb({})
          }
        }
      })

      newSocket.on('connect', () => {
        if (import.meta.env.DEV) { console.log('✅ Connected to WebSocket server') }
        setIsConnected(true)
      })

      newSocket.on('disconnect', (reason) => {
        if (import.meta.env.DEV) { console.log('❌ Disconnected from WebSocket server:', reason) }
        setIsConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        console.error('🔌 WebSocket connection error:', error)
        setIsConnected(false)
      })

      newSocket.on('reconnect', (attemptNumber) => {
        if (import.meta.env.DEV) { console.log('🔄 Reconnected to WebSocket server. Attempt:', attemptNumber) }
        setIsConnected(true)
      })

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        if (import.meta.env.DEV) { console.log('🔄 Attempting to reconnect... Attempt:', attemptNumber) }
      })

      newSocket.on('reconnect_error', (error) => {
        console.error('🔄 Reconnection error:', error)
      })

      newSocket.on('reconnect_failed', () => {
        console.error('🔄 Reconnection failed after maximum attempts')
      })

      setSocket(newSocket)

      return () => {
        if (import.meta.env.DEV) { console.log('🧹 Cleaning up WebSocket connection') }
        newSocket.close()
      }
    } else {
      if (socket) {
        if (import.meta.env.DEV) { console.log('👤 User logged out, closing WebSocket') }
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const value = {
    socket,
    isConnected
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}