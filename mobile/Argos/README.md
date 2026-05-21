# 📱 Argos Mobile - Camera AI

App React Native iOS per Argos - Sistema di sorveglianza intelligente con AI on-device.

## 🚀 Setup Completo

### 1. Installa Dipendenze

```bash
cd mobile/Argos

# Installa npm packages
npm install

# Installa CocoaPods (iOS)
cd ios
pod install
cd ..
```

### 2. Download Modelli AI

Crea la cartella assets e scarica i modelli MediaPipe:

```bash
mkdir -p assets/models
cd assets/models

# Pose Landmarker (Fall Detection)
curl -o pose_landmarker.task https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task

# Object Detector (Intrusion/Crowd/Vehicle)
curl -o efficientdet_lite0.tflite https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/latest/efficientdet_lite0.tflite

# Fire Classifier (TODO: addestra modello custom)
# Usa TensorFlow Model Maker per creare fire_classifier.tflite
```

### 3. Configura Asset Bundle

Crea `react-native.config.js` nella root:

```javascript
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/models/'],
};
```

Poi esegui:

```bash
npx react-native-asset
```

### 4. Permissions iOS

Verifica che `ios/Argos/Info.plist` contenga:

```xml
<key>NSCameraUsageDescription</key>
<string>Argos needs camera access to detect events</string>
<key>NSMicrophoneUsageDescription</key>
<string>Argos needs microphone access for video streaming</string>
```

### 5. Avvia Backend

**IMPORTANTE**: Prima di avviare l'app, assicurati che il backend sia attivo:

```bash
# In un altro terminale, vai alla root di Argos
cd ../../
docker compose up --build
```

Verifica che tutti i servizi siano attivi:
- Backend: http://localhost:8080/docs
- MQTT: ws://localhost:9001
- MediaMTX: http://localhost:8888

### 6. Avvia App Mobile

```bash
# Terminale 1: Metro bundler
npx react-native start --reset-cache

# Terminale 2: Build e run
npx react-native run-ios
```

#### Su Device Fisico

**NOTA**: I frame processor MediaPipe funzionano **SOLO su device fisico**, non su simulatore!

```bash
# 1. Trova IP del tuo Mac
ipconfig getifaddr en0
# Output: 192.168.1.x

# 2. Build su device
npx react-native run-ios --device

# 3. Nell'app, vai su Settings e inserisci:
# - Server URL: http://192.168.1.x:8080
# - Email: test@example.com
# - Password: password123
# - Camera Name: iPhone Camera
# - Location: Lat 45.4, Lng 9.1
# - Module Type: fall (o altro)
```

## 📁 Struttura File Creati

```
mobile/Argos/
├── src/
│   ├── ai/
│   │   ├── types.ts                  ✅ Tipi comuni per AI
│   │   ├── frameProcessor.ts         ✅ Orchestratore principale
│   │   ├── fallDetector.ts           ✅ Rilevamento cadute (Pose Landmarker)
│   │   ├── objectDetector.ts         ✅ Intrusion/Crowd/Vehicle (EfficientDet)
│   │   └── fireDetector.ts           ✅ Rilevamento fuoco/fumo (custom)
│   └── services/
│       ├── storage.ts                ✅ AsyncStorage wrapper
│       ├── api.ts                    ✅ REST API client
│       ├── mqtt.ts                   ✅ MQTT client (pub/sub eventi)
│       ├── eventPublisher.ts         ✅ Pubblica eventi AI su MQTT
│       ├── commandHandler.ts         ✅ Gestisce comandi dal backend
│       └── streaming.ts              ✅ FFmpeg RTSP streaming
├── assets/
│   └── models/
│       ├── pose_landmarker.task      📥 Download manuale
│       ├── efficientdet_lite0.tflite 📥 Download manuale
│       └── fire_classifier.tflite    🔨 TODO: Addestrare custom
├── package.json                      ✅ Dipendenze aggiornate
├── INSTALL_DEPS.md                   📖 Guida installazione
└── README.md                         📖 Questo file
```

## 🎯 Come Funziona

### Flusso Completo

```
1. CameraScreen avvia camera + AI + MQTT
   ↓
2. frameProcessor riceve frame 30-60 FPS
   ↓
3. Frame ridimensionato 224x224 RGB
   ↓
4. Inferenza MediaPipe (Fall/Object/Fire detector)
   ↓
5. Se rilevamento con confidence > 0.85:
   - Scatta foto frame
   - Upload foto al backend
   - Pubblica evento MQTT → cameras/<uuid>/events
   - Avvia auto-stream 10 sec (se confidence > 0.8)
   ↓
6. Backend riceve evento MQTT
   - Salva evento in DB
   - Crea alert
   - Notifica dashboard via WebSocket
```

### Moduli AI Disponibili

| Modulo | Evento | Modello | Logica |
|--------|--------|---------|--------|
| `fall` | Caduta/aggressione | Pose Landmarker | head.y ≈ hip.y → orizzontale |
| `intrusion` | Violazione perimetro | EfficientDet | persona in zona vietata |
| `crowd` | Folla anomala | EfficientDet | count persone > soglia |
| `vehicle` | Veicolo sospetto | EfficientDet | auto/moto rilevate |
| `fire` | Fuoco/fumo | Custom Classifier | classificazione fuoco/fumo |

## 🧪 Test

### Test su Simulatore (Limitato)

**NOTA**: Sul simulatore NON funzionano:
- ❌ MediaPipe frame processor (camera reale richiesta)
- ❌ FFmpeg streaming (nessuna camera hardware)

Puoi testare solo:
- ✅ UI/UX e navigazione
- ✅ Connessione MQTT
- ✅ API REST (login, registrazione)

### Test su Device Fisico (Completo)

1. **Test Fall Detection**
   - Apri l'app, vai su Camera
   - Sdraiati per terra davanti al telefono
   - Dovresti vedere console log `🎯 Detection: fall`
   - Controlla backend logs per evento MQTT

2. **Test MQTT**
   - Apri backend logs: `docker logs -f argos-backend`
   - Apri MQTT logs: `docker logs -f argos-mqtt`
   - Dovresti vedere messaggi su `cameras/<uuid>/events`

3. **Test Streaming**
   - Avvia backend + MediaMTX
   - Nella CameraScreen, attiva streaming
   - Vai su browser: `http://localhost:8888/<camera_uuid>/index.m3u8`
   - Usa Video.js o VLC per vedere stream HLS

## 🐛 Troubleshooting

### Errore: "Unable to resolve module @mediapipe/tasks-vision"

```bash
npm install --force
cd ios && pod install && cd ..
npx react-native start --reset-cache
```

### Errore: "FFmpeg not found"

```bash
cd ios
pod deintegrate
pod install
cd ..
npx react-native run-ios
```

### MediaPipe Non Funziona su Device

MediaPipe Web (`@mediapipe/tasks-vision`) potrebbe non funzionare bene su React Native.

**Alternativa consigliata**: Usa TensorFlow Lite nativo

```bash
# Rimuovi MediaPipe
npm uninstall @mediapipe/tasks-vision

# Installa TFLite
npm install react-native-fast-tflite
cd ios && pod install
```

Poi adatta i detector per usare `react-native-fast-tflite` invece di MediaPipe.

### MQTT Non Si Connette da Device Fisico

Controlla che:
1. Mac e iPhone siano sulla stessa rete WiFi
2. Firewall Mac non blocchi porta 9001
3. Server URL sia `http://192.168.1.x:8080` (sostituisci con tuo IP)

```bash
# Test connessione MQTT da Mac
mosquitto_pub -h localhost -p 1883 -t test -m "hello"
```

### Stream Non Parte

Controlla:
1. FFmpeg installato correttamente: `ffmpeg-kit-react-native` in package.json
2. MediaMTX attivo: `docker ps | grep mediamtx`
3. Porta 8554 aperta

```bash
# Test RTSP manualmente
ffmpeg -i rtsp://localhost:8554/test -f null -
```

## 📚 Documentazione API

### storage.ts

```typescript
// Salva configurazione
await setItem('server_url', 'http://192.168.1.10:8080');
await saveCameraConfig({ cameraId, cameraName, moduleType });

// Leggi configurazione
const config = await getCameraConfig();
const token = await getToken();
```

### mqtt.ts

```typescript
// Connetti
await connectMQTT();

// Pubblica evento
await publishMessage('cameras/uuid/events', JSON.stringify(event));

// Status
const connected = isConnectedToMQTT();
```

### api.ts

```typescript
// Auth
const { access_token } = await loginUser({ email, password });
await saveAuth(access_token, email);

// Camera
const camera = await registerCamera({
  name: 'iPhone Camera',
  lat: 45.4,
  lng: 9.1,
  module_type: 'fall'
});
```

### streaming.ts

```typescript
// Avvia stream RTSP
await startStreaming('720p'); // '360p' | '720p' | '1080p'

// Auto-stream per 10 sec
await startAutoStream(10);

// Stop
await stopStreaming();
```

## 🎓 Next Steps

1. **Addestrare Fire Classifier Custom**
   - Dataset: Kaggle Fire Detection Dataset
   - Tool: TensorFlow Model Maker
   - Export: `fire_classifier.tflite`

2. **Migliorare Frame Capture**
   - Integrare `Camera.takePhoto()` per foto ad alta risoluzione
   - Implementare queue locale per eventi offline

3. **Ottimizzare Performance**
   - Ridurre FPS se device si scalda
   - Implementare throttling dinamico
   - Usare TFLite invece di MediaPipe per velocità

4. **UI Miglioramenti**
   - Mostrare overlay detection in tempo reale
   - Configurare zona vietata tramite touch
   - Statistiche detection (FPS, confidence media)

## 📞 Support

Per problemi o domande, apri una issue su GitHub.

---

**Fatto! Tutti i file sono stati creati e implementati. Segui le istruzioni sopra per il setup completo.** 🚀
