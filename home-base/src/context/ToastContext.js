import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

export function ToastProvider ({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((message, type = 'info', duration = 4500) => {
    if (!message) return null
    const id = nextId.current++
    setToasts(prev => [...prev.slice(-2), { id, message: String(message), type }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  useEffect(() => {
    const active = timers.current
    return () => Object.values(active).forEach(clearTimeout)
  }, [])

  const api = useMemo(() => ({
    show,
    dismiss,
    success: (message, duration) => show(message, 'success', duration),
    error: (message, duration) => show(message, 'error', duration ?? 7000),
    info: (message, duration) => show(message, 'info', duration)
  }), [show, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="hb-toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`hb-toast hb-toast-${t.type}`}>
            <span className="hb-toast-msg">{t.message}</span>
            <button type="button" className="hb-toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}