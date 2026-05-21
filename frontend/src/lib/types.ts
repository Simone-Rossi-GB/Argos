export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export interface Camera {
  id: string
  user_id: string
  name: string
  lat: number
  lng: number
  module_type: 'fall' | 'intrusion' | 'crowd' | 'vehicle' | 'fire'
  default_quality: '360p' | '720p' | '1080p'
  status: 'online' | 'offline' | 'alert'
  last_seen: string | null
}

export interface MediaClip {
  id: string
  event_id: string
  photo_url: string | null
  video_url: string | null
  duration: number | null
}

export interface Event {
  id: string
  camera_id: string
  event_type: string
  confidence_score: number
  timestamp: string
  media_clips: MediaClip[]
}

export interface Alert {
  id: string
  user_id: string
  event_id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  sent_at: string
  read_at: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface WsAlertMessage {
  type: 'new_alert'
  alert: {
    id: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    event_type: string
    camera_id: string
    camera_name: string
    confidence: number
    timestamp: string
  }
}
