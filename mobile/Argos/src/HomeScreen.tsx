import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mqttService } from './services/mqtt';
import { storage } from './services/storage';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [mqttConnected, setMqttConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [cameraName, setCameraName] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const [serverUrl, id, name] = await Promise.all([
      storage.getServerUrl(),
      storage.getCameraId(),
      storage.getCameraName(),
    ]);

    setCameraId(id);
    setCameraName(name);

    if (!serverUrl || !id) return;

    setConnecting(true);
    try {
      await mqttService.connect(serverUrl, id);
      setMqttConnected(true);
    } catch {
      Alert.alert('MQTT', 'Connessione al broker fallita.\nVerifica che il server sia raggiungibile.');
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      mqttService.disconnect();
      setMqttConnected(false);
    };
  }, [connect]);

  // Riconnette quando si torna da Settings
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!mqttService.isConnected()) connect();
    });
    return unsubscribe;
  }, [navigation, connect]);

  const configured = !!cameraId;

  return (
    <View style={s.container}>
      <Text style={s.title}>Argos Camera</Text>

      <View style={s.card}>
        <Text style={s.cardLabel}>CAMERA</Text>
        <Text style={s.cardValue}>{cameraName ?? 'Non configurata'}</Text>
        {cameraId && <Text style={s.cardSub}>{cameraId.slice(0, 8)}...</Text>}
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>BROKER MQTT</Text>
        <View style={s.row}>
          <View style={[s.dot, mqttConnected ? s.dotGreen : s.dotRed]} />
          <Text style={s.cardValue}>
            {connecting ? 'Connessione...' : mqttConnected ? 'Connesso' : 'Disconnesso'}
          </Text>
        </View>
      </View>

      {configured ? (
        <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('Camera')}>
          <Text style={s.btnText}>Avvia Camera</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={s.btnSecondary}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={s.btnText}>Configura prima le impostazioni →</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.link} onPress={() => navigation.navigate('Settings')}>
        <Text style={s.linkText}>Impostazioni</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f5f5f5', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLabel: { fontSize: 11, color: '#999', letterSpacing: 0.5, marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: '600', color: '#111' },
  cardSub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotGreen: { backgroundColor: '#28a745' },
  dotRed: { backgroundColor: '#dc3545' },
  btnPrimary: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  btnSecondary: {
    backgroundColor: '#6c757d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { alignItems: 'center', marginTop: 20 },
  linkText: { color: '#007AFF', fontSize: 14 },
});
