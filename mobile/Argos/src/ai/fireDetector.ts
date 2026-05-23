/**
 * Fire Detector - Rileva incendi e fumo usando MobileNetV2 con TFLite
 *
 * MODELLO: MobileNetV2 allenato su Fire-Smoke dataset
 * Output: 3 classi → [fire, smoke, normal]
 *
 * NOTA: Questo modello deve essere allenato custom su dataset fuoco/fumo.
 * Usa dataset pubblici come:
 * - Fire Detection Dataset (Kaggle)
 * - Smoke Detection Dataset (Roboflow)
 */

import { TensorflowModel } from 'react-native-nitro-tflite';
import RNFS from 'react-native-fs';
import type { ImageData } from './types';

let model: TensorflowModel | null = null;
const MODEL_PATH = 'models/fire_smoke_mobilenetv2.tflite'; // Relativo a assets/

/**
 * CLASS LABELS
 */
const CLASS_LABELS = ['fire', 'smoke', 'normal'];

/**
 * INIT - Carica il modello MobileNetV2
 *
 * SETUP:
 * 1. Allena MobileNetV2 su dataset fuoco/fumo (TensorFlow/Keras)
 * 2. Converti in .tflite
 * 3. Mettilo in mobile/Argos/assets/models/
 * 4. Aggiungi a Info.plist: UIFileSharingEnabled = true
 */
export async function initFireDetector(): Promise<void> {
  // 🚧 STUB MODE: AI disabilitata temporaneamente
  console.log('🚧 Fire Detector in STUB mode (AI disabled)');
  return;

  /* COMMENTED OUT - Uncomment when model is ready
  if (model) {
    console.log('⚠️ Fire Detector already initialized');
    return;
  }

  try {
    console.log('🤖 Loading Fire Detection model...');

    // Percorso del modello nel bundle
    const modelPath = `${RNFS.MainBundlePath}/${MODEL_PATH}`;

    // Verifica che il file esista
    const exists = await RNFS.exists(modelPath);
    if (!exists) {
      throw new Error(
        `Model file not found: ${modelPath}\n\n` +
        '⚠️ CUSTOM MODEL REQUIRED:\n' +
        'This model must be trained on fire/smoke dataset.\n\n' +
        'Steps:\n' +
        '1. Download fire-smoke dataset from Kaggle/Roboflow\n' +
        '2. Train MobileNetV2 with TensorFlow/Keras\n' +
        '3. Convert to TFLite: converter.convert()\n' +
        '4. Place in: mobile/Argos/assets/models/fire_smoke_mobilenetv2.tflite\n\n' +
        'Example training script provided in MODELS_GUIDE.md'
      );
    }

    // Carica il modello TFLite
    model = await TensorflowModel.loadFromFile(modelPath);

    console.log('✅ Fire Detector initialized');
    console.log(`   Input: ${model.inputs[0].shape.join('x')}`);
    console.log(`   Output: ${model.outputs[0].shape.join('x')}`);

  } catch (error) {
    console.error('❌ Failed to load Fire Detector:', error);
    throw error;
  }
  */
}

/**
 * DETECTION RESULT
 */
export interface FireResult {
  detected: boolean;
  confidence: number;
  type: 'fire';
  fireType?: 'fire' | 'smoke' | 'both';
}

/**
 * DETECT FIRE/SMOKE
 *
 * Input: ImageData (width, height, data: Uint8Array RGB)
 * Output: FireResult
 *
 * Logica:
 * 1. Preprocessing: Resize a 224x224, normalizza
 * 2. Inferenza con MobileNetV2
 * 3. Output: [fire_prob, smoke_prob, normal_prob]
 * 4. Se fire_prob > threshold → fire detected
 */
export function detectFire(imageData: ImageData, _timestamp: number): FireResult {
  if (!model) {
    console.warn('⚠️ Fire Detector not initialized');
    return { detected: false, confidence: 0, type: 'fire' };
  }

  try {
    // 1. PREPROCESSING: MobileNetV2 richiede [1, 224, 224, 3] normalizzato 0-1
    const inputTensor = preprocessImage(imageData);

    // 2. INFERENZA
    const output = model.run([inputTensor]);

    // 3. OUTPUT: [1, 3] → [fire_prob, smoke_prob, normal_prob]
    const predictions = parseOutput(output[0]);

    // 4. ANALISI RISULTATI
    const result = analyzeFireDetection(predictions);

    return result;

  } catch (error) {
    console.error('❌ Fire detection failed:', error);
    return { detected: false, confidence: 0, type: 'fire' };
  }
}

/**
 * PREPROCESSING: Resize e normalizza immagine per MobileNetV2
 */
function preprocessImage(imageData: ImageData): Float32Array {
  // MobileNetV2: 224x224x3
  const TARGET_SIZE = 224;
  const inputSize = TARGET_SIZE * TARGET_SIZE * 3;
  const input = new Float32Array(inputSize);

  // Cast a Uint8Array
  const data = imageData.data instanceof Uint8Array
    ? imageData.data
    : new Uint8Array(imageData.data);

  // Resize nearest-neighbor
  const scaleX = imageData.width / TARGET_SIZE;
  const scaleY = imageData.height / TARGET_SIZE;

  for (let y = 0; y < TARGET_SIZE; y++) {
    for (let x = 0; x < TARGET_SIZE; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcY * imageData.width + srcX) * 3;
      const dstIdx = (y * TARGET_SIZE + x) * 3;

      // Normalizza 0-255 → 0-1
      input[dstIdx] = data[srcIdx] / 255;       // R
      input[dstIdx + 1] = data[srcIdx + 1] / 255; // G
      input[dstIdx + 2] = data[srcIdx + 2] / 255; // B
    }
  }

  return input;
}

/**
 * PARSE OUTPUT: Estrai probabilità per ogni classe
 */
interface Predictions {
  fire: number;
  smoke: number;
  normal: number;
}

function parseOutput(output: Float32Array): Predictions {
  // Output shape: [1, 3] → [fire, smoke, normal]
  return {
    fire: output[0],
    smoke: output[1],
    normal: output[2],
  };
}

/**
 * ANALYZE FIRE DETECTION
 *
 * Logica:
 * - Se fire_prob > 0.7 → fire detected
 * - Se smoke_prob > 0.7 → smoke detected
 * - Se entrambi > 0.6 → both detected
 */
function analyzeFireDetection(predictions: Predictions): FireResult {
  const FIRE_THRESHOLD = 0.7;
  const SMOKE_THRESHOLD = 0.7;
  const BOTH_THRESHOLD = 0.6;

  const { fire, smoke, normal } = predictions;

  // Caso 1: Entrambi rilevati
  if (fire > BOTH_THRESHOLD && smoke > BOTH_THRESHOLD) {
    return {
      detected: true,
      confidence: Math.max(fire, smoke),
      type: 'fire',
      fireType: 'both',
    };
  }

  // Caso 2: Solo fire
  if (fire > FIRE_THRESHOLD) {
    return {
      detected: true,
      confidence: fire,
      type: 'fire',
      fireType: 'fire',
    };
  }

  // Caso 3: Solo smoke
  if (smoke > SMOKE_THRESHOLD) {
    return {
      detected: true,
      confidence: smoke,
      type: 'fire',
      fireType: 'smoke',
    };
  }

  // Caso 4: Nessuna rilevazione
  return {
    detected: false,
    confidence: normal,
    type: 'fire',
  };
}

/**
 * CLEANUP
 */
export function cleanupFireDetector(): void {
  if (model) {
    model.dispose();
    model = null;
    console.log('🧹 Fire Detector cleaned up');
  }
}

/**
 * TRAINING NOTES
 *
 * Per allenare il modello custom:
 *
 * ```python
 * import tensorflow as tf
 * from tensorflow.keras.applications import MobileNetV2
 * from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
 * from tensorflow.keras.models import Model
 *
 * # Base model
 * base_model = MobileNetV2(
 *     input_shape=(224, 224, 3),
 *     include_top=False,
 *     weights='imagenet'
 * )
 *
 * # Custom head
 * x = base_model.output
 * x = GlobalAveragePooling2D()(x)
 * x = Dense(128, activation='relu')(x)
 * predictions = Dense(3, activation='softmax')(x)  # 3 classi
 *
 * model = Model(inputs=base_model.input, outputs=predictions)
 *
 * # Train on your fire/smoke dataset
 * model.compile(
 *     optimizer='adam',
 *     loss='categorical_crossentropy',
 *     metrics=['accuracy']
 * )
 *
 * model.fit(train_dataset, epochs=10, validation_data=val_dataset)
 *
 * # Convert to TFLite
 * converter = tf.lite.TFLiteConverter.from_keras_model(model)
 * converter.optimizations = [tf.lite.Optimize.DEFAULT]
 * tflite_model = converter.convert()
 *
 * with open('fire_smoke_mobilenetv2.tflite', 'wb') as f:
 *     f.write(tflite_model)
 * ```
 *
 * Dataset consigliati:
 * - Fire Detection Dataset (Kaggle): https://www.kaggle.com/datasets/phylake1337/fire-dataset
 * - Smoke Detection (Roboflow): https://universe.roboflow.com/smoke-detection
 */
