'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/sidebar'
import { WsProvider } from '@/providers/ws-provider'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) router.replace('/login')
  }, [token, router])

  if (!token) return null

  return (
    <WsProvider>
      <div className="flex h-screen overflow-hidden bg-bg-base">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </WsProvider>
  )
}
