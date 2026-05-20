import type { User, Camera, Event, Alert, TokenResponse } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10170/api/v1'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('argos_token')
}

function setToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem('argos_token', token)
  } else {
    localStorage.removeItem('argos_token')
  }
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail ?? 'Errore di rete')
  }
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: async (email: string, password: string) => {
    const token = await req<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    console.log('Token ricevuto:', token)
    setToken(token.access_token)
    return token
  },

  register: (name: string, email: string, password: string) =>
    req<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  me: () => req<User>('/me'),
}

// ── Cameras ───────────────────────────────────────────────────────────────────
export const cameras = {
  list: () => req<Camera[]>('/cameras/'),

  get: (id: string) => req<Camera>(`/cameras/${id}`),

  create: (data: { name: string; lat: number; lng: number; module_type: string; default_quality?: string }) =>
    req<Camera>('/cameras/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Camera>) =>
    req<Camera>(`/cameras/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    req<void>(`/cameras/${id}`, { method: 'DELETE' }),
}

// ── Events ────────────────────────────────────────────────────────────────────
export const events = {
  list: (params?: { camera_id?: string; event_type?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.camera_id) qs.set('camera_id', params.camera_id)
    if (params?.event_type) qs.set('event_type', params.event_type)
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    return req<Event[]>(`/events/${qs.toString() ? `?${qs}` : ''}`)
  },

  get: (id: string) => req<Event>(`/events/${id}`),
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export const alerts = {
  list: (unreadOnly = false, limit = 50, offset = 0) =>
    req<Alert[]>(`/alerts/?unread_only=${unreadOnly}&limit=${limit}&offset=${offset}`),

  markRead: (id: string) =>
    req<Alert>(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify({ read_at: null }) }),
}
