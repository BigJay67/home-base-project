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
      if (process.env.NODE_ENV === 'development') { console.log('Initializing WebSocket connection for user:', user.uid) }

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
      if (process.env.NODE_ENV === 'development') { console.log('Connecting to WebSocket server:', backendUrl) }

      const newSocket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      newSocket.on('connect', () => {
        if (process.env.NODE_ENV === 'development') { console.log('✅ Connected to WebSocket server') }
        setIsConnected(true)

        newSocket.emit('user_join', user.uid)
        if (process.env.NODE_ENV === 'development') { console.log('User joined room:', user.uid) }
      })

      newSocket.on('disconnect', (reason) => {
        if (process.env.NODE_ENV === 'development') { console.log('❌ Disconnected from WebSocket server:', reason) }
        setIsConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        console.error('🔌 WebSocket connection error:', error)
        setIsConnected(false)
      })

      newSocket.on('reconnect', (attemptNumber) => {
        if (process.env.NODE_ENV === 'development') { console.log('🔄 Reconnected to WebSocket server. Attempt:', attemptNumber) }
        setIsConnected(true)

        if (user.uid) {
          newSocket.emit('user_join', user.uid)
        }
      })

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        if (process.env.NODE_ENV === 'development') { console.log('🔄 Attempting to reconnect... Attempt:', attemptNumber) }
      })

      newSocket.on('reconnect_error', (error) => {
        console.error('🔄 Reconnection error:', error)
      })

      newSocket.on('reconnect_failed', () => {
        console.error('🔄 Reconnection failed after maximum attempts')
      })

      setSocket(newSocket)

      return () => {
        if (process.env.NODE_ENV === 'development') { console.log('🧹 Cleaning up WebSocket connection') }
        newSocket.close()
      }
    } else {
      if (socket) {
        if (process.env.NODE_ENV === 'development') { console.log('👤 User logged out, closing WebSocket') }
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
    }
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
