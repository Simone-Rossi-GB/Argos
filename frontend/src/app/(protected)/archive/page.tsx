'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Archive, Filter } from 'lucide-react'
import { events as eventsApi, cameras as camerasApi } from '@/lib/api'
import { MediaCard } from '@/components/media-card'
import { ErrorBoundary } from '@/components/error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { MODULE_LABELS } from '@/lib/utils'
import type { Camera, Event } from '@/lib/types'

const TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Tutti' },
  { value: 'fall', label: MODULE_LABELS.fall },
  { value: 'intrusion', label: MODULE_LABELS.intrusion },
  { value: 'crowd', label: MODULE_LABELS.crowd },
  { value: 'vehicle', label: MODULE_LABELS.vehicle },
  { value: 'fire', label: MODULE_LABELS.fire },
]

export default function ArchivePage() {
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [cameraFilter, setCameraFilter] = useState<string>('all')

  const { data: cameraList = [] } = useQuery<Camera[]>({
    queryKey: ['cameras'],
    queryFn: camerasApi.list,
  })

  const cameraById = useMemo(() => {
    const m = new Map<string, Camera>()
    for (const c of cameraList) m.set(c.id, c)
    return m
  }, [cameraList])

  const {
    data: eventList = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Event[]>({
    queryKey: ['events', 'archive', typeFilter, cameraFilter],
    queryFn: () =>
      eventsApi.list({
        limit: 100,
        event_type: typeFilter === 'all' ? undefined : typeFilter,
        camera_id: cameraFilter === 'all' ? undefined : cameraFilter,
      }),
    refetchInterval: 60_000,
  })

  const clipsWithEvent = useMemo(() => {
    const out: Array<{ event: Event; clip: Event['media_clips'][number] }> = []
    for (const evt of eventList) {
      if (!evt?.media_clips?.length) continue
      for (const clip of evt.media_clips) {
        if (!clip) continue
        if (!clip.photo_url && !clip.video_url) continue
        out.push({ event: evt, clip })
      }
    }
    return out
  }, [eventList])

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Archive className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold text-white">Archivio</h1>
        {!isLoading && !isError && (
          <span className="rounded-full border border-border bg-bg-card px-2 py-0.5 text-xs text-zinc-400">
            {clipsWithEvent.length}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-bg-card p-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Filter className="h-3.5 w-3.5" />
          Filtri
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={typeFilter === opt.value ? 'primary' : 'outline'}
              onClick={() => setTypeFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {cameraList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={cameraFilter === 'all' ? 'primary' : 'outline'}
              onClick={() => setCameraFilter('all')}
            >
              Tutte le telecamere
            </Button>
            {cameraList.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={cameraFilter === c.id ? 'primary' : 'outline'}
                onClick={() => setCameraFilter(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* States */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-bg-card py-16 text-center">
          <Archive className="h-10 w-10 text-zinc-600" />
          <p className="text-zinc-400">
            Impossibile caricare l&apos;archivio
            {error instanceof Error ? `: ${error.message}` : ''}
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Riprova
          </Button>
        </div>
      ) : clipsWithEvent.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-bg-card py-16 text-center">
          <Archive className="h-10 w-10 text-zinc-600" />
          <p className="text-zinc-400">Nessun media archiviato</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clipsWithEvent.map(({ event, clip }) => (
            <ErrorBoundary key={clip.id}>
              <MediaCard
                event={event}
                clip={clip}
                cameraName={cameraById.get(event.camera_id)?.name}
              />
            </ErrorBoundary>
          ))}
        </div>
      )}
    </div>
  )
}
