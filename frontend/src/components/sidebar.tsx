'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Bell, Camera, LogOut, Shield, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { alerts } from '@/lib/api'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alerts', label: 'Alert', icon: Bell },
  { href: '/cameras', label: 'Telecamere', icon: Camera },
  { href: '/archive', label: 'Archivio', icon: Archive },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const { data: unreadAlerts } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: () => alerts.list(true, 100),
    refetchInterval: 30_000,
  })

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-border bg-bg-panel">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
          <Shield className="h-4 w-4 text-accent" />
        </div>
        <span className="text-base font-semibold text-white">Argos</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          const unread = href === '/alerts' ? (unreadAlerts?.length ?? 0) : 0
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-zinc-400 hover:bg-bg-hover hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-zinc-500">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-500 transition-colors hover:text-red-400"
            title="Esci"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
