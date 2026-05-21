'use client'

import { useQuery } from '@tanstack/react-query'
import { Wifi, WifiOff, AlertTriangle, Camera } from 'lucide-react'
import { cameras as camerasApi, alerts as alertsApi } from '@/lib/api'
import { MapView } from '@/components/map-view'
import { AlertItem } from '@/components/alert-item'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: cameraList = [], isLoading: loadingCameras } = useQuery({
    queryKey: ['cameras'],
    queryFn: camerasApi.list,
    refetchInterval: 30_000,
  })

  const { data: recentAlerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['alerts', 'recent'],
    queryFn: () => alertsApi.list(false, 8),
    refetchInterval: 30_000,
  })

  const online = cameraList.filter((c) => c.status === 'online').length
  const offline = cameraList.filter((c) => c.status === 'offline').length
  const alerting = cameraList.filter((c) => c.status === 'alert').length

  return (
    <div className="flex h-full flex-col">
      {/* Stats */}
      <div className="border-b border-border bg-bg-panel px-6 py-4">
        <h1 className="mb-4 text-lg font-semibold text-white">Dashboard</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {loadingCameras ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-xl" />
            ))
          ) : (
            <>
              <StatCard icon={Camera} label="Telecamere totali" value={cameraList.length} color="bg-accent/15 text-accent" />
              <StatCard icon={Wifi} label="Online" value={online} color="bg-green-500/15 text-green-400" />
              <StatCard icon={WifiOff} label="Offline" value={offline} color="bg-zinc-500/15 text-zinc-400" />
              <StatCard icon={AlertTriangle} label="In allerta" value={alerting} color="bg-red-500/15 text-red-400" />
            </>
          )}
        </div>
      </div>

      {/* Map + Alerts */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="relative flex-1">
          {loadingCameras ? (
            <Skeleton className="h-full w-full rounded-none" />
          ) : (
            <MapView cameras={cameraList} className="h-full w-full" />
          )}
        </div>

        {/* Recent Alerts */}
        <div className="flex w-80 flex-col border-l border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium text-white">Ultimi alert</h2>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {loadingAlerts ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : recentAlerts.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-zinc-500">Nessun alert</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentAlerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
