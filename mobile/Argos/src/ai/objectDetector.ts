/**
 * Object Detector - Rileva persone, veicoli, folla usando YOLOv8 con TFLite
 *
 * MODULI:
 * - Intrusion: Rileva persone in zona proibita
 * - Crowd: Conta persone e rileva assembramenti
 * - Vehicle: Rileva veicoli (auto, moto, truck, bus)
 *
 * MODELLO: YOLOv8n (nano) ottimizzato per mobile
 * 80 classi COCO: person, car, motorcycle, truck, bus, etc.
 */

import { TensorflowModel } from 'react-native-fast-tflite';
import RNFS from 'react-native-fs';
import type { ImageData, Rect } from './types';

let model: TensorflowModel | null = null;
const MODEL_PATH = 'models/yolov8n_float16.tflite'; // Relativo a assets/

/**
 * COCO DATASET CLASSES (80 classi)
 * Indice 0 = person, 2 = car, 3 = motorcycle, 5 = bus, 7 = truck
 */
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

const VEHICLE_CLASSES = new Set(['car', 'motorcycle', 'truck', 'bus']);

/**
 * INIT - Carica il modello YOLOv8
 *
 * SETUP:
 * 1. Scarica yolov8n_float16.tflite da Ultralytics
 * 2. Mettilo in mobile/Argos/assets/models/
 * 3. Aggiungi a Info.plist: UIFileSharingEnabled = true
 */
export async function initObjectDetector(): Promise<void> {
  if (model) {
    console.log('⚠️ Object Detector already initialized');
    return;
  }

  try {
    console.log('🤖 Loading YOLOv8 model...');

    // Percorso del modello nel bundle
    const modelPath = `${RNFS.MainBundlePath}/${MODEL_PATH}`;

    // Verifica che il file esista
    const exists = await RNFS.exists(modelPath);
    if (!exists) {
      throw new Error(
        `Model file not found: ${modelPath}\n\n` +
        'Download YOLOv8n from:\n' +
        'https://github.com/ultralytics/ultralytics/releases\n' +
        'Or convert from PyTorch:\n' +
        'yolo export model=yolov8n.pt format=tflite imgsz=320\n' +
        'And place it in: mobile/Argos/assets/models/yolov8n_float16.tflite'
      );
    }

    // Carica il modello TFLite
    model = await TensorflowModel.loadFromFile(modelPath);

    console.log('✅ Object Detector initialized');
    console.log(`   Input: ${model.inputs[0].shape.join('x')}`);
    console.log(`   Output: ${model.outputs[0].shape.join('x')}`);

  } catch (error) {
    console.error('❌ Failed to load Object Detector:', error);
    throw error;
  }
}

/**
 * DETECTION TYPES
 */
export interface Detection {
  className: string;
  confidence: number;
  bbox: {
    x: number;      // Normalized 0-1
    y: number;      // Normalized 0-1
    width: number;  // Normalized 0-1
    height: number; // Normalized 0-1
  };
}

export interface IntrusionResult {
  detected: boolean;
  confidence: number;
  type: 'intrusion';
  personCount?: number;
}

export interface CrowdResult {
  detected: boolean;
  confidence: number;
  type: 'crowd';
  count: number;
}

export interface VehicleResult {
  detected: boolean;
  confidence: number;
  type: 'vehicle';
  vehicleType?: string;
}

/**
 * INTRUSION DETECTION
 *
 * Rileva se ci sono persone in una zona proibita (forbiddenZone)
 */
export function detectIntrusion(
  imageData: ImageData,
  forbiddenZone: Rect | null,
  _timestamp: number
): IntrusionResult {
  if (!model) {
    console.warn('⚠️ Object Detector not initialized');
    return { detected: false, confidence: 0, type: 'intrusion' };
  }

  if (!forbiddenZone) {
    console.warn('⚠️ No forbidden zone configured for intrusion detection');
    return { detected: false, confidence: 0, type: 'intrusion' };
  }

  try {
    // Esegui inferenza
    const detections = runYOLO(imageData);

    // Filtra solo persone
    const persons = detections.filter(d => d.className === 'person');

    // Controlla se qualche persona è nella zona proibita
    for (const person of persons) {
      if (isInZone(person.bbox, forbiddenZone)) {
        return {
          detected: true,
          confidence: person.confidence,
          type: 'intrusion',
          personCount: persons.length,
        };
      }
    }

    return { detected: false, confidence: 0, type: 'intrusion', personCount: persons.length };

  } catch (error) {
    console.error('❌ Intrusion detection failed:', error);
    return { detected: false, confidence: 0, type: 'intrusion' };
  }
}

/**
 * CROWD DETECTION
 *
 * Conta persone e rileva assembramenti
 */
export function detectCrowd(
  imageData: ImageData,
  _timestamp: number,
  threshold: number = 5
): CrowdResult {
  if (!model) {
    console.warn('⚠️ Object Detector not initialized');
    return { detected: false, confidence: 0, type: 'crowd', count: 0 };
  }

  try {
    // Esegui inferenza
    const detections = runYOLO(imageData);

    // Conta persone
    const persons = detections.filter(d => d.className === 'person');
    const personCount = persons.length;

    // Rileva folla se supera threshold
    const isCrowd = personCount >= threshold;

    if (isCrowd && persons.length > 0) {
      // Confidence media delle persone rilevate
      const avgConfidence =
        persons.reduce((sum, p) => sum + p.confidence, 0) / persons.length;

      return {
        detected: true,
        confidence: avgConfidence,
        type: 'crowd',
        count: personCount,
      };
    }

    return {
      detected: false,
      confidence: 0,
      type: 'crowd',
      count: personCount,
    };

  } catch (error) {
    console.error('❌ Crowd detection failed:', error);
    return { detected: false, confidence: 0, type: 'crowd', count: 0 };
  }
}

/**
 * VEHICLE DETECTION
 *
 * Rileva veicoli (car, motorcycle, truck, bus)
 */
export function detectVehicle(imageData: ImageData, _timestamp: number): VehicleResult {
  if (!model) {
    console.warn('⚠️ Object Detector not initialized');
    return { detected: false, confidence: 0, type: 'vehicle' };
  }

  try {
    // Esegui inferenza
    const detections = runYOLO(imageData);

    // Filtra veicoli
    const vehicles = detections.filter(d => VEHICLE_CLASSES.has(d.className));

    if (vehicles.length > 0) {
      // Prendi il veicolo con confidence più alta
      const bestVehicle = vehicles.reduce((prev, current) =>
        current.confidence > prev.confidence ? current : prev,
        vehicles[0]
      );

      return {
        detected: true,
        confidence: bestVehicle.confidence,
        type: 'vehicle',
        vehicleType: bestVehicle.className,
      };
    }

    return { detected: false, confidence: 0, type: 'vehicle' };

  } catch (error) {
    console.error('❌ Vehicle detection failed:', error);
    return { detected: false, confidence: 0, type: 'vehicle' };
  }
}

/**
 * RUN YOLO INFERENCE
 *
 * Input: ImageData
 * Output: Array di Detection
 */
function runYOLO(imageData: ImageData): Detection[] {
  if (!model) return [];

  // 1. Preprocessing
  const inputTensor = preprocessImage(imageData);

  // 2. Inferenza
  const output = model.run([inputTensor]);

  // 3. Postprocessing (NMS, parsing)
  const detections = parseYOLOOutput(output[0]);

  return detections;
}

/**
 * PREPROCESSING: Resize e normalizza per YOLOv8
 */
function preprocessImage(imageData: ImageData): Float32Array {
  // YOLOv8n: 320x320x3 (oppure 640x640 per maggiore accuratezza)
  const TARGET_SIZE = 320;
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
 * PARSE YOLO OUTPUT
 *
 * YOLOv8 output shape: [1, 84, 8400]
 * 84 = 4 (bbox coords) + 80 (class scores)
 * 8400 = anchor points
 */
function parseYOLOOutput(output: Float32Array): Detection[] {
  const detections: Detection[] = [];
  const CONFIDENCE_THRESHOLD = 0.5;
  const NUM_CLASSES = 80;
  const NUM_ANCHORS = 8400;

  // Itera su ogni anchor
  for (let i = 0; i < NUM_ANCHORS; i++) {
    // Offset nel buffer: ogni anchor ha 84 valori
    const offset = i * 84;

    // Bbox coords (x, y, w, h) normalizzate 0-1
    const x = output[offset];
    const y = output[offset + 1];
    const width = output[offset + 2];
    const height = output[offset + 3];

    // Class scores (80 classi)
    let maxScore = 0;
    let maxClassIdx = 0;

    for (let c = 0; c < NUM_CLASSES; c++) {
      const score = output[offset + 4 + c];
      if (score > maxScore) {
        maxScore = score;
        maxClassIdx = c;
      }
    }

    // Filtra detections con confidence bassa
    if (maxScore > CONFIDENCE_THRESHOLD) {
      detections.push({
        className: COCO_CLASSES[maxClassIdx] || 'unknown',
        confidence: maxScore,
        bbox: { x, y, width, height },
      });
    }
  }

  // NMS (Non-Maximum Suppression) per rimuovere duplicati
  return applyNMS(detections);
}

/**
 * NON-MAXIMUM SUPPRESSION
 */
function applyNMS(detections: Detection[], iouThreshold: number = 0.5): Detection[] {
  // Ordina per confidence decrescente
  detections.sort((a, b) => b.confidence - a.confidence);

  const keep: Detection[] = [];

  while (detections.length > 0) {
    const best = detections.shift()!;
    keep.push(best);

    // Rimuovi detections con alto IoU rispetto a 'best'
    detections = detections.filter(d => {
      const iou = calculateIoU(best.bbox, d.bbox);
      return iou < iouThreshold;
    });
  }

  return keep;
}

/**
 * CALCULATE IOU (Intersection over Union)
 */
function calculateIoU(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): number {
  // Converti da center format a corner format
  const box1_x1 = box1.x - box1.width / 2;
  const box1_y1 = box1.y - box1.height / 2;
  const box1_x2 = box1.x + box1.width / 2;
  const box1_y2 = box1.y + box1.height / 2;

  const box2_x1 = box2.x - box2.width / 2;
  const box2_y1 = box2.y - box2.height / 2;
  const box2_x2 = box2.x + box2.width / 2;
  const box2_y2 = box2.y + box2.height / 2;

  // Calcola intersezione
  const inter_x1 = Math.max(box1_x1, box2_x1);
  const inter_y1 = Math.max(box1_y1, box2_y1);
  const inter_x2 = Math.min(box1_x2, box2_x2);
  const inter_y2 = Math.min(box1_y2, box2_y2);

  const inter_width = Math.max(0, inter_x2 - inter_x1);
  const inter_height = Math.max(0, inter_y2 - inter_y1);
  const inter_area = inter_width * inter_height;

  // Calcola union
  const box1_area = box1.width * box1.height;
  const box2_area = box2.width * box2.height;
  const union_area = box1_area + box2_area - inter_area;

  return union_area > 0 ? inter_area / union_area : 0;
}

/**
 * CHECK IF BBOX IS IN ZONE
 */
function isInZone(
  bbox: { x: number; y: number; width: number; height: number },
  zone: Rect
): boolean {
  // Centro della bbox
  const centerX = bbox.x;
  const centerY = bbox.y;

  // Controlla se il centro è dentro la zona
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
  if (model) {
    model.dispose();
    model = null;
    console.log('🧹 Object Detector cleaned up');
  }
}
