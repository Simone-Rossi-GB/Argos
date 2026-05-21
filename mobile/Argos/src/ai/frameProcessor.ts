/**
 * Frame Processor - Elabora frame dalla camera e passa ai modelli AI
 * QUESTO È IL CUORE DELL'AI - Viene chiamato per ogni frame (30-60 FPS)
 */

import { Frame } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { resize } from 'vision-camera-resize-plugin';
import { getItem } from '../services/storage';

// TODO: Import i tuoi detector
// import { detectFall } from './fallDetector';
// import { detectIntrusion, detectCrowd, detectVehicle } from './objectDetector';
// import { detectFire } from './fireDetector';

/**
 * TODO: IMPLEMENTA QUESTA FUNZIONE
 *
 * Viene chiamata per ogni frame. Tu devi:
 * 1. Ridimensionare il frame (MediaPipe vuole 224x224 o 256x256)
 * 2. Convertire in formato compatibile con MediaPipe
 * 3. Eseguire inferenza con il modello giusto
 * 4. Se rilevi qualcosa → chiama publishAIEvent()
 */

export const createFrameProcessor = (moduleType: string) => {
  return Worklets.createRunOnJS((frame: Frame) => {
    'worklet';

    try {
      // 1. RIDIMENSIONA FRAME
      const resized = resize(frame, {
        scale: {
          width: 224,
          height: 224,
        },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });

      // 2. CONVERTI in ImageData per MediaPipe
      const imageData = {
        data: resized.buffer,
        width: 224,
        height: 224,
      };

      // 3. ESEGUI INFERENZA in base al modulo configurato
      let result;

      switch (moduleType) {
        case 'fall':
          // result = detectFall(imageData);
          // TODO: implementa fallDetector.ts
          break;

        case 'intrusion':
          // result = detectIntrusion(imageData, forbiddenZone);
          // TODO: implementa objectDetector.ts
          break;

        case 'crowd':
          // result = detectCrowd(imageData, threshold);
          // TODO: implementa objectDetector.ts
          break;

        case 'vehicle':
          // result = detectVehicle(imageData);
          // TODO: implementa objectDetector.ts
          break;

        case 'fire':
          // result = detectFire(imageData);
          // TODO: implementa fireDetector.ts
          break;

        default:
          console.warn(`Unknown module type: ${moduleType}`);
          return;
      }

      // 4. SE RILEVA QUALCOSA → pubblica evento
      if (result?.detected && result.confidence > 0.85) {
        // TODO: chiama publishAIEvent(result) da eventPublisher.ts
        console.log(`🎯 Detection: ${result.type} (${result.confidence})`);
      }

    } catch (error) {
      console.error('❌ Frame processor error:', error);
    }
  });
};

/**
 * THROTTLING: Evita di pubblicare troppi eventi
 * Usa questo per limitare la frequenza di pubblicazione
 */
const eventThrottle = new Map<string, number>();
const THROTTLE_MS = 3000; // 3 secondi tra eventi dello stesso tipo

export function shouldPublishEvent(eventType: string): boolean {
  const now = Date.now();
  const lastPublished = eventThrottle.get(eventType) || 0;

  if (now - lastPublished > THROTTLE_MS) {
    eventThrottle.set(eventType, now);
    return true;
  }

  return false;
}
