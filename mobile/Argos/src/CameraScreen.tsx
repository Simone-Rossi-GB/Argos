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
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';

// Services
import { connectMQTT, disconnectMQTT, isConnectedToMQTT } from './services/mqtt';
import { publishCameraStatus } from './services/eventPublisher';
import { getCameraConfig } from './services/storage';

// AI
import { createFrameProcessor } from './ai/frameProcessor';
import { initFallDetector, cleanupFallDetector } from './ai/fallDetector';
import { initObjectDetector, cleanupObjectDetector } from './ai/objectDetector';
import { initFireDetector, cleanupFireDetector } from './ai/fireDetector';

export default function CameraScreen() {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();

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
        await initAIModels(config.moduleType);

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
        isActive={isFocused && isReady}
        frameProcessor={frameProcessor}
      />

      {/* Status Overlay */}
      <View style={styles.statusBar}>
        <View style={[styles.indicator, mqttConnected ? styles.online : styles.offline]} />
        <Text style={styles.statusText}>
          {mqttConnected ? 'Connected' : 'Disconnected'}
        </Text>
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
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  moduleText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
  },
});
