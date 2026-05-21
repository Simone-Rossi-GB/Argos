'use client'

import Link from 'next/link'
import { MapPin, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { cn, STATUS_COLORS, MODULE_LABELS, MODULE_ICONS, timeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Camera } from '@/lib/types'

const STATUS_ICONS = {
  online: Wifi,
  offline: WifiOff,
  alert: AlertTriangle,
}

export function CameraCard({ camera }: { camera: Camera }) {
  const StatusIcon = STATUS_ICONS[camera.status] ?? WifiOff

  return (
    <Link href={`/cameras/${camera.id}`}>
      <Card className="transition-colors hover:border-border-strong cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">{camera.name}</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span>{camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}</span>
              </div>
            </div>
            <Badge className={cn(STATUS_COLORS[camera.status], 'flex-shrink-0')}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {camera.status}
            </Badge>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-base">{MODULE_ICONS[camera.module_type]}</span>
            <span className="text-xs text-zinc-400">
              {MODULE_LABELS[camera.module_type]}
            </span>
            <span className="ml-auto text-xs text-zinc-600">{camera.default_quality}</span>
          </div>

          {camera.last_seen && (
            <p className="mt-2 text-xs text-zinc-600">
              Ultimo contatto {timeAgo(camera.last_seen)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
