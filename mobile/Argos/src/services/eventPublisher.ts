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

    // TODO: 1. SCATTA FOTO del frame corrente
    // const photoUri = await captureCurrentFrame();
    // Per ora usa placeholder
    const photoUri = 'file://placeholder.jpg';

    // TODO: 2. UPLOAD FOTO al backend
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
 * TODO: Implementa questa funzione
 * Cattura il frame corrente dalla camera e salvalo come file locale
 *
 * Opzioni:
 * 1. Usa Camera.takePhoto() di react-native-vision-camera
 * 2. Oppure salva l'ultimo frame processato in una variabile globale
 */
async function captureCurrentFrame(): Promise<string> {
  // PLACEHOLDER - implementa con Camera.takePhoto()
  return 'file://temp/current_frame.jpg';
}
