/**
 * Tipi comuni per i detector AI
 */

/**
 * ImageData - Formato frame per MediaPipe
 * (equivalente a ImageData del web, ma per React Native)
 */
export interface ImageData {
  data: Uint8Array | ArrayBuffer;
  width: number;
  height: number;
}

/**
 * Risultato generico di detection
 */
export interface DetectionResult {
  detected: boolean;
  confidence: number;
  type: 'fall' | 'intrusion' | 'crowd' | 'vehicle' | 'fire';
  [key: string]: any; // Campi extra opzionali
}

/**
 * Rettangolo per zone vietate (intrusion detection)
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
