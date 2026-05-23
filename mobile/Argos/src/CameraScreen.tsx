/**
 * CameraScreen - Schermata principale con camera + AI detection
 *
 * Integra:
 * - Vision Camera
 * - AI Detection (MediaPipe)
 * - MQTT Events
 * - Status Publishing
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

// Services
import { connectMQTT, disconnectMQTT, isConnectedToMQTT } from './services/mqtt';
import { publishCameraStatus } from './services/eventPublisher';
import { getCameraConfig } from './services/storage';

// AI
import { createFrameProcessor } from './ai/frameProcessor';
import { initFallDetector, cleanupFallDetector } from './ai/fallDetector';
import { initObjectDetector, cleanupObjectDetector } from './ai/objectDetector';
import { initFireDetector, cleanupFireDetector } from './ai/fireDetector';

interface Props {
  navigation: { navigate: (screen: string) => void };
}

export default function CameraScreen({ navigation }: Props) {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [isReady, setIsReady] = useState(false);
  const [moduleType, setModuleType] = useState<string | null>(null);
  const [mqttConnected, setMqttConnected] = useState(false);

  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 1. INIT - Carica tutto all'avvio
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log('🚀 Initializing CameraScreen...');

        // 1. Verifica permessi camera
        if (!hasPermission) {
          const granted = await requestPermission();
          if (!granted) {
            Alert.alert('Permission Denied', 'Camera permission is required');
            return;
          }
        }

        // 2. Leggi configurazione camera
        const config = await getCameraConfig();
        if (!config.moduleType || !config.cameraId) {
          Alert.alert('Setup Required', 'Please configure camera in Settings first');
          return;
        }

        console.log(`📸 Module type: ${config.moduleType}`);
        setModuleType(config.moduleType);

        // 3. Inizializza modelli AI in base al modulo
        try {
          await initAIModels(config.moduleType);
        } catch (aiError) {
          console.warn('⚠️ AI initialization failed, continuing without AI:', aiError);
          // Continua comunque - MQTT e camera funzioneranno
        }

        // 4. Connetti MQTT
        await connectMQTT();
        if (mounted) setMqttConnected(isConnectedToMQTT());

        // 5. Pubblica status ogni 30 secondi
        startStatusPublishing();

        if (mounted) setIsReady(true);
        console.log('✅ CameraScreen initialized');

      } catch (error) {
        console.error('❌ Initialization failed:', error);
        Alert.alert('Error', 'Failed to initialize camera: ' + error);
      }
    };

    initialize();

    // CLEANUP
    return () => {
      mounted = false;
      cleanup();
    };
  }, [hasPermission, requestPermission]);

  /**
   * 2. INIT AI MODELS - Carica solo il modello necessario
   */
  async function initAIModels(module: string) {
    console.log(`🤖 Loading AI model for: ${module}`);

    switch (module) {
      case 'fall':
        await initFallDetector();
        break;

      case 'intrusion':
      case 'crowd':
      case 'vehicle':
        await initObjectDetector();
        break;

      case 'fire':
        await initFireDetector();
        break;

      default:
        console.warn(`⚠️ Unknown module type: ${module}`);
    }
  }

  /**
   * 3. STATUS PUBLISHING - Pubblica status ogni 30 sec
   */
  function startStatusPublishing() {
    // Pubblica subito
    publishCameraStatus('online').catch(console.error);

    // Poi ogni 30 sec
    statusIntervalRef.current = setInterval(() => {
      publishCameraStatus('online').catch(console.error);
    }, 30000);
  }

  /**
   * 4. CLEANUP - Libera risorse
   */
  function cleanup() {
    console.log('🧹 Cleaning up...');

    // Stop status publishing
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }

    // Pubblica offline
    publishCameraStatus('offline').catch(console.error);

    // Disconnetti MQTT
    disconnectMQTT().catch(console.error);

    // Cleanup AI models
    cleanupFallDetector();
    cleanupObjectDetector();
    cleanupFireDetector();
  }

  /**
   * 5. FRAME PROCESSOR - Crea processor in base al modulo
   */
  const frameProcessor = React.useMemo(
    () => (moduleType ? createFrameProcessor(moduleType) : undefined),
    [moduleType]
  );

  /**
   * RENDER
   */

  // Loading
  if (!isReady || !device) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.text}>Initializing camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isReady}
        frameProcessor={frameProcessor}
      />

      {/* Status Overlay - Header in alto */}
      <View style={styles.statusBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}>
          <Text style={styles.backText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Camera Feed</Text>
      </View>

      {/* Status Info - Sotto header */}
      <View style={styles.statusInfo}>
        <View style={styles.statusRow}>
          <View style={[styles.indicator, mqttConnected ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>
            {mqttConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        <Text style={styles.moduleText}>Module: {moduleType}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingRight: 12,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  statusInfo: {
    position: 'absolute',
    top: 90, // Sotto l'header
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  moduleText: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.8,
  },
});
