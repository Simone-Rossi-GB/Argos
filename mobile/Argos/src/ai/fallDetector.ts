/**
 * Fall Detector - Rileva cadute usando MoveNet Pose Detection con TFLite
 *
 * LOGICA: Se la testa è quasi allo stesso livello del bacino → persona orizzontale → caduta
 *
 * MODELLO: MoveNet Lightning (192x192) o MoveNet Thunder (256x256)
 * 17 keypoints: nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles
 */

import { TensorflowModel } from 'react-native-nitro-tflite';
import RNFS from 'react-native-fs';
import type { ImageData } from './types';

let model: TensorflowModel | null = null;
const MODEL_PATH = 'models/movenet_thunder_fp16.tflite';

/**
 * KEYPOINT INDICES (MoveNet)
 */
const KEYPOINTS = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
};

/**
 * INIT - Carica il modello MoveNet
 *
 * SETUP:
 * 1. Scarica movenet_thunder_fp16.tflite da TensorFlow Hub
 * 2. Mettilo in mobile/Argos/assets/models/
 * 3. Aggiungi a Info.plist: UIFileSharingEnabled = true
 */
export async function initFallDetector(): Promise<void> {
  if (model) {
    console.log('⚠️ Fall Detector already initialized');
    return;
  }

  try {
    console.log('🤖 Loading MoveNet model...');

    // DEBUG: Test altri moduli nativi
    console.log('🔍 RNFS type:', typeof RNFS);
    console.log('🔍 RNFS.MainBundlePath:', RNFS.MainBundlePath);

    // DEBUG: Verifica che TensorflowModel sia disponibile
    console.log('🔍 TensorflowModel type:', typeof TensorflowModel);
    console.log('🔍 TensorflowModel:', TensorflowModel);
    console.log('🔍 TensorflowModel keys:', TensorflowModel ? Object.keys(TensorflowModel) : 'undefined');

    if (!TensorflowModel || typeof TensorflowModel.loadFromFile !== 'function') {
      throw new Error(
        'TensorFlow Lite native module not loaded correctly.\n' +
        'Try:\n' +
        '1. Clean build (Cmd+Shift+K in Xcode)\n' +
        '2. Rebuild (Cmd+B)\n' +
        '3. Restart Metro with --reset-cache'
      );
    }

    // Percorso del modello nel bundle
    const modelPath = `${RNFS.MainBundlePath}/${MODEL_PATH}`;
    console.log('🔍 Model path:', modelPath);

    // Verifica che il file esista
    const exists = await RNFS.exists(modelPath);
    console.log('🔍 Model file exists:', exists);

    if (!exists) {
      throw new Error(
        `Model file not found: ${modelPath}\n\n` +
        'Download MoveNet Thunder from:\n' +
        'https://www.kaggle.com/models/google/movenet/tfLite/singlepose-thunder-fp16\n' +
        'And place it in: mobile/Argos/assets/models/movenet_thunder_fp16.tflite'
      );
    }

    // Carica il modello TFLite
    model = await TensorflowModel.loadFromFile(modelPath);

    console.log('✅ Fall Detector initialized');
    console.log(`   Input: ${model.inputs[0].shape.join('x')}`);
    console.log(`   Output: ${model.outputs[0].shape.join('x')}`);

  } catch (error) {
    console.error('❌ Failed to load Fall Detector:', error);
    throw error;
  }
}

/**
 * DETECTION RESULT
 */
export interface FallDetectionResult {
  detected: boolean;
  confidence: number;
  type: 'fall';
  orientation?: 'horizontal' | 'vertical';
}

/**
 * DETECT FALL
 *
 * Input: ImageData (width, height, data: Uint8Array RGB)
 * Output: FallDetectionResult
 *
 * Logica:
 * 1. Esegui inferenza con MoveNet → 17 keypoints (y, x, confidence)
 * 2. Calcola orientamento corpo (testa vs bacino)
 * 3. Se diff Y < threshold → caduta
 */
export function detectFall(imageData: ImageData, _timestamp: number): FallDetectionResult {
  if (!model) {
    console.warn('⚠️ Fall Detector not initialized');
    return { detected: false, confidence: 0, type: 'fall' };
  }

  try {
    // 1. PREPROCESSING: MoveNet richiede input [1, 256, 256, 3] normalizzato 0-255
    // imageData.data è Uint8Array RGB già ridimensionato a 224x224 dal frameProcessor
    // Dobbiamo fare resize a 256x256 (o 192x192 per Lightning)

    const inputTensor = preprocessImage(imageData);

    // 2. INFERENZA
    const output = model.run([inputTensor]);

    // 3. OUTPUT: [1, 1, 17, 3] dove 17 keypoints, 3 = [y, x, confidence]
    const keypoints = parseKeypoints(output[0]);

    // 4. ANALISI CADUTA
    const result = analyzeFall(keypoints);

    return result;

  } catch (error) {
    console.error('❌ Fall detection failed:', error);
    return { detected: false, confidence: 0, type: 'fall' };
  }
}

/**
 * PREPROCESSING: Resize e normalizza immagine per MoveNet
 */
function preprocessImage(imageData: ImageData): Float32Array {
  // MoveNet Thunder: 256x256x3
  const TARGET_SIZE = 256;
  const inputSize = TARGET_SIZE * TARGET_SIZE * 3;
  const input = new Float32Array(inputSize);

  // Cast a Uint8Array per TypeScript
  const data = imageData.data instanceof Uint8Array
    ? imageData.data
    : new Uint8Array(imageData.data);

  // Simple nearest-neighbor resize da 224x224 a 256x256
  const scaleX = imageData.width / TARGET_SIZE;
  const scaleY = imageData.height / TARGET_SIZE;

  for (let y = 0; y < TARGET_SIZE; y++) {
    for (let x = 0; x < TARGET_SIZE; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcY * imageData.width + srcX) * 3;
      const dstIdx = (y * TARGET_SIZE + x) * 3;

      // Copia RGB (già normalizzato 0-255)
      input[dstIdx] = data[srcIdx];       // R
      input[dstIdx + 1] = data[srcIdx + 1]; // G
      input[dstIdx + 2] = data[srcIdx + 2]; // B
    }
  }

  return input;
}

/**
 * PARSE KEYPOINTS: Estrai 17 keypoints da output MoveNet
 */
interface Keypoint {
  y: number;      // 0-1 normalized
  x: number;      // 0-1 normalized
  confidence: number; // 0-1
}

function parseKeypoints(output: Float32Array): Keypoint[] {
  // Output shape: [1, 1, 17, 3]
  const keypoints: Keypoint[] = [];

  for (let i = 0; i < 17; i++) {
    const idx = i * 3;
    keypoints.push({
      y: output[idx],
      x: output[idx + 1],
      confidence: output[idx + 2],
    });
  }

  return keypoints;
}

/**
 * ANALYZE FALL: Logica di rilevamento caduta
 *
 * Algoritmo:
 * 1. Prendi nose (testa) e hips (bacino)
 * 2. Calcola differenza Y (verticale)
 * 3. Se diff < 0.15 → persona orizzontale → caduta
 * 4. Calcola anche shoulder-hip diff per evitare falsi positivi (seduti)
 */
function analyzeFall(keypoints: Keypoint[]): FallDetectionResult {
  // 1. Estrai keypoints necessari
  const nose = keypoints[KEYPOINTS.NOSE];
  const leftHip = keypoints[KEYPOINTS.LEFT_HIP];
  const rightHip = keypoints[KEYPOINTS.RIGHT_HIP];
  const leftShoulder = keypoints[KEYPOINTS.LEFT_SHOULDER];
  const rightShoulder = keypoints[KEYPOINTS.RIGHT_SHOULDER];

  // 2. Verifica confidence minima
  const MIN_CONFIDENCE = 0.3;
  if (
    nose.confidence < MIN_CONFIDENCE ||
    leftHip.confidence < MIN_CONFIDENCE ||
    rightHip.confidence < MIN_CONFIDENCE
  ) {
    return { detected: false, confidence: 0, type: 'fall' };
  }

  // 3. Calcola posizioni medie
  const avgHipY = (leftHip.y + rightHip.y) / 2;
  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const headY = nose.y;

  // 4. Calcola differenze Y (verticale)
  const headHipDiff = Math.abs(headY - avgHipY);
  const shoulderHipDiff = Math.abs(avgShoulderY - avgHipY);

  // 5. LOGICA CADUTA
  // Se testa e bacino sono allo stesso livello Y → orizzontale → caduta
  // E se spalle e bacino sono vicine → corpo compresso → caduta
  const FALL_THRESHOLD = 0.15; // Più basso = più sensibile
  const SHOULDER_THRESHOLD = 0.2;

  const isFallen =
    headHipDiff < FALL_THRESHOLD &&
    shoulderHipDiff < SHOULDER_THRESHOLD;

  if (isFallen) {
    // Calcola confidence media dai keypoints
    const avgConfidence = (
      nose.confidence +
      leftHip.confidence +
      rightHip.confidence +
      leftShoulder.confidence +
      rightShoulder.confidence
    ) / 5;

    return {
      detected: true,
      confidence: avgConfidence,
      type: 'fall',
      orientation: 'horizontal',
    };
  }

  return {
    detected: false,
    confidence: 0,
    type: 'fall',
    orientation: 'vertical',
  };
}

/**
 * CLEANUP
 */
export function cleanupFallDetector(): void {
  if (model) {
    model.dispose();
    model = null;
    console.log('🧹 Fall Detector cleaned up');
  }
}
