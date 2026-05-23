/**
 * Streaming Service - WebRTC Implementation
 *
 * Streaming video dalla camera del telefono a MediaMTX via WebRTC (WHIP protocol).
 * Cross-platform: iOS + Android
 *
 * SETUP BACKEND:
 * MediaMTX deve avere WebRTC abilitato:
 * ```yaml
 * # docker-compose.yml
 * mediamtx:
 *   environment:
 *     MTX_WEBRTCENABLE: "yes"
 *     MTX_WEBRTCICESERVERS: '[{urls: ["stun:stun.l.google.com:19302"]}]'
 *   ports:
 *     - "8889:8889" # WebRTC
 * ```
 */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { getItem } from './storage';

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let isStreaming = false;
let currentQuality: '360p' | '720p' | '1080p' = '720p';

/**
 * QUALITY SETTINGS
 */
const QUALITY_CONSTRAINTS = {
  '360p': { width: 640, height: 360, frameRate: 30 },
  '720p': { width: 1280, height: 720, frameRate: 30 },
  '1080p': { width: 1920, height: 1080, frameRate: 30 },
};

/**
 * START STREAMING
 *
 * 1. Ottieni stream dalla camera
 * 2. Crea RTCPeerConnection
 * 3. Negozia con MediaMTX via WHIP
 * 4. Inizia streaming
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
      throw new Error('Missing camera_id or server_url in storage');
    }

    // Pulisci serverUrl (rimuovi http:// e porta)
    const cleanUrl = serverUrl
      .replace(/^https?:\/\//, '')
      .replace(/:\d+$/, '');

    console.log(`📹 Starting WebRTC stream at ${quality} to ${cleanUrl}:8889/${cameraId}`);

    currentQuality = quality;
    const constraints = QUALITY_CONSTRAINTS[quality];

    // 1. OTTIENI STREAM DALLA CAMERA
    localStream = await mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Camera posteriore
        width: constraints.width,
        height: constraints.height,
        frameRate: constraints.frameRate,
      },
      audio: false, // Solo video per sorveglianza
    });

    console.log('✅ Local stream obtained');

    // 2. CREA PEER CONNECTION
    peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // 3. AGGIUNGI STREAM AL PEER CONNECTION
    localStream.getTracks().forEach(track => {
      peerConnection!.addTrack(track, localStream!);
    });

    // 4. HANDLE ICE CANDIDATES
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        console.log('🧊 ICE candidate:', event.candidate.candidate);
      }
    };

    // 5. CREA OFFER SDP
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });

    await peerConnection.setLocalDescription(offer);

    // 6. NEGOZIA CON MEDIAMTX (WHIP PROTOCOL)
    const whipUrl = `http://${cleanUrl}:8889/${cameraId}/whip`;
    const response = await fetch(whipUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });

    if (!response.ok) {
      throw new Error(`WHIP negotiation failed: ${response.status} ${response.statusText}`);
    }

    // 7. SET REMOTE DESCRIPTION (Answer da MediaMTX)
    const answerSdp = await response.text();
    const answer = new RTCSessionDescription({
      type: 'answer',
      sdp: answerSdp,
    });

    await peerConnection.setRemoteDescription(answer);

    isStreaming = true;
    console.log('✅ WebRTC streaming started');

  } catch (error) {
    console.error('❌ Failed to start streaming:', error);
    await cleanup();
    throw error;
  }
}

/**
 * STOP STREAMING
 */
export async function stopStreaming(): Promise<void> {
  if (!isStreaming) {
    console.log('⚠️ No stream running');
    return;
  }

  console.log('⏹️ Stopping stream...');
  await cleanup();
  isStreaming = false;
  console.log('✅ Stream stopped');
}

/**
 * CHANGE QUALITY
 *
 * Restart stream con nuova qualità
 */
export async function setQuality(quality: '360p' | '720p' | '1080p'): Promise<void> {
  try {
    if (isStreaming) {
      console.log(`🔄 Changing quality from ${currentQuality} to ${quality}...`);
      await stopStreaming();
      await startStreaming(quality);
    } else {
      currentQuality = quality;
      console.log(`✅ Quality preset to ${quality}`);
    }
  } catch (error) {
    console.error('❌ Failed to change quality:', error);
    throw error;
  }
}

/**
 * AUTO-STREAM
 *
 * Avvia streaming per durata specificata, poi ferma automaticamente
 */
export async function startAutoStream(durationSeconds: number): Promise<void> {
  try {
    console.log(`🎥 Starting auto-stream for ${durationSeconds} seconds...`);
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
 * CLEANUP
 *
 * Libera risorse WebRTC
 */
async function cleanup(): Promise<void> {
  // Ferma tutti i track del local stream
  if (localStream) {
    localStream.getTracks().forEach(track => {
      track.stop();
    });
    localStream = null;
  }

  // Chiudi peer connection
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
}

/**
 * GETTERS
 */
export function getStreamingStatus(): boolean {
  return isStreaming;
}

export function getCurrentQuality(): '360p' | '720p' | '1080p' {
  return currentQuality;
}

/**
 * TROUBLESHOOTING
 *
 * Se lo streaming non funziona:
 *
 * 1. Verifica MediaMTX logs:
 *    docker logs argos-mediamtx | grep -i webrtc
 *
 * 2. Testa WHIP endpoint:
 *    curl -X POST http://localhost:8889/test-camera/whip
 *
 * 3. Firewall / Network:
 *    - Porta 8889 deve essere aperta
 *    - STUN server deve essere raggiungibile
 *    - Se sei su rete mobile, potrebbe servire TURN server
 *
 * 4. Permessi Camera:
 *    - iOS: Info.plist deve avere NSCameraUsageDescription
 *    - Android: AndroidManifest.xml deve avere CAMERA permission
 *
 * 5. MediaMTX config:
 *    ```yaml
 *    webrtcEnable: yes
 *    webrtcICEServers: [{urls: ["stun:stun.l.google.com:19302"]}]
 *    ```
 */
