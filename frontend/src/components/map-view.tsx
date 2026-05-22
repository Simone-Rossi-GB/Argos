'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import type { Camera } from '@/lib/types'

type MapboxGLWithAccessToken = typeof import('mapbox-gl') & {
  accessToken: string
}

interface MapViewProps {
  cameras: Camera[]
  className?: string
}

const STATUS_MARKER_COLOR: Record<string, string> = {
  online: '#22c55e',
  offline: '#71717a',
  alert: '#ef4444',
}

export function MapView({ cameras, className }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const router = useRouter()
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return

    let map: mapboxgl.Map | null = null

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mapboxgl = require('mapbox-gl') as MapboxGLWithAccessToken

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
      if (!token) {
        setMapError('Token Mapbox non configurato (NEXT_PUBLIC_MAPBOX_TOKEN).')
        return
      }

      mapboxgl.accessToken = token

      map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: cameras.length > 0
          ? [cameras[0].lng, cameras[0].lat]
          : [12.4964, 41.9028],
        zoom: cameras.length > 0 ? 12 : 5,
      })

      map.on('error', (e) => {
        console.error('[MapView] Mapbox error:', e)
        setMapError('Impossibile caricare la mappa. Controlla il token Mapbox.')
      })

      map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      mapInstance.current = map
    } catch (err) {
      console.error('[MapView] Inizializzazione mappa fallita:', err)
      setMapError('Impossibile inizializzare la mappa.')
    }

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      try { map?.remove() } catch { /* già rimossa */ }
      mapInstance.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || mapError) return

    let mapboxgl: typeof import('mapbox-gl')
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mapboxgl = require('mapbox-gl') as typeof import('mapbox-gl')
    } catch {
      return
    }

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    cameras.forEach((cam) => {
      try {
        const el = document.createElement('div')
        el.style.cssText = `
          width: 14px; height: 14px;
          border-radius: 50%;
          background: ${STATUS_MARKER_COLOR[cam.status] ?? '#71717a'};
          border: 2px solid rgba(255,255,255,0.3);
          cursor: pointer;
          box-shadow: 0 0 6px ${STATUS_MARKER_COLOR[cam.status] ?? '#71717a'}88;
        `
        if (cam.status === 'alert') {
          el.style.animation = 'pulse 1.5s infinite'
        }

        const popup = new mapboxgl.Popup({ offset: 16, closeButton: false })
          .setHTML(`
            <div style="font-family:sans-serif;min-width:140px">
              <strong style="color:#fff;font-size:13px">${cam.name}</strong>
              <p style="margin:4px 0 0;font-size:11px;color:#a1a1aa">
                ${cam.module_type} · ${cam.status}
              </p>
            </div>
          `)

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([cam.lng, cam.lat])
          .setPopup(popup)
          .addTo(map)

        el.addEventListener('click', () => router.push(`/cameras/${cam.id}`))
        markersRef.current.push(marker)
      } catch (err) {
        console.error(`[MapView] Errore marker camera ${cam.id}:`, err)
      }
    })
  }, [cameras, router, mapError])

  if (mapError) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-bg-panel text-center ${className ?? ''}`}>
        <MapPin className="h-10 w-10 text-zinc-600" />
        <p className="text-sm font-medium text-zinc-400">Mappa non disponibile</p>
        <p className="max-w-xs text-xs text-zinc-600">{mapError}</p>
      </div>
    )
  }

  return <div ref={mapRef} className={className} />
}
