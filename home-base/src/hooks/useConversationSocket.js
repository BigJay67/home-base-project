import { useEffect, useCallback } from 'react'

import { useSocket } from '../context/SocketContext'

export const useConversationSocket = (conversationId, user) => {
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (socket && isConnected && conversationId) {
      if (process.env.NODE_ENV === 'development') { console.log('Joining conversation room:', conversationId) }
      socket.emit('join_conversation', conversationId)

      return () => {
        if (process.env.NODE_ENV === 'development') { console.log('Leaving conversation room:', conversationId) }
        socket.emit('leave_conversation', conversationId)
      }
    }
  }, [socket, isConnected, conversationId])

  const handleNewMessage = useCallback((callback) => {
    if (!socket) return

    const handler = (data) => {
      if (process.env.NODE_ENV === 'development') { console.log('📨 New message received:', data) }
      callback(data)
    }

    socket.on('new_message', handler)
    return () => socket.off('new_message', handler)
  }, [socket])

  const handleTyping = useCallback((callback) => {
    if (!socket) return

    const handler = (data) => {
      if (process.env.NODE_ENV === 'development') { console.log('⌨️ Typing event:', data) }
      callback(data)
    }

    socket.on('user_typing', handler)
    return () => socket.off('user_typing', handler)
  }, [socket])

  const handleMessagesRead = useCallback((callback) => {
    if (!socket) return

    const handler = (data) => {
      if (process.env.NODE_ENV === 'development') { console.log('📖 Messages read event:', data) }
      callback(data)
    }

    socket.on('messages_read', handler)
    return () => socket.off('messages_read', handler)
  }, [socket])

  const sendMessage = useCallback((message) => {
    if (!socket || !isConnected) {
      throw new Error('WebSocket not connected')
    }

    if (process.env.NODE_ENV === 'development') { console.log('📤 Sending message:', { conversationId, message }) }

    socket.emit('send_message', {
      conversationId,
      message,
      senderId: user.uid
    })
  }, [socket, isConnected, conversationId, user])

  const startTyping = useCallback(() => {
    if (!socket || !isConnected) return

    if (process.env.NODE_ENV === 'development') { console.log('⌨️ Starting typing indicator') }

    socket.emit('typing_start', {
      conversationId,
      userId: user.uid
    })
  }, [socket, isConnected, conversationId, user])

  const stopTyping = useCallback(() => {
    if (!socket || !isConnected) return

    if (process.env.NODE_ENV === 'development') { console.log('🛑 Stopping typing indicator') }

    socket.emit('typing_stop', {
      conversationId,
      userId: user.uid
    })
  }, [socket, isConnected, conversationId, user])

  const markMessagesRead = useCallback(() => {
    if (!socket || !isConnected) return

    if (process.env.NODE_ENV === 'development') { console.log('📖 Marking messages as read') }

    socket.emit('mark_messages_read', {
      conversationId,
      userId: user.uid
    })
  }, [socket, isConnected, conversationId, user])

  return {
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesRead,
    handleNewMessage,
    handleTyping,
    handleMessagesRead
  }
}
