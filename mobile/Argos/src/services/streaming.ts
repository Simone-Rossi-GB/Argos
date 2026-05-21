/**
 * Streaming Service - STUB VERSION
 *
 * ⚠️ NOTA: FFmpegKit è stato ritirato nel gennaio 2025 e non è più disponibile.
 *
 * Alternative future:
 * 1. Community fork: https://github.com/luthviar/ffmpeg-kit-ios-full
 * 2. react-native-video per streaming
 * 3. expo-av
 * 4. WebRTC nativo iOS
 *
 * Per ora, queste funzioni sono STUB che non fanno nulla ma prevengono errori.
 */

import { getItem } from './storage';

let isStreaming = false;
let currentQuality: '360p' | '720p' | '1080p' = '720p';

/**
 * STUB: Avvia streaming (non implementato)
 */
export async function startStreaming(quality: '360p' | '720p' | '1080p'): Promise<void> {
  console.warn('⚠️ Streaming not implemented - FFmpegKit retired. See streaming.ts for alternatives.');

  if (isStreaming) {
    console.log('⚠️ Stream already "running" (stub mode)');
    return;
  }

  try {
    const cameraId = await getItem('camera_id');
    const serverUrl = await getItem('server_url');

    if (!cameraId || !serverUrl) {
      throw new Error('Missing camera_id or server_url');
    }

    currentQuality = quality;

    // Simula streaming
    isStreaming = true;
    console.log(`📹 [STUB] "Streaming" started at ${quality} to ${serverUrl}:8554/${cameraId}`);

  } catch (error) {
    console.error('❌ Failed to start streaming stub:', error);
    isStreaming = false;
    throw error;
  }
}

/**
 * STUB: Ferma streaming
 */
export async function stopStreaming(): Promise<void> {
  if (!isStreaming) {
    console.log('⚠️ No stream running');
    return;
  }

  isStreaming = false;
  console.log('⏹️ [STUB] Streaming stopped');
}

/**
 * STUB: Cambia qualità
 */
export async function setQuality(quality: '360p' | '720p' | '1080p'): Promise<void> {
  try {
    if (isStreaming) {
      console.log(`🔄 [STUB] Changing quality from ${currentQuality} to ${quality}...`);
      await stopStreaming();
      await startStreaming(quality);
    } else {
      currentQuality = quality;
      console.log(`✅ [STUB] Quality preset to ${quality}`);
    }

  } catch (error) {
    console.error('❌ Failed to change quality:', error);
    throw error;
  }
}

/**
 * STUB: Auto-stream
 */
export async function startAutoStream(durationSeconds: number): Promise<void> {
  try {
    console.log(`🎥 [STUB] Starting auto-stream for ${durationSeconds} seconds...`);
    await startStreaming(currentQuality);

    setTimeout(async () => {
      await stopStreaming();
      console.log(`⏱️ [STUB] Auto-stream stopped after ${durationSeconds} seconds`);
    }, durationSeconds * 1000);

  } catch (error) {
    console.error('❌ Failed to start auto-stream:', error);
  }
}

/**
 * GETTER: Controlla se sta streamando
 */
export function getStreamingStatus(): boolean {
  return isStreaming;
}

/**
 * GETTER: Qualità corrente
 */
export function getCurrentQuality(): '360p' | '720p' | '1080p' {
  return currentQuality;
}
