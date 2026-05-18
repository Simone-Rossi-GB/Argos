import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { api } from './services/api';
import { mqttService } from './services/mqtt';
import { storage } from './services/storage';

type StreamQuality = '360p' | '720p' | '1080p';
type CameraMode = 'idle' | 'alert' | 'live';

const MODE_COLOR: Record<CameraMode, string> = {
  idle: 'rgba(0,0,0,0.55)',
  alert: 'rgba(220,53,69,0.9)',
  live: 'rgba(40,167,69,0.9)',
};

export default function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  const [mode, setMode] = useState<CameraMode>('idle');
  const [quality, setQuality] = useState<StreamQuality>('720p');
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const moduleTypeRef = useRef<string>('fall');
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    storage.getModuleType().then(t => {
      if (t) moduleTypeRef.current = t;
    });

    // Ascolta comandi MQTT dal backend
    mqttService.onCommand((action, cmdQuality) => {
      if (action === 'start_stream') {
        const q = (cmdQuality as StreamQuality) ?? '720p';
        setQuality(q);
        setMode('live');
        startFFmpegStream(q);
      } else if (action === 'stop_stream') {
        setMode('idle');
        stopFFmpegStream();
      } else if (action === 'set_quality' && cmdQuality) {
        setQuality(cmdQuality as StreamQuality);
        restartFFmpegStream(cmdQuality as StreamQuality);
      }
    });

    return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      stopFFmpegStream();
    };
  }, []);

  // ── Rilevamento evento (stub MediaPipe) ─────────────────────────────────────
  // Sostituire questo metodo con il frame processor MediaPipe reale.
  // La firma rimane identica: riceve type e confidence, fa il resto.
  const handleDetection = useCallback(
    async (type: string, confidence: number) => {
      if (mode === 'alert') return; // evita eventi doppi durante un alert attivo

      setLastEvent(`${type} ${(confidence * 100).toFixed(0)}%`);
      setMode('alert');
      mqttService.publishStatus('alert');

      // Scatta foto HD e carica sul server
      let photoUrl: string | undefined;
      try {
        const photo = await cameraRef.current?.takePhoto({ flash: 'off' });
        if (photo) {
          const [serverUrl, token] = await Promise.all([
            storage.getServerUrl(),
            storage.getToken(),
          ]);
          if (serverUrl && token) {
            photoUrl = await api.uploadPhoto(serverUrl, token, photo.path);
          }
        }
      } catch {}

      mqttService.publishEvent(type, confidence, photoUrl);

      // Torna IDLE dopo 10 secondi
      alertTimeoutRef.current = setTimeout(() => {
        setMode('idle');
        mqttService.publishStatus('online');
      }, 10_000);
    },
    [mode],
  );

  // ── FFmpeg streaming verso MediaMTX (stub) ──────────────────────────────────
  // TODO: sostituire con FFmpegKit quando installato:
  //   npm install ffmpeg-kit-react-native
  //   poi: import { FFmpegKit, FFmpegKitConfig } from 'ffmpeg-kit-react-native';
  const startFFmpegStream = async (q: StreamQuality) => {
    const serverUrl = await storage.getServerUrl();
    const cameraId = await storage.getCameraId();
    if (!serverUrl || !cameraId) return;
    const host = new URL(serverUrl).hostname;
    const rtspUrl = `rtsp://${host}:8554/${cameraId}`;
    const bitrateMap: Record<StreamQuality, string> = {
      '360p': '500k',
      '720p': '1500k',
      '1080p': '4000k',
    };
    // FFmpegKit.executeAsync(
    //   `-f avfoundation -i 0:none -vcodec h264 -b:v ${bitrateMap[q]} -f rtsp ${rtspUrl}`
    // );
    console.log(`[FFmpeg] start → ${rtspUrl} @ ${bitrateMap[q]}`);
  };

  const stopFFmpegStream = () => {
    // FFmpegKit.cancel();
    console.log('[FFmpeg] stopped');
  };

  const restartFFmpegStream = (q: StreamQuality) => {
    stopFFmpegStream();
    startFFmpegStream(q);
  };

  // ── Permesso camera ──────────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <View style={s.center}>
        <Text style={s.infoText}>Permesso camera necessario</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Autorizza</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={s.center}>
        <Text style={s.infoText}>Nessuna camera trovata sul dispositivo</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Camera
        ref={cameraRef}
        style={s.camera}
        device={device}
        isActive
        photo
      />

      {/* Overlay: stato + qualità + ultimo evento */}
      <View style={s.overlay}>
        <View style={[s.badge, { backgroundColor: MODE_COLOR[mode] }]}>
          <Text style={s.badgeText}>{mode.toUpperCase()}</Text>
        </View>
        <Text style={s.infoChip}>Qualità: {quality}</Text>
        {lastEvent && <Text style={s.infoChip}>Evento: {lastEvent}</Text>}
      </View>

      {/* Bottone simulazione evento — solo per sviluppo/demo */}
      <View style={s.controls}>
        <TouchableOpacity
          style={s.testBtn}
          onPress={() =>
            handleDetection(moduleTypeRef.current, 0.85 + Math.random() * 0.1)
          }>
          <Text style={s.btnText}>Simula evento AI</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  overlay: { position: 'absolute', top: 16, left: 16, gap: 8 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  infoChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  controls: { position: 'absolute', bottom: 40, left: 20, right: 20 },
  testBtn: {
    backgroundColor: 'rgba(255,165,0,0.9)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  btn: { backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  infoText: { fontSize: 16, color: '#333' },
});
