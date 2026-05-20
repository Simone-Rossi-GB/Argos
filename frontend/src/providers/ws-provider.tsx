'use client'

import { createContext, useContext, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import type { WsAlertMessage } from '@/lib/types'

interface WsContextValue {
  connected: boolean
}

const WsContext = createContext<WsContextValue>({ connected: false })

export function WsProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const connectedRef = useRef(false)

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    console.log('Connettendo WebSocket a', apiUrl)
    const wsUrl = apiUrl
      ? (() => {
          const url = new URL(apiUrl)
          const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
          return `${protocol}//${url.host}/ws?token=${token}`
        })()
      : (() => {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          return `${protocol}//${window.location.host}/ws?token=${token}`
        })()
    console.log('URL WebSocket:', wsUrl)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      connectedRef.current = true
    }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as WsAlertMessage
        if (msg.type === 'new_alert') {
          queryClient.invalidateQueries({ queryKey: ['alerts'] })
          queryClient.invalidateQueries({ queryKey: ['cameras'] })
        }
      } catch {
        // messaggio non JSON, ignora
      }
    }

    ws.onclose = () => {
      connectedRef.current = false
      wsRef.current = null
      if (token) setTimeout(connect, 3000)
    }

    wsRef.current = ws
  }, [token, queryClient])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  return (
    <WsContext.Provider value={{ connected: connectedRef.current }}>
      {children}
    </WsContext.Provider>
  )
}

export const useWs = () => useContext(WsContext)
