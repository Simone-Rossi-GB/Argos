'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mapboxgl = require('mapbox-gl') as MapboxGLWithAccessToken
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: cameras.length > 0
        ? [cameras[0].lng, cameras[0].lat]
        : [12.4964, 41.9028],
      zoom: cameras.length > 0 ? 12 : 5,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapInstance.current = map

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mapboxgl = require('mapbox-gl') as typeof import('mapbox-gl')

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    cameras.forEach((cam) => {
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
    })
  }, [cameras, router])

  return <div ref={mapRef} className={className} />
}
