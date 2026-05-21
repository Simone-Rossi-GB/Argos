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

/**
 * CONNETTI al broker MQTT
 *
 * Chiamalo all'avvio della CameraScreen
 */
export async function connectMQTT(): Promise<void> {
  try {
    const serverUrl = await getItem('server_url');
    const cameraId = await getItem('camera_id');

    if (!serverUrl || !cameraId) {
      throw new Error('Missing server_url or camera_id');
    }

    // Rimuovi http:// o https:// se presente
    const cleanUrl = serverUrl.replace(/^https?:\/\//, '');

    // WebSocket MQTT su porta 9001
    const brokerUrl = `ws://${cleanUrl}:9001`;

    console.log(`🔄 Connecting to MQTT broker: ${brokerUrl}`);

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
