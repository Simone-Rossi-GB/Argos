'use client'

import { createContext, useContext, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getToken, useAuthStore } from '@/store/auth'
import type { WsAlertMessage } from '@/lib/types'

interface WsContextValue {
  connected: boolean
}
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:10170/api/v1/ws'
const WsContext = createContext<WsContextValue>({ connected: false })

export function WsProvider({ children }: { children: React.ReactNode }) {
  const authToken = useAuthStore((s) => s.token)
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const connectedRef = useRef(false)

  const connect = useCallback(() => {
    const token = getToken()
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return

    const wsUrl = new URL(WS_URL)
    wsUrl.searchParams.set('token', token)
    const ws = new WebSocket(wsUrl.toString())

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
      if (getToken()) setTimeout(connect, 3000)
    }

    wsRef.current = ws
  }, [queryClient])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect, authToken])

  return (
    <WsContext.Provider value={{ connected: connectedRef.current }}>
      {children}
    </WsContext.Provider>
  )
}

export const useWs = () => useContext(WsContext)
