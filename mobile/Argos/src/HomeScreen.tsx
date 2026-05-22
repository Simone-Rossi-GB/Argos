/**
 * HomeScreen - Modalità "Screen Sleep"
 *
 * Schermata principale senza preview camera.
 * Mostra solo:
 * - Stato MQTT
 * - Ultimi alert
 * - Pulsanti: Impostazioni, Apri Camera
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from './types/navigation';
import { connectMQTT, disconnectMQTT, isConnectedToMQTT } from './services/mqtt';
import { getCameraConfig } from './services/storage';

interface AlertItem {
  id: string;
  type: string;
  confidence: number;
  timestamp: Date;
}

export default function HomeScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();

  const [mqttConnected, setMqttConnected] = useState(false);
  const [cameraName, setCameraName] = useState<string>('');
  const [moduleType, setModuleType] = useState<string>('');
  const [_alerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    loadConfig();
    initMQTT();

    return () => {
      disconnectMQTT().catch(console.error);
    };
  }, []);

  async function loadConfig() {
    try {
      const config = await getCameraConfig();
      setCameraName(config.cameraName || 'Camera Non Configurata');
      setModuleType(config.moduleType || 'N/A');
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  async function initMQTT() {
    try {
      await connectMQTT();
      setMqttConnected(isConnectedToMQTT());
    } catch (error) {
      console.error('MQTT connection failed:', error);
      setMqttConnected(false);
    }
  }

  function handleOpenCamera() {
    if (!moduleType || moduleType === 'N/A') {
      Alert.alert('Configurazione Richiesta', 'Configura la camera nelle Impostazioni prima di aprirla.');
      return;
    }
    navigation.navigate('Camera');
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Argos Camera</Text>
        <View style={[styles.statusDot, mqttConnected ? styles.online : styles.offline]} />
      </View>

      {/* Camera Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Camera:</Text>
        <Text style={styles.infoValue}>{cameraName}</Text>
        <Text style={styles.infoLabel}>Modulo:</Text>
        <Text style={styles.infoValue}>{moduleType}</Text>
        <Text style={styles.infoLabel}>Stato:</Text>
        <Text style={[styles.infoValue, mqttConnected ? styles.onlineText : styles.offlineText]}>
          {mqttConnected ? 'Connesso' : 'Disconnesso'}
        </Text>
      </View>

      {/* Alerts List */}
      <View style={styles.alertsSection}>
        <Text style={styles.sectionTitle}>Ultimi Alert</Text>
        {_alerts.length === 0 ? (
          <Text style={styles.noAlerts}>Nessun alert recente</Text>
        ) : (
          <FlatList
            data={_alerts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.alertItem}>
                <Text style={styles.alertType}>{item.type}</Text>
                <Text style={styles.alertConfidence}>{(item.confidence * 100).toFixed(0)}%</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.btnSecondaryText}>⚙️ Impostazioni</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnPrimary} onPress={handleOpenCamera}>
          <Text style={styles.btnPrimaryText}>📷 Apri Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#F44336',
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  infoValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
  },
  onlineText: {
    color: '#4CAF50',
  },
  offlineText: {
    color: '#F44336',
  },
  alertsSection: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  noAlerts: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertType: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  alertConfidence: {
    fontSize: 14,
    color: '#4CAF50',
  },
  actions: {
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
