Perfetto. Scrivi questo contenuto in un nuovo file chiamato `CLAUDE.md` nella root del progetto (`/Argos/CLAUDE.md`):

---

```markdown
# Argos — Sistema di Sorveglianza Distribuita

## Panoramica
Sistema distribuito di sorveglianza comunitaria con telecamere intelligenti basate su AI,
alert in tempo reale e dashboard con mappa interattiva.
I telefoni fungono da telecamere con AI on-device (MediaPipe). Un server centralizzato
raccoglie eventi e stream video. L'utente monitora tutto da una dashboard web con mappa.

## Team e ruoli
| Persona | Ruolo | Stack |
|---------|-------|-------|
| Wang | Backend + DB | Python/FastAPI, PostgreSQL, MQTT |
| Busi & Viola | Frontend dashboard web | Next.js, Mapbox, shadcn/ui |
| Rossi | App mobile (telecamera) + Infra | React Native, MediaPipe, Docker |

## Architettura
```
[Telefono/Camera]          [PC Utente]
  React Native           Next.js Dashboard
  MediaPipe                     │
  FFmpeg                        │
      │                         │
      │── MQTT (eventi AI) ─────┤
      │── RTSP stream ──► MediaMTX ──► HLS ──► Dashboard
      │
      ▼
 ┌─────────────────────────────────┐
 │         NGINX :8080             │
 └────┬──────────┬────────┬────────┘
      ▼          ▼        ▼
  [FastAPI]  [MediaMTX] [Mosquitto]
  :10170     :8888/:8554  :1883/:9001
      │
  [PostgreSQL :5432]
```

## Infrastruttura Docker
Tutto gira su Docker Compose sulla stessa macchina (Mac di Rossi in sviluppo).

| Container | Porta esterna | Scopo |
|-----------|--------------|-------|
| argos-nginx | 8080 | Reverse proxy, entry point unico |
| argos-backend | interno :10170 | FastAPI |
| argos-db | interno :5432 | PostgreSQL |
| argos-mqtt | 1883 (TCP), 9001 (WebSocket) | Mosquitto broker |
| argos-mediamtx | 8888 (HLS), 8554 (RTSP), 1935 (RTMP) | Server streaming |

**URL utili in sviluppo locale:**
- Backend API: `http://localhost:8080/api/v1`
- Backend docs: `http://localhost:8080/docs`
- MQTT WebSocket (da mobile simulator): `ws://localhost:9001`
- MQTT TCP (da Docker interno): `mqtt://argos-mqtt:1883`
- HLS stream: `http://localhost:8888/<camera_uuid>/index.m3u8`
- RTSP in entrata (da FFmpeg): `rtsp://localhost:8554/<camera_uuid>`

**Da device fisico iOS sulla stessa rete WiFi:**
- Sostituire `localhost` con l'IP del Mac (es. `192.168.1.x`)
- Trovare IP: `ipconfig getifaddr en0`

## MQTT — Topic e payload

### Telecamera → Backend
```json
// cameras/<camera_uuid>/events — evento AI rilevato
{ "type": "fall", "confidence": 0.94, "media": { "photo_url": "https://..." } }

// cameras/<camera_uuid>/status — stato camera
{ "status": "online", "last_seen": "2026-05-20T10:00:00" }
// status: "online" | "offline" | "alert"
```

### Backend → Telecamera
```json
// cameras/<camera_uuid>/cmd — comandi dal server
{ "action": "start_stream", "quality": "720p" }
{ "action": "stop_stream" }
{ "action": "set_quality", "quality": "1080p" }
```

## API REST — Endpoint principali

### Auth
- `POST /api/v1/auth/register` — registra utente `{name, email, password}`
- `POST /api/v1/auth/login` — login `{email, password}` → `{access_token}`
- `GET /api/v1/me` — utente corrente (Bearer token)

### Cameras
- `GET /api/v1/cameras` — lista camere dell'utente (auth)
- `POST /api/v1/cameras` — registra camera (auth)
  ```json
  { "name": "...", "lat": 45.4, "lng": 9.1,
    "module_type": "fall", "default_quality": "720p" }
  ```
- `PATCH /api/v1/cameras/<id>` — modifica camera (auth)
- `DELETE /api/v1/cameras/<id>` — elimina camera (auth)
- `PATCH /api/v1/cameras/<id>/status` — aggiorna stato (NO auth, chiamato da MQTT)

### Events
- `GET /api/v1/events` — lista eventi `?camera_id=&event_type=&limit=&offset=`
- `GET /api/v1/events/<id>` — dettaglio con media clips

### Alerts
- `GET /api/v1/alerts` — lista alert `?unread_only=true`
- `PATCH /api/v1/alerts/<id>` — marca come letto `{}`

### Stream
- `POST /api/v1/stream/<camera_id>/start?quality=720p` — avvia stream (manda MQTT cmd)
- `POST /api/v1/stream/<camera_id>/stop` — ferma stream

### WebSocket
- `ws://localhost:8080/api/v1/ws?token=<JWT>` — alert real-time dashboard
  ```json
  // messaggio in arrivo:
  { "type": "new_alert", "alert": {
    "id": "uuid", "severity": "high", "event_type": "fall",
    "camera_id": "uuid", "camera_name": "...",
    "confidence": 0.94, "timestamp": "..."
  }}
  ```

## Moduli AI
Un solo modulo per camera, scelto dall'utente in fase di registrazione.

| Modulo | Evento | Modello MediaPipe | Logica |
|--------|--------|-------------------|--------|
| fall | Caduta/aggressione | Pose Landmarker | head.y ≈ hip.y → persona orizzontale |
| intrusion | Violazione perimetro | Object Detector | persona rilevata in zona vietata |
| crowd | Folla anomala | Object Detector | count persone > soglia |
| vehicle | Veicolo sospetto | Object Detector | auto/moto nelle classi COCO |
| fire | Fuoco/fumo | Image Classifier | modello custom (Model Maker) |

## Database — Struttura tabelle
```sql
users       (id UUID PK, name, email, password_hash, created_at)
cameras     (id UUID PK, user_id FK, name, lat, lng,
             module_type ENUM(fall|intrusion|crowd|vehicle|fire),
             default_quality ENUM(360p|720p|1080p),
             status ENUM(online|offline|alert), last_seen)
events      (id UUID PK, camera_id FK, event_type, confidence_score, timestamp)
media_clips (id UUID PK, event_id FK, photo_url, video_url, duration)
alerts      (id UUID PK, user_id FK, event_id FK UNIQUE,
             severity ENUM(low|medium|high|critical), sent_at, read_at)
```

**Severity mapping:**
- intrusion / fire → critical
- fall → high
- crowd → medium
- vehicle → low

## Struttura repository
```
Argos/
├── docker-compose.yml
├── nginx/
├── mosquitto/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/          ← migrazioni DB
│   └── app/
│       ├── main.py       ← entry point, avvia MQTT + FastAPI
│       ├── core/
│       │   ├── config.py     ← settings da .env
│       │   └── database.py   ← SQLAlchemy async
│       ├── api/
│       │   ├── __init__.py   ← ⚠️ BUG: mancano import ws e metadata
│       │   ├── auth.py
│       │   ├── cameras.py
│       │   ├── events.py
│       │   ├── alerts.py
│       │   ├── stream.py     ← ⚠️ TODO: comandi MQTT commentati
│       │   ├── ws.py
│       │   └── metadata.py
│       ├── models/       ← tabelle SQLAlchemy
│       ├── schemas/      ← validazione Pydantic
│       ├── services/
│       │   ├── mqtt_client.py        ← gestisce connessione MQTT
│       │   ├── alert_processing.py   ← evento → alert → WebSocket
│       │   └── websocker_manager.py  ← ⚠️ typo nel nome file
│       └── utils/
│           └── security.py   ← JWT, bcrypt, get_current_user
└── mobile/
    └── Argos/
        ├── App.tsx       ← navigazione: Home, Camera, Settings
        └── src/
            ├── HomeScreen.tsx      ← stato MQTT, naviga a Camera
            ├── CameraScreen.tsx    ← preview + AI + streaming
            ├── SettingScreen.tsx   ← registrazione utente + camera
            └── services/
                ├── storage.ts  ← AsyncStorage (server_url, token, camera_id, module_type)
                ├── api.ts      ← login, registerUser, registerCamera, uploadPhoto
                └── mqtt.ts     ← singleton MQTT client

```

## Bug noti nel backend (da fixare)
1. `app/api/__init__.py` — mancano `ws` e `metadata` negli import
2. `app/services/` — file si chiama `websocker_manager.py` ma viene importato come `websocket_manager`
3. `app/api/stream.py` — comandi MQTT commentati con TODO, lo streaming non parte

## Stato attuale

### Backend ✅ Completo
- Auth JWT funzionante
- CRUD cameras, events, alerts
- MQTT client con riconnessione automatica
- WebSocket manager per alert real-time
- Pipeline evento MQTT → DB → WebSocket dashboard

### App mobile (Rossi) — In corso
- [x] Navigazione (Home, Camera, Settings)
- [x] Storage service (AsyncStorage)
- [x] API service (login, register, registerCamera)
- [x] MQTT service (connect, publish, subscribe comandi)
- [x] SettingScreen (registrazione utente + camera)
- [x] HomeScreen (stato MQTT)
- [x] CameraScreen (preview, stub AI, stub FFmpeg)
- [ ] MediaPipe frame processor (AI reale)
- [ ] FFmpeg streaming verso MediaMTX (`npm install ffmpeg-kit-react-native`)
- [ ] Test su device fisico (simulatore non ha camera)

### Dashboard web (Busi & Viola) — Da fare
- [ ] Mappa Mapbox con icone telecamere
- [ ] Feed alert real-time via WebSocket
- [ ] Player HLS con Video.js
- [ ] Statistiche con Recharts

## Modalità operative telecamera
- **IDLE**: AI attiva, nessuno stream, pubblica solo eventi MQTT
- **ALERT**: AI rileva evento → foto → pubblica MQTT → stream HLS per 10 sec
- **LIVE**: utente clicca Connetti → backend manda MQTT cmd → FFmpeg avvia stream

## Come avviare in sviluppo

### Backend + infra
```bash
cd Argos
docker compose up --build
```

### App mobile (simulatore iOS)
```bash
cd mobile/Argos
npx react-native start --reset-cache   # terminale 1
npx react-native run-ios               # terminale 2
```

### App mobile (device fisico)
```bash
# Trova IP del Mac sulla rete locale
ipconfig getifaddr en0

# Nel SettingScreen dell'app inserire:
# Server URL: http://<IP-MAC>:8080
```

## Note sviluppo React Native
- I frame processor di Vision Camera funzionano **solo su device fisico**
- Il simulatore non ha camera reale, usare il bottone "Simula evento AI" per test
- Ogni modifica al codice nativo (pod, permissions) richiede `pod install` + rebuild
- Per reload veloce senza rebuild: premi `R` due volte nel terminale Metro
- Connessione MQTT dal simulatore: `ws://localhost:9001`
- Connessione MQTT da device fisico: `ws://<IP-MAC>:9001`
```

---

Crea il file, salvalo, poi torna qui che continuiamo con il simulatore.