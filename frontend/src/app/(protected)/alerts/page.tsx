'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { alerts as alertsApi } from '@/lib/api'
import { AlertItem } from '@/components/alert-item'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function AlertsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ['alerts', unreadOnly],
    queryFn: () => alertsApi.list(unreadOnly, 100),
    refetchInterval: 30_000,
  })

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold text-white">Alert</h1>
          {!isLoading && (
            <span className="rounded-full bg-bg-card border border-border px-2 py-0.5 text-xs text-zinc-400">
              {data.length}
            </span>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <Button
            variant={!unreadOnly ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setUnreadOnly(false)}
          >
            Tutti
          </Button>
          <Button
            variant={unreadOnly ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setUnreadOnly(true)}
          >
            Non letti
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-bg-card py-16 text-center">
          <Bell className="h-10 w-10 text-zinc-600" />
          <p className="text-zinc-400">
            {unreadOnly ? 'Nessun alert non letto' : 'Nessun alert disponibile'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
