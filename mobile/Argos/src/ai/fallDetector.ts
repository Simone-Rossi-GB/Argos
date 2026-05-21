/**
 * Fall Detector - Rileva cadute usando Pose Landmarker di MediaPipe
 *
 * LOGICA: Se la testa è quasi allo stesso livello del bacino → persona orizzontale → caduta
 */

import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import type { ImageData } from './types';

let poseLandmarker: PoseLandmarker | null = null;

/**
 * TODO: INIT - Carica il modello
 * Chiamalo una volta all'avvio della CameraScreen
 *
 * Scarica il modello da:
 * https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
 *
 * Salvalo in: assets/models/pose_landmarker.task
 */
export async function initFallDetector(): Promise<void> {
  try {
    console.log('🔄 Loading Pose Landmarker model...');

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'assets/models/pose_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    console.log('✅ Pose Landmarker loaded');
  } catch (error) {
    console.error('❌ Failed to load Pose Landmarker:', error);
    throw error;
  }
}

/**
 * TODO: RILEVA CADUTA
 *
 * @param imageData - Frame dalla camera (224x224 RGB)
 * @param timestamp - Timestamp del frame (Date.now())
 * @returns DetectionResult con detected, confidence, type
 */
export interface DetectionResult {
  detected: boolean;
  confidence: number;
  type: 'fall';
}

export function detectFall(imageData: ImageData, timestamp: number): DetectionResult {
  if (!poseLandmarker) {
    console.warn('⚠️ Pose Landmarker not initialized');
    return { detected: false, confidence: 0, type: 'fall' };
  }

  try {
    // Esegui inferenza (cast a any perché MediaPipe accetta formati diversi)
    const result: PoseLandmarkerResult = poseLandmarker.detectForVideo(imageData as any, timestamp);

    // Estrai landmarks della persona
    if (!result.landmarks || result.landmarks.length === 0) {
      return { detected: false, confidence: 0, type: 'fall' };
    }

    const pose = result.landmarks[0];

    // Landmarks MediaPipe (33 punti)
    const nose = pose[0];        // testa (indice 0)
    const leftHip = pose[23];    // bacino sx
    const rightHip = pose[24];   // bacino dx
    const leftShoulder = pose[11]; // spalla sx
    const rightShoulder = pose[12]; // spalla dx

    // Calcola posizione media del bacino e spalle
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const headY = nose.y;

    // LOGICA 1: Se head.y ≈ hip.y → persona orizzontale
    const headHipDiff = Math.abs(headY - avgHipY);

    // LOGICA 2: Se spalle e bacino sono sullo stesso livello → persona sdraiata
    const shoulderHipDiff = Math.abs(avgShoulderY - avgHipY);

    // Caduta se entrambe le condizioni sono vere
    const isFallen = headHipDiff < 0.15 && shoulderHipDiff < 0.2;

    // Confidence in base a quanto è orizzontale (più è orizzontale, più alta)
    let confidence = 0;
    if (isFallen) {
      // Confidence inversamente proporzionale alla differenza
      confidence = Math.max(0.7, 1 - (headHipDiff + shoulderHipDiff) * 2);
      confidence = Math.min(confidence, 0.95); // Cap a 0.95
    }

    return {
      detected: isFallen,
      confidence,
      type: 'fall',
    };

  } catch (error) {
    console.error('❌ Fall detection error:', error);
    return { detected: false, confidence: 0, type: 'fall' };
  }
}

/**
 * CLEANUP
 */
export function cleanupFallDetector(): void {
  if (poseLandmarker) {
    poseLandmarker.close();
    poseLandmarker = null;
  }
}
