import mqtt, { MqttClient } from 'mqtt';

type CommandHandler = (action: string, quality?: string) => void;

class MQTTService {
  private client: MqttClient | null = null;
  private cameraId: string | null = null;
  private commandHandler: CommandHandler | null = null;

  connect(serverUrl: string, cameraId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ricava host dal server URL e usa la porta WebSocket di Mosquitto (9001)
      const host = new URL(serverUrl).hostname;
      const brokerUrl = `ws://${host}:9001`;

      this.cameraId = cameraId;
      this.client = mqtt.connect(brokerUrl, {
        clientId: `camera-${cameraId.slice(0, 8)}-${Date.now()}`,
        keepalive: 30,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
      });

      this.client.once('connect', () => {
        this.client!.subscribe(`cameras/${cameraId}/cmd`, { qos: 1 });
        this.publishStatus('online');
        resolve();
      });

      this.client.on('message', (topic, message) => {
        if (topic !== `cameras/${cameraId}/cmd`) return;
        try {
          const cmd = JSON.parse(message.toString());
          this.commandHandler?.(cmd.action, cmd.quality);
        } catch {}
      });

      this.client.once('error', reject);
    });
  }

  publishStatus(status: 'online' | 'offline' | 'alert'): void {
    if (!this.client?.connected || !this.cameraId) return;
    this.client.publish(
      `cameras/${this.cameraId}/status`,
      JSON.stringify({ status, last_seen: new Date().toISOString() }),
      { qos: 1 },
    );
  }

  publishEvent(type: string, confidence: number, photoUrl?: string): void {
    if (!this.client?.connected || !this.cameraId) return;
    const payload: Record<string, unknown> = { type, confidence };
    if (photoUrl) payload.media = { photo_url: photoUrl };
    this.client.publish(
      `cameras/${this.cameraId}/events`,
      JSON.stringify(payload),
      { qos: 2 },
    );
  }

  onCommand(handler: CommandHandler): void {
    this.commandHandler = handler;
  }

  disconnect(): void {
    if (!this.client) return;
    this.publishStatus('offline');
    this.client.end();
    this.client = null;
    this.cameraId = null;
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

export const mqttService = new MQTTService();
