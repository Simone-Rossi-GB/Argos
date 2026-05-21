/**
 * Event Publisher - Pubblica eventi AI su MQTT
 *
 * Quando l'AI rileva qualcosa, questo servizio:
 * 1. Scatta una foto del frame corrente
 * 2. Fa upload della foto al backend
 * 3. Pubblica l'evento su MQTT (topic: cameras/<uuid>/events)
 * 4. Se è un alert importante → avvia stream automatico
 */

import { publishMessage } from './mqtt';
import { uploadPhoto } from './api';
import { getItem } from './storage';
import { startAutoStream } from './streaming';

/**
 * Store per l'ultimo frame catturato
 * Viene aggiornato dal frameProcessor ogni N frame
 */
let lastCapturedFrameUri: string | null = null;

/**
 * Salva l'ultimo frame URI (chiamato dal frameProcessor)
 */
export function setLastFrame(uri: string): void {
  lastCapturedFrameUri = uri;
}

/**
 * TODO: PUBBLICA EVENTO AI
 *
 * Chiamala ogni volta che l'AI rileva qualcosa
 */
export async function publishAIEvent(detection: {
  type: string;
  confidence: number;
  [key: string]: any;
}): Promise<void> {
  try {
    const cameraId = await getItem('camera_id');

    // 1. CATTURA FOTO del frame corrente
    const photoUri = await captureCurrentFrame();

    // 2. UPLOAD FOTO al backend
    console.log('📤 Uploading photo...');
    const photoUrl = await uploadPhoto(photoUri);

    // 3. PREPARA PAYLOAD evento
    const event = {
      type: detection.type, // "fall" | "intrusion" | "crowd" | "vehicle" | "fire"
      confidence: detection.confidence,
      media: {
        photo_url: photoUrl,
      },
      timestamp: new Date().toISOString(),
      // Aggiungi campi extra se necessario
      ...detection,
    };

    // 4. PUBBLICA su MQTT
    const topic = `cameras/${cameraId}/events`;
    await publishMessage(topic, JSON.stringify(event));

    console.log(`✅ Published ${detection.type} event (confidence: ${detection.confidence})`);

    // 5. SE È UN ALERT GRAVE → avvia stream automatico per 10 sec
    if (detection.confidence > 0.8) {
      console.log('🎥 Starting auto-stream for 10 seconds...');
      startAutoStream(10);
    }

  } catch (error) {
    console.error('❌ Failed to publish AI event:', error);
    // TODO: Considera di salvare l'evento in locale e riprovare dopo
  }
}

/**
 * TODO: PUBBLICA STATO CAMERA
 *
 * Chiamala ogni 30 secondi per notificare al backend che la camera è online
 */
export async function publishCameraStatus(
  status: 'online' | 'offline' | 'alert'
): Promise<void> {
  try {
    const cameraId = await getItem('camera_id');

    const statusMsg = {
      status,
      last_seen: new Date().toISOString(),
    };

    const topic = `cameras/${cameraId}/status`;
    await publishMessage(topic, JSON.stringify(statusMsg));

    console.log(`📡 Camera status: ${status}`);

  } catch (error) {
    console.error('❌ Failed to publish camera status:', error);
  }
}

/**
 * Cattura il frame corrente dalla camera
 *
 * Strategia: Usa l'ultimo frame salvato dal frameProcessor
 * Il frameProcessor chiama setLastFrame() ogni N frame con uno snapshot
 *
 * NOTA: Per produzione, integrare con Camera.takePhoto() per qualità migliore
 */
async function captureCurrentFrame(): Promise<string> {
  if (lastCapturedFrameUri) {
    console.log('📸 Using cached frame snapshot');
    return lastCapturedFrameUri;
  }

  // Fallback: genera un placeholder se non c'è frame disponibile
  console.warn('⚠️ No frame snapshot available, using placeholder');

  // TODO: In produzione, implementare:
  // 1. Integrazione con Camera.takePhoto() di react-native-vision-camera
  // 2. Oppure salvare il frame buffer come immagine usando react-native-fs

  // Per ora ritorna un URI placeholder (il backend dovrebbe gestirlo)
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AH//Z';
}
