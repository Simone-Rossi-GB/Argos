/**
 * Command Handler - Gestisce comandi MQTT dal backend
 *
 * Il backend può inviare comandi su: cameras/<uuid>/cmd
 * Comandi disponibili:
 * - start_stream: avvia streaming HLS
 * - stop_stream: ferma streaming
 * - set_quality: cambia qualità (360p, 720p, 1080p)
 */

import { startStreaming, stopStreaming, setQuality } from './streaming';

/**
 * TODO: GESTISCI COMANDI
 *
 * Questa funzione viene chiamata automaticamente da mqtt.ts
 * quando arriva un messaggio sul topic cameras/<uuid>/cmd
 */
export async function handleCommand(topic: string, message: Buffer): Promise<void> {
  try {
    const cmd = JSON.parse(message.toString());

    console.log(`📥 Received command: ${cmd.action}`);

    switch (cmd.action) {
      case 'start_stream':
        // Backend chiede di avviare lo stream
        await handleStartStream(cmd);
        break;

      case 'stop_stream':
        // Backend chiede di fermare lo stream
        await handleStopStream();
        break;

      case 'set_quality':
        // Backend chiede di cambiare la qualità dello stream
        await handleSetQuality(cmd);
        break;

      default:
        console.warn(`⚠️ Unknown command: ${cmd.action}`);
    }

  } catch (error) {
    console.error('❌ Failed to handle command:', error);
  }
}

/**
 * START STREAM
 */
async function handleStartStream(cmd: {
  quality?: '360p' | '720p' | '1080p';
}): Promise<void> {
  const quality = cmd.quality || '720p';
  console.log(`🎥 Starting stream at ${quality}...`);

  await startStreaming(quality);

  // TODO: Opzionale - invia ACK al backend che lo stream è partito
  console.log('✅ Stream started');
}

/**
 * STOP STREAM
 */
async function handleStopStream(): Promise<void> {
  console.log('⏹️ Stopping stream...');

  await stopStreaming();

  // TODO: Opzionale - invia ACK al backend che lo stream è fermo
  console.log('✅ Stream stopped');
}

/**
 * SET QUALITY
 */
async function handleSetQuality(cmd: {
  quality: '360p' | '720p' | '1080p';
}): Promise<void> {
  const { quality } = cmd;
  console.log(`🎬 Changing stream quality to ${quality}...`);

  await setQuality(quality);

  console.log(`✅ Quality set to ${quality}`);
}
