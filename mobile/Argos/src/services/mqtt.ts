/**
 * MQTT Service - Client MQTT per comunicazione real-time con il backend
 *
 * Gestisce:
 * - Connessione al broker Mosquitto (ws://server:9001)
 * - Pubblicazione eventi AI su cameras/<uuid>/events
 * - Pubblicazione stato su cameras/<uuid>/status
 * - Ricezione comandi da cameras/<uuid>/cmd
 */

import mqtt, { MqttClient } from 'mqtt';
import { getItem } from './storage';
import { handleCommand } from './commandHandler';

let client: MqttClient | null = null;
let isConnected = false;
let isConnecting = false;

/**
 * CONNETTI al broker MQTT
 *
 * Chiamalo all'avvio della CameraScreen
 */
export async function connectMQTT(): Promise<void> {
  // Se già connesso, non riconnettersi
  if (client && isConnected) {
    console.log('✅ MQTT already connected, skipping reconnect');
    return;
  }

  // Se sta già connettendo, aspetta
  if (isConnecting) {
    console.log('⏳ MQTT connection already in progress, waiting...');
    return;
  }

  isConnecting = true;

  // Pulisci connessione esistente se presente
  if (client) {
    try {
      console.log('🧹 Cleaning up existing MQTT client...');
      await client.endAsync();
      client = null;
    } catch (error) {
      console.warn('⚠️ Error cleaning up client:', error);
    }
  }

  try {
    const serverUrl = await getItem('server_url');
    const cameraId = await getItem('camera_id');

    console.log('🔍 MQTT Debug - serverUrl:', serverUrl);
    console.log('🔍 MQTT Debug - cameraId:', cameraId);

    if (!serverUrl || !cameraId) {
      console.error('❌ Missing storage data:', { serverUrl, cameraId });
      throw new Error('Missing server_url or camera_id');
    }

    // Rimuovi http:// e porta (es. http://172.20.10.4:8080 → 172.20.10.4)
    const cleanUrl = serverUrl
      .replace(/^https?:\/\//, '')  // Rimuovi protocollo
      .replace(/:\d+$/, '');         // Rimuovi porta

    // WebSocket MQTT su porta 9001
    const brokerUrl = `ws://${cleanUrl}:9001`;

    console.log(`🔄 MQTT connecting to: ${brokerUrl}`);
    console.log(`🔍 Client ID: camera_${cameraId}`);

    client = mqtt.connect(brokerUrl, {
      clientId: `camera_${cameraId}`,
      clean: true,
      reconnectPeriod: 5000, // Riconnetti ogni 5 sec se cade
      connectTimeout: 30000,
      keepalive: 60,
    });

    // EVENTO: Connessione riuscita
    client.on('connect', () => {
      console.log('✅ MQTT connected');
      isConnected = true;

      // SUBSCRIBE ai comandi del backend
      const cmdTopic = `cameras/${cameraId}/cmd`;
      client?.subscribe(cmdTopic, (err) => {
        if (err) {
          console.error(`❌ Failed to subscribe to ${cmdTopic}:`, err);
        } else {
          console.log(`📥 Subscribed to ${cmdTopic}`);
        }
      });
    });

    // EVENTO: Disconnesso
    client.on('disconnect', () => {
      console.log('⚠️ MQTT disconnected');
      isConnected = false;
    });

    // EVENTO: Errore
    client.on('error', (error) => {
      console.error('❌ MQTT error:', error);
      isConnected = false;
    });

    // EVENTO: Messaggio in arrivo (comandi dal backend)
    client.on('message', (topic, message) => {
      console.log(`📥 Message received on ${topic}`);
      handleCommand(topic, message);
    });

    // EVENTO: Riconnessione
    client.on('reconnect', () => {
      console.log('🔄 MQTT reconnecting...');
    });

  } catch (error) {
    console.error('❌ Failed to connect to MQTT:', error);
    throw error;
  }
}

/**
 * DISCONNETTI dal broker
 */
export async function disconnectMQTT(): Promise<void> {
  if (client) {
    await client.endAsync();
    client = null;
    isConnected = false;
    console.log('✅ MQTT disconnected');
  }
}

/**
 * PUBBLICA messaggio su un topic
 *
 * @param topic - Topic MQTT (es. cameras/<uuid>/events)
 * @param message - Payload JSON stringificato
 */
export async function publishMessage(
  topic: string,
  message: string
): Promise<void> {
  if (!client || !isConnected) {
    console.warn('⚠️ MQTT not connected, message queued');
    // TODO: Implementa coda locale per messaggi offline
    return;
  }

  try {
    await client.publishAsync(topic, message, { qos: 1 });
    console.log(`📤 Published to ${topic}`);
  } catch (error) {
    console.error(`❌ Failed to publish to ${topic}:`, error);
    throw error;
  }
}

/**
 * GETTER: Stato connessione
 */
export function isConnectedToMQTT(): boolean {
  return isConnected;
}

/**
 * HELPER: Pubblica evento AI
 * (wrapper per publishMessage con topic automatico)
 */
export async function publishAIEventMQTT(event: {
  type: string;
  confidence: number;
  media: { photo_url: string };
  timestamp: string;
}): Promise<void> {
  const cameraId = await getItem('camera_id');
  const topic = `cameras/${cameraId}/events`;
  await publishMessage(topic, JSON.stringify(event));
}

/**
 * HELPER: Pubblica stato camera
 */
export async function publishCameraStatusMQTT(
  status: 'online' | 'offline' | 'alert'
): Promise<void> {
  const cameraId = await getItem('camera_id');
  const topic = `cameras/${cameraId}/status`;

  const statusMsg = {
    status,
    last_seen: new Date().toISOString(),
  };

  await publishMessage(topic, JSON.stringify(statusMsg));
}
