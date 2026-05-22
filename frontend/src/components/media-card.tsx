'use client'

import { useState } from 'react'
import { AlertTriangle, Image as ImageIcon, Play, Video } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, MODULE_LABELS, SEVERITY_DOT, formatDate } from '@/lib/utils'
import type { Event, MediaClip } from '@/lib/types'

interface MediaCardProps {
  event: Event
  clip: MediaClip
  cameraName?: string
}

export function MediaCard({ event, clip, cameraName }: MediaCardProps) {
  const [photoBroken, setPhotoBroken] = useState(false)
  const [videoBroken, setVideoBroken] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  const hasPhoto = !!clip.photo_url && !photoBroken
  const hasVideo = !!clip.video_url && !videoBroken

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black">
        {hasVideo && showVideo ? (
          <video
            src={clip.video_url ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-contain"
            onError={() => setVideoBroken(true)}
          />
        ) : hasPhoto ? (
          <button
            type="button"
            onClick={() => hasVideo && setShowVideo(true)}
            className={cn(
              'group relative block h-full w-full',
              hasVideo ? 'cursor-pointer' : 'cursor-default',
            )}
          >
            <img
              src={clip.photo_url ?? undefined}
              alt={`Clip ${event.event_type}`}
              className="h-full w-full object-cover"
              onError={() => setPhotoBroken(true)}
            />
            {hasVideo && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black">
                  <Play className="h-5 w-5 fill-current" />
                </span>
              </span>
            )}
          </button>
        ) : hasVideo ? (
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500 hover:text-white"
          >
            <Video className="h-10 w-10" />
            <span className="text-xs">Riproduci video</span>
          </button>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-600">
            {photoBroken || videoBroken ? (
              <>
                <AlertTriangle className="h-8 w-8 text-amber-400" />
                <span className="text-xs text-zinc-400">Media non disponibile</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs">Nessun media</span>
              </>
            )}
          </div>
        )}

        {clip.duration != null && hasVideo && !showVideo && (
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
            {formatDuration(clip.duration)}
          </span>
        )}
      </div>

      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'block h-2 w-2 flex-shrink-0 rounded-full',
              SEVERITY_DOT[severityForType(event.event_type)],
            )}
          />
          <span className="truncate text-sm font-medium text-white">
            {MODULE_LABELS[event.event_type] ?? event.event_type}
          </span>
          <Badge className="ml-auto border-border bg-bg-hover text-zinc-400">
            {Math.round(event.confidence_score * 100)}%
          </Badge>
        </div>
        {cameraName && (
          <p className="truncate text-xs text-zinc-500">{cameraName}</p>
        )}
        <p className="text-xs text-zinc-600">{formatDate(event.timestamp)}</p>
      </CardContent>
    </Card>
  )
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function severityForType(type: string): string {
  switch (type) {
    case 'fall':
      return 'high'
    case 'intrusion':
    case 'fire':
      return 'critical'
    case 'crowd':
      return 'medium'
    default:
      return 'low'
  }
}
