/**
 * Object Detector - Rileva persone, veicoli, folla
 * Usa EfficientDet (COCO dataset) di MediaPipe
 */

import { FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision';
import type { ImageData, Rect } from './types';

let objectDetector: ObjectDetector | null = null;

/**
 * INIT - Carica il modello
 *
 * Scarica EfficientDet Lite da:
 * https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector
 *
 * Salvalo in: assets/models/efficientdet_lite0.tflite
 */
export async function initObjectDetector(): Promise<void> {
  try {
    console.log('🔄 Loading Object Detector model...');

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    );

    objectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'assets/models/efficientdet_lite0.tflite',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      scoreThreshold: 0.5,
      maxResults: 10,
    });

    console.log('✅ Object Detector loaded');
  } catch (error) {
    console.error('❌ Failed to load Object Detector:', error);
    throw error;
  }
}

/**
 * INTRUSION - Rileva persona in zona vietata
 */
export interface IntrusionResult {
  detected: boolean;
  confidence: number;
  type: 'intrusion';
}

export function detectIntrusion(
  imageData: ImageData,
  forbiddenZone: Rect,
  timestamp: number
): IntrusionResult {
  if (!objectDetector) {
    console.warn('⚠️ Object Detector not initialized');
    return { detected: false, confidence: 0, type: 'intrusion' };
  }

  try {
    // Esegui inferenza
    const result = objectDetector.detectForVideo(imageData as any, timestamp);

    // Filtra solo persone
    const persons = result.detections.filter(d =>
      d.categories[0].categoryName === 'person'
    );

    // Controlla se qualche persona è dentro la zona vietata
    for (const person of persons) {
      const bbox = person.boundingBox;
      if (bbox && isInside(bbox, forbiddenZone)) {
        return {
          detected: true,
          confidence: person.categories[0].score,
          type: 'intrusion',
        };
      }
    }

    return { detected: false, confidence: 0, type: 'intrusion' };
  } catch (error) {
    console.error('❌ Intrusion detection error:', error);
    return { detected: false, confidence: 0, type: 'intrusion' };
  }
}

/**
 * CROWD - Rileva folla (numero persone > soglia)
 */
export interface CrowdResult {
  detected: boolean;
  confidence: number;
  type: 'crowd';
  count: number;
}

export function detectCrowd(
  imageData: ImageData,
  timestamp: number,
  threshold: number = 5
): CrowdResult {
  if (!objectDetector) {
    console.warn('⚠️ Object Detector not initialized');
    return { detected: false, confidence: 0, type: 'crowd', count: 0 };
  }

  try {
    // Esegui inferenza
    const result = objectDetector.detectForVideo(imageData as any, timestamp);

    // Conta persone rilevate
    const personCount = result.detections.filter(d =>
      d.categories[0].categoryName === 'person'
    ).length;

    const isCrowd = personCount > threshold;

    // Confidence proporzionale al numero di persone oltre la soglia
    let confidence = 0;
    if (isCrowd) {
      const excessPeople = personCount - threshold;
      confidence = Math.min(0.7 + (excessPeople * 0.05), 0.95);
    }

    return {
      detected: isCrowd,
      confidence,
      type: 'crowd',
      count: personCount,
    };
  } catch (error) {
    console.error('❌ Crowd detection error:', error);
    return { detected: false, confidence: 0, type: 'crowd', count: 0 };
  }
}

/**
 * VEHICLE - Rileva veicoli (auto, moto, truck, bus)
 */
export interface VehicleResult {
  detected: boolean;
  confidence: number;
  type: 'vehicle';
  vehicleType?: string;
}

const VEHICLE_CLASSES = new Set(['car', 'motorcycle', 'truck', 'bus']);

export function detectVehicle(imageData: ImageData, timestamp: number): VehicleResult {
  if (!objectDetector) {
    console.warn('⚠️ Object Detector not initialized');
    return { detected: false, confidence: 0, type: 'vehicle' };
  }

  try {
    // Esegui inferenza
    const result = objectDetector.detectForVideo(imageData as any, timestamp);

    // Filtra veicoli (car, motorcycle, truck, bus)
    const vehicles = result.detections.filter(d =>
      VEHICLE_CLASSES.has(d.categories[0].categoryName)
    );

    if (vehicles.length > 0) {
      // Prendi il veicolo con confidence più alta
      const bestVehicle = vehicles.reduce((prev, current) =>
        current.categories[0].score > prev.categories[0].score ? current : prev,
        vehicles[0]
      );

      return {
        detected: true,
        confidence: bestVehicle.categories[0].score,
        type: 'vehicle',
        vehicleType: bestVehicle.categories[0].categoryName,
      };
    }

    return { detected: false, confidence: 0, type: 'vehicle' };
  } catch (error) {
    console.error('❌ Vehicle detection error:', error);
    return { detected: false, confidence: 0, type: 'vehicle' };
  }
}

/**
 * UTILITY: Controlla se bbox è dentro la zona
 *
 * MediaPipe BoundingBox format: { originX, originY, width, height }
 * Rect format: { x, y, width, height }
 *
 * Restituisce true se il centro del bbox è dentro la zona
 */
function isInside(bbox: { originX: number; originY: number; width: number; height: number }, zone: Rect): boolean {
  // Calcola il centro del bounding box
  const centerX = bbox.originX + bbox.width / 2;
  const centerY = bbox.originY + bbox.height / 2;

  // Controlla se il centro è dentro la zona vietata
  return (
    centerX >= zone.x &&
    centerX <= zone.x + zone.width &&
    centerY >= zone.y &&
    centerY <= zone.y + zone.height
  );
}

/**
 * CLEANUP
 */
export function cleanupObjectDetector(): void {
  if (objectDetector) {
    objectDetector.close();
    objectDetector = null;
  }
}
