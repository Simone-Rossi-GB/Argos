# Argos
Sistema distribuito di sorveglianza comunitaria con telecamere intelligenti basate su AI, alert in tempo reale e dashboard con mappa interattiva.

---

## Idea generale

I telefoni fungono da telecamere intelligenti con AI on-device (MediaPipe). Un server centralizzato raccoglie eventi e stream video. L'utente monitora tutto da una dashboard web con mappa interattiva.

Le telecamere trasmettono video **solo on-demand**: quando l'AI rileva un evento oppure quando l'utente si connette manualmente. In idle consumano banda minima.

---

## Team

| Persona | Ruolo | Stack |
|---|---|---|
| Wang | Backend + DB | Python/FastAPI, PostgreSQL, MQTT |
| Busi & Viola, ovvero auraman| Frontend dashboard | Next.js, Mapbox, shadcn/ui |
| Rossi | Edge + Infra | React Native, MediaPipe, Docker |

---

## Architettura

```
┌─────────────────────────────────────────────────────┐
│                  TAILSCALE VPN MESH                  │
│               (manutenzione SSH camere)              │
└─────────────────────────────────────────────────────┘
        │                                     │
[Telefono/Camera]                      [PC Utente]
  React Native                        Next.js Dashboard
  MediaPipe module                           │
  FFmpeg encoding                            │
        │                                    │
        │── MQTT (eventi AI) ────────────────┤
        │── HLS stream (on-demand)───────────┤
        │                                    │
        ▼                                    │
 ┌──────────────────────────────────┐        │
 │        NGINX (Load Balancer)     │◄───────┘
 └──────────┬───────────────────────┘
            │
  ┌─────────┼──────────┐
  ▼         ▼          ▼
[FastAPI] [MediaMTX] [Mosquitto]
Backend   HLS Server MQTT Broker
  │
[PostgreSQL]
```

---

## Protocolli

| Scopo | Protocollo |
|---|---|
| Eventi AI da camera a server | MQTT |
| Comandi da server a camera (qualità, avvia/ferma stream) | MQTT |
| Alert real-time verso dashboard | WebSocket |
| Streaming video live (on-demand) | HLS via MediaMTX |
| API standard | REST/HTTP |
| Manutenzione SSH camere | Tailscale VPN |

---

## Modalità operative delle telecamere

```
IDLE (default)
  └── Solo AI attiva in locale, nessuno stream
  └── Invia eventi MQTT solo se rileva qualcosa

ALERT (automatica)
  └── AI rileva evento → avvia stream HLS per X secondi
  └── Invia foto HD + evento MQTT al server
  └── Server notifica dashboard via WebSocket

LIVE (manuale)
  └── Utente clicca "Connetti" sulla dashboard
  └── Server invia comando MQTT alla camera
  └── Camera avvia stream HLS
  └── Stream si ferma quando l'utente chiude
```

---

## Moduli AI (MediaPipe)

Un solo modulo attivo per camera, assegnato dall'utente:

| Modulo | Evento | Icona mappa |
|---|---|---|
| `fall` | Caduta persona | 🔴 |
| `intrusion` | Violazione perimetro | 🟠 |
| `crowd` | Folla anomala | 🟡 |
| `vehicle` | Veicolo sospetto | 🔵 |
| `fire` | Fuoco/fumo | 🟣 |

---

## Qualità video

Configurabile per ogni singola telecamera dalla dashboard (360p / 720p / 1080p).
Il comando viaggia via MQTT dal server alla camera che cambia l'encoding FFmpeg.
Le foto degli alert sono sempre a risoluzione piena del telefono.

---

## Database

```sql
users       (id, name, email, password_hash, created_at)

cameras     (id, user_id, name,
             lat, lng,
             module_type,       -- 'fall'|'intrusion'|'crowd'|'vehicle'|'fire'
             default_quality,   -- '360p'|'720p'|'1080p'
             status)            -- 'online'|'offline'|'alert'

events      (id, camera_id, event_type, confidence_score, timestamp)

media_clips (id, event_id, photo_url, video_url, duration)

alerts      (id, user_id, event_id, severity, sent_at, read_at)
```

---

## Stack tecnologico

### App telecamera
- React Native
- MediaPipe Tasks (AI on-device)
- FFmpeg Kit (encoding HLS)
- MQTT client (eventi + ricezione comandi)

### Backend
- Python + FastAPI
- Mosquitto (MQTT broker)
- MediaMTX (server HLS)
- PostgreSQL

### Dashboard
- Next.js + Tailwind CSS + shadcn/ui
- Mapbox GL JS (mappa con heatmap e icone per tipo evento)
- Video.js (player HLS)
- TanStack Query + Zustand
- Socket.io-client (alert real-time)
- Recharts (statistiche)

### Infrastruttura
- Docker Compose
- Nginx (load balancer + reverse proxy)
- Tailscale (VPN mesh per manutenzione)

---

## Docker Compose

```yaml
services:
  nginx:      # Load balancer + reverse proxy
  backend:    # FastAPI
  db:         # PostgreSQL
  mqtt:       # Mosquitto broker
  mediamtx:   # Riceve stream HLS dalle camere
```

---

## Flusso completo evento

```
1. Telefono rileva evento con MediaPipe (on-device)
2. Scatta foto HD → upload HTTP al server
3. Pubblica su MQTT: { type:"fall", cam_id:"03", confidence:0.94 }
4. Backend salva evento + alert su PostgreSQL
5. Backend notifica dashboard via WebSocket
6. Dashboard: icona lampeggia su Mapbox + card nel feed alert
7. Utente apre alert → foto HD + opzione live view
8. Se avvia live view → comando MQTT → camera avvia HLS stream
9. Utente sceglie qualità → comando MQTT → camera adatta encoding
10. Utente chiude → comando MQTT → camera torna in IDLE
```
