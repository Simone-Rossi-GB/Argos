'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { alerts, events, cameras } from '@/lib/api'
import { cn, SEVERITY_COLORS, SEVERITY_DOT, MODULE_LABELS, timeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Alert } from '@/lib/types'

export function AlertItem({ alert }: { alert: Alert }) {
  const qc = useQueryClient()

  const { data: event } = useQuery({
    queryKey: ['event', alert.event_id],
    queryFn: () => events.get(alert.event_id),
  })

  const { data: camera } = useQuery({
    queryKey: ['camera', event?.camera_id],
    queryFn: () => cameras.get(event!.camera_id),
    enabled: !!event?.camera_id,
  })

  const { mutate: markRead, isPending } = useMutation({
    mutationFn: () => alerts.markRead(alert.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const isRead = !!alert.read_at

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border p-4 transition-colors',
        isRead
          ? 'border-border bg-bg-card opacity-60'
          : 'border-border bg-bg-card hover:border-border-strong'
      )}
    >
      {/* Dot */}
      <div className="mt-1 flex-shrink-0">
        <span className={cn('block h-2 w-2 rounded-full', SEVERITY_DOT[alert.severity])} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={SEVERITY_COLORS[alert.severity]}>
            {alert.severity.toUpperCase()}
          </Badge>
          {event && (
            <span className="text-sm font-medium text-white">
              {MODULE_LABELS[event.event_type] ?? event.event_type}
            </span>
          )}
          {camera && (
            <span className="text-sm text-zinc-400">· {camera.name}</span>
          )}
        </div>
        {event && (
          <p className="mt-1 text-xs text-zinc-500">
            Confidence: {Math.round(event.confidence_score * 100)}%
          </p>
        )}
        <p className="mt-1 text-xs text-zinc-500">{timeAgo(alert.sent_at)}</p>
      </div>

      {/* Action */}
      {!isRead && (
        <button
          onClick={() => markRead()}
          disabled={isPending}
          className="flex-shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-bg-hover hover:text-green-400"
          title="Segna come letto"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  )
}
