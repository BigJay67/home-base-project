import { getAuthToken } from '../hooks/useAuthToken'

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

class ApiError extends Error {
  constructor (message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function request (path, { method = 'GET', body, auth = true, timeoutMs = 20000, headers = {} } = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const finalHeaders = { ...headers }
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json'
  if (auth) {
    const token = await getAuthToken()
    if (token) finalHeaders.Authorization = token
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : await response.text()

    if (!response.ok) {
      const message = (data && data.error) || `Request failed (HTTP ${response.status})`
      throw new ApiError(message, response.status, data)
    }
    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('The server is taking too long to respond.', 0)
    }
    if (err instanceof ApiError) throw err
    throw new ApiError('Cannot reach the server. Check your connection.', 0)
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  getBlob
}

async function getBlob (path, { timeoutMs = 20000 } = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const token = await getAuthToken()
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: token ? { Authorization: token } : {},
      signal: controller.signal
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new ApiError(data.error || `Request failed (HTTP ${response.status})`, response.status, data)
    }
    return response.blob()
  } catch (err) {
    if (err.name === 'AbortError') throw new ApiError('The server is taking too long to respond.', 0)
    if (err instanceof ApiError) throw err
    throw new ApiError('Cannot reach the server. Check your connection.', 0)
  } finally {
    clearTimeout(timeoutId)
  }
}

export { ApiError, BASE_URL }