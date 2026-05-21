'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Wifi, WifiOff, AlertTriangle, Trash2 } from 'lucide-react'
import { cameras as camerasApi, events as eventsApi } from '@/lib/api'
import { VideoPlayer } from '@/components/video-player'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  cn,
  STATUS_COLORS,
  MODULE_LABELS,
  MODULE_ICONS,
  SEVERITY_COLORS,
  formatDate,
  timeAgo,
} from '@/lib/utils'

const STATUS_ICONS = {
  online: Wifi,
  offline: WifiOff,
  alert: AlertTriangle,
}

export default function CameraDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: camera, isLoading: loadingCam } = useQuery({
    queryKey: ['camera', id],
    queryFn: () => camerasApi.get(id),
  })

  const { data: cameraEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.list({ camera_id: id, limit: 20 }),
    enabled: !!id,
  })

  const { mutate: deleteCamera, isPending: deleting } = useMutation({
    mutationFn: () => camerasApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cameras'] })
      router.push('/cameras')
    },
  })

  const hlsUrl = `/hls/${id}/index.m3u8`

  if (loadingCam) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!camera) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Telecamera non trovata</p>
      </div>
    )
  }

  const StatusIcon = STATUS_ICONS[camera.status] ?? WifiOff

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-zinc-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-3">
          <span className="text-xl">{MODULE_ICONS[camera.module_type]}</span>
          <h1 className="text-lg font-semibold text-white">{camera.name}</h1>
          <Badge className={cn(STATUS_COLORS[camera.status])}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {camera.status}
          </Badge>
        </div>
        <Button
          variant="danger"
          size="sm"
          loading={deleting}
          onClick={() => {
            if (confirm(`Eliminare la telecamera "${camera.name}"?`)) deleteCamera()
          }}
        >
          <Trash2 className="h-4 w-4" />
          Elimina
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video Player */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <span className="text-sm font-medium text-white">Live stream</span>
              <span className="text-xs text-zinc-500">{camera.default_quality}</span>
            </CardHeader>
            <div className="aspect-video bg-black">
              {camera.status !== 'offline' ? (
                <VideoPlayer src={hlsUrl} className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <WifiOff className="mx-auto h-10 w-10 text-zinc-600" />
                    <p className="mt-2 text-sm text-zinc-500">Telecamera offline</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <span className="text-sm font-medium text-white">Informazioni</span>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <p className="mb-1 text-xs text-zinc-500">Modulo</p>
                <p className="text-sm text-white">
                  {MODULE_ICONS[camera.module_type]} {MODULE_LABELS[camera.module_type]}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-zinc-500">Qualità</p>
                <p className="text-sm text-white">{camera.default_quality}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-zinc-500">Posizione</p>
                <div className="flex items-center gap-1.5 text-sm text-white">
                  <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                  {camera.lat.toFixed(5)}, {camera.lng.toFixed(5)}
                </div>
              </div>
              {camera.last_seen && (
                <div>
                  <p className="mb-1 text-xs text-zinc-500">Ultimo contatto</p>
                  <p className="text-sm text-white">{timeAgo(camera.last_seen)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Events */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <span className="text-sm font-medium text-white">Ultimi eventi</span>
            <span className="text-xs text-zinc-500">{cameraEvents.length} eventi</span>
          </CardHeader>
          <CardContent className="p-0">
            {loadingEvents ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : cameraEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">Nessun evento registrato</p>
            ) : (
              <div className="divide-y divide-border">
                {cameraEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {MODULE_LABELS[evt.event_type] ?? evt.event_type}
                        </span>
                        <span className="text-xs text-zinc-500">
                          · {Math.round(evt.confidence_score * 100)}% confidence
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{formatDate(evt.timestamp)}</p>
                    </div>
                    {evt.media_clips?.[0]?.photo_url && (
                      <img
                        src={evt.media_clips[0].photo_url}
                        alt="clip"
                        className="h-12 w-20 rounded object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
