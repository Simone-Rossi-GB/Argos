import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import { it } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: it })
}

export function formatDate(date: string) {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: it })
}

export const SEVERITY_COLORS: Record<string, string> = {
  low: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
}

export const SEVERITY_DOT: Record<string, string> = {
  low: 'bg-blue-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-400',
  critical: 'bg-red-400',
}

export const STATUS_COLORS: Record<string, string> = {
  online: 'text-green-400 bg-green-400/10 border-green-400/30',
  offline: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30',
  alert: 'text-red-400 bg-red-400/10 border-red-400/30',
}

export const MODULE_LABELS: Record<string, string> = {
  fall: 'Caduta',
  intrusion: 'Intrusione',
  crowd: 'Assembramento',
  vehicle: 'Veicolo',
  fire: 'Incendio',
}

export const MODULE_ICONS: Record<string, string> = {
  fall: '🚶',
  intrusion: '🚨',
  crowd: '👥',
  vehicle: '🚗',
  fire: '🔥',
}
