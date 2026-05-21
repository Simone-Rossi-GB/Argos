/**
 * Frame Processor - Elabora frame dalla camera e passa ai modelli AI
 * QUESTO È IL CUORE DELL'AI - Viene chiamato per ogni frame (30-60 FPS)
 */

import { Frame } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { resize } from 'vision-camera-resize-plugin';
import { publishAIEvent } from '../services/eventPublisher';

// Import detector
import { detectFall } from './fallDetector';
import { detectIntrusion, detectCrowd, detectVehicle } from './objectDetector';
import { detectFire } from './fireDetector';
import type { Rect } from './types';

/**
 * Configurazione zone vietate (per intrusion detection)
 * TODO: Fai configurare questo dall'utente tramite UI
 */
const DEFAULT_FORBIDDEN_ZONE: Rect = {
  x: 0.2,      // 20% dall'inizio (coordinate normalizzate 0-1)
  y: 0.2,
  width: 0.6,  // 60% della larghezza
  height: 0.6,
};

/**
 * Threshold per crowd detection
 * TODO: Fai configurare questo dall'utente
 */
const DEFAULT_CROWD_THRESHOLD = 5;

/**
 * THROTTLING: Evita di pubblicare troppi eventi
 * Usa questo per limitare la frequenza di pubblicazione
 */
const eventThrottle = new Map<string, number>();
const THROTTLE_MS = 3000; // 3 secondi tra eventi dello stesso tipo

function shouldPublishEvent(eventType: string): boolean {
  const now = Date.now();
  const lastPublished = eventThrottle.get(eventType) || 0;

  if (now - lastPublished > THROTTLE_MS) {
    eventThrottle.set(eventType, now);
    return true;
  }

  return false;
}

/**
 * Crea Frame Processor in base al modulo configurato
 *
 * @param moduleType - Modulo AI configurato dall'utente
 * @returns Worklet frame processor
 */
export const createFrameProcessor = (moduleType: string) => {
  return Worklets.createRunOnJS((frame: Frame) => {
    'worklet';

    try {
      // 1. RIDIMENSIONA FRAME (TFLite models: 224x224 base, poi ogni detector fa resize)
      const resized = resize(frame, {
        scale: {
          width: 224,
          height: 224,
        },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });

      // 2. CONVERTI in ImageData per TFLite detectors
      const imageData = {
        data: resized.buffer,
        width: 224,
        height: 224,
      };

      const timestamp = Date.now();

      // 3. ESEGUI INFERENZA in base al modulo configurato
      let result: any = null;

      switch (moduleType) {
        case 'fall':
          result = detectFall(imageData, timestamp);
          break;

        case 'intrusion':
          result = detectIntrusion(imageData, DEFAULT_FORBIDDEN_ZONE, timestamp);
          break;

        case 'crowd':
          result = detectCrowd(imageData, timestamp, DEFAULT_CROWD_THRESHOLD);
          break;

        case 'vehicle':
          result = detectVehicle(imageData, timestamp);
          break;

        case 'fire':
          result = detectFire(imageData, timestamp);
          break;

        default:
          console.warn(`Unknown module type: ${moduleType}`);
          return;
      }

      // 4. SE RILEVA QUALCOSA → pubblica evento (con throttling)
      if (result?.detected && result.confidence > 0.85) {
        // Controlla throttling per evitare spam
        if (shouldPublishEvent(result.type)) {
          console.log(`🎯 Detection: ${result.type} (confidence: ${result.confidence.toFixed(2)})`);

          // Pubblica evento MQTT in modo asincrono
          publishAIEvent(result).catch(error => {
            console.error('❌ Failed to publish AI event:', error);
          });
        }
      }

    } catch (error) {
      console.error('❌ Frame processor error:', error);
    }
  });
};

/**
 * HELPER: Configura zona vietata per intrusion detection
 */
export function setForbiddenZone(zone: Rect): void {
  Object.assign(DEFAULT_FORBIDDEN_ZONE, zone);
  console.log('✅ Forbidden zone updated:', zone);
}

/**
 * HELPER: Configura threshold per crowd detection
 */
export function setCrowdThreshold(threshold: number): void {
  // Modifica la costante (in produzione, usa un oggetto mutabile)
  Object.defineProperty(globalThis, 'CROWD_THRESHOLD', { value: threshold, writable: true });
  console.log(`✅ Crowd threshold set to: ${threshold}`);
}

/**
 * HELPER: Reset throttling (utile per test)
 */
export function resetThrottling(): void {
  eventThrottle.clear();
  console.log('✅ Event throttling reset');
}
