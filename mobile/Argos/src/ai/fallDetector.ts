/**
 * Fall Detector - Rileva cadute usando Pose Landmarker di MediaPipe
 *
 * LOGICA: Se la testa è quasi allo stesso livello del bacino → persona orizzontale → caduta
 */

// TODO: Installa MediaPipe Tasks Vision
// npm install @mediapipe/tasks-vision

// import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

let poseLandmarker: any = null; // TODO: tipizza con PoseLandmarker

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

    // TODO: Decommenta e implementa
    /*
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
    */

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
    // TODO: Esegui inferenza
    // const result = poseLandmarker.detectForVideo(imageData, timestamp);

    // TODO: Estrai landmarks della persona
    /*
    if (!result.landmarks || result.landmarks.length === 0) {
      return { detected: false, confidence: 0, type: 'fall' };
    }

    const pose = result.landmarks[0];

    // Landmarks MediaPipe (33 punti)
    const nose = pose[0];        // testa
    const leftHip = pose[23];    // bacino sx
    const rightHip = pose[24];   // bacino dx

    // Calcola posizione media del bacino
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const headY = nose.y;

    // LOGICA: Se head.y ≈ hip.y → persona orizzontale
    const yDiff = Math.abs(headY - avgHipY);
    const isFallen = yDiff < 0.15; // soglia empirica (15% dell'immagine)

    // Confidence in base a quanto è orizzontale
    const confidence = isFallen ? Math.max(0.7, 1 - yDiff * 3) : 0;

    return {
      detected: isFallen,
      confidence,
      type: 'fall',
    };
    */

    // PLACEHOLDER - rimuovi quando implementi
    return { detected: false, confidence: 0, type: 'fall' };

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
