'use client'

import { useQuery } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import { cameras as camerasApi } from '@/lib/api'
import { CameraCard } from '@/components/camera-card'
import { Skeleton } from '@/components/ui/skeleton'

export default function CamerasPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['cameras'],
    queryFn: camerasApi.list,
    refetchInterval: 30_000,
  })

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Camera className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold text-white">Telecamere</h1>
        {!isLoading && (
          <span className="rounded-full bg-bg-card border border-border px-2 py-0.5 text-xs text-zinc-400">
            {data.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-bg-card py-16">
          <Camera className="h-10 w-10 text-zinc-600" />
          <p className="text-zinc-400">Nessuna telecamera registrata</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((cam) => (
            <CameraCard key={cam.id} camera={cam} />
          ))}
        </div>
      )}
    </div>
  )
}
