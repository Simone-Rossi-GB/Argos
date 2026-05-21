/**
 * Streaming Service - Gestisce streaming video RTSP → MediaMTX
 *
 * Usa FFmpeg per leggere dalla camera e inviare lo stream al server MediaMTX
 * Il server poi converte RTSP → HLS per la dashboard web
 */

import { FFmpegKit, FFmpegKitConfig, FFmpegSession } from 'ffmpeg-kit-react-native';
import { getItem } from './storage';

let streamingSession: FFmpegSession | null = null;
let isStreaming = false;
let currentQuality: '360p' | '720p' | '1080p' = '720p';

/**
 * TODO: AVVIA STREAMING
 *
 * Legge dalla camera del device e invia lo stream a MediaMTX via RTSP
 */
export async function startStreaming(quality: '360p' | '720p' | '1080p'): Promise<void> {
  if (isStreaming) {
    console.log('⚠️ Stream already running');
    return;
  }

  try {
    const cameraId = await getItem('camera_id');
    const serverUrl = await getItem('server_url');

    if (!cameraId || !serverUrl) {
      throw new Error('Missing camera_id or server_url');
    }

    currentQuality = quality;

    // Mappa qualità → risoluzione
    const resolutions = {
      '360p': '640x360',
      '720p': '1280x720',
      '1080p': '1920x1080',
    };

    const resolution = resolutions[quality];

    // TODO: COMANDO FFMPEG
    // iOS usa "avfoundation" come input
    // "0:0" = video:audio (primo device video, primo device audio)
    const command = `
      -f avfoundation
      -i "0:0"
      -vf scale=${resolution}
      -c:v libx264
      -preset ultrafast
      -tune zerolatency
      -b:v 2M
      -maxrate 2M
      -bufsize 4M
      -pix_fmt yuv420p
      -g 50
      -f rtsp
      rtsp://${serverUrl}:8554/${cameraId}
    `.trim().replace(/\s+/g, ' ');

    console.log(`🎥 Starting FFmpeg stream: ${command}`);

    // Esegui FFmpeg in modo asincrono
    streamingSession = await FFmpegKit.executeAsync(
      command,
      async (session) => {
        const returnCode = await session.getReturnCode();
        console.log(`FFmpeg session completed with return code: ${returnCode}`);

        if (returnCode.isValueSuccess()) {
          console.log('✅ Stream completed successfully');
        } else {
          console.error(`❌ Stream failed with code: ${returnCode}`);
        }

        isStreaming = false;
        streamingSession = null;
      },
      (log) => {
        // Log FFmpeg output (utile per debug)
        console.log(`[FFmpeg] ${log.getMessage()}`);
      },
      (statistics) => {
        // Statistiche streaming (opzionale)
        // console.log(`[Stats] bitrate: ${statistics.getBitrate()}, fps: ${statistics.getVideoFps()}`);
      }
    );

    isStreaming = true;
    console.log(`✅ Streaming started at ${quality}`);

  } catch (error) {
    console.error('❌ Failed to start streaming:', error);
    isStreaming = false;
    streamingSession = null;
    throw error;
  }
}

/**
 * TODO: FERMA STREAMING
 */
export async function stopStreaming(): Promise<void> {
  if (!isStreaming || !streamingSession) {
    console.log('⚠️ No stream running');
    return;
  }

  try {
    const sessionId = await streamingSession.getSessionId();
    await FFmpegKitConfig.cancel(sessionId);

    streamingSession = null;
    isStreaming = false;

    console.log('✅ Streaming stopped');

  } catch (error) {
    console.error('❌ Failed to stop streaming:', error);
    throw error;
  }
}

/**
 * TODO: CAMBIA QUALITÀ
 *
 * Ferma lo stream corrente e riavvia con la nuova qualità
 */
export async function setQuality(quality: '360p' | '720p' | '1080p'): Promise<void> {
  try {
    if (isStreaming) {
      console.log(`🔄 Changing quality from ${currentQuality} to ${quality}...`);
      await stopStreaming();
      await startStreaming(quality);
    } else {
      currentQuality = quality;
      console.log(`✅ Quality preset to ${quality} (will apply on next stream)`);
    }

  } catch (error) {
    console.error('❌ Failed to change quality:', error);
    throw error;
  }
}

/**
 * TODO: AUTO-STREAM
 *
 * Avvia lo stream per N secondi e poi lo ferma automaticamente
 * Usalo quando l'AI rileva un evento importante (es. caduta, intrusion)
 */
export async function startAutoStream(durationSeconds: number): Promise<void> {
  try {
    await startStreaming(currentQuality);

    setTimeout(async () => {
      await stopStreaming();
      console.log(`⏱️ Auto-stream stopped after ${durationSeconds} seconds`);
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
