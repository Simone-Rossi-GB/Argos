/**
 * SettingScreen - Configurazione Camera
 *
 * Permette di:
 * - Registrare utente
 * - Registrare camera
 * - Configurare modulo AI
 * - Impostare server URL
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { loginUser, registerUser, registerCamera } from './services/api';
import {
  getItem,
  setItem,
  getToken,
  saveAuth,
  getCameraConfig,
  saveCameraConfig,
  STORAGE_KEYS,
} from './services/storage';

export default function SettingScreen() {
  // Server config
  const [serverUrl, setServerUrlState] = useState('http://localhost:8080');

  // User auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Camera config
  const [cameraName, setCameraName] = useState('');
  const [cameraLat, setCameraLat] = useState('45.4642');
  const [cameraLng, setCameraLng] = useState('9.1900');
  const [moduleType, setModuleType] = useState<string>('fall');
  const [cameraRegistered, setCameraRegistered] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const url = await getItem(STORAGE_KEYS.SERVER_URL);
      if (url) setServerUrlState(url);

      const token = await getToken();
      setIsLoggedIn(!!token);

      const config = await getCameraConfig();
      if (config.cameraId) {
        setCameraRegistered(true);
        setCameraName(config.cameraName || '');
        setModuleType(config.moduleType || 'fall');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function handleSaveServerUrl() {
    try {
      await setItem(STORAGE_KEYS.SERVER_URL, serverUrl);
      Alert.alert('Successo', 'URL server salvato');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare URL');
    }
  }

  async function handleRegisterUser() {
    if (!userName || !email || !password) {
      Alert.alert('Errore', 'Compila tutti i campi');
      return;
    }

    setLoading(true);
    try {
      await registerUser({ name: userName, email, password });
      Alert.alert('Successo', 'Utente registrato, ora effettua il login');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Registrazione fallita');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password');
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser({ email, password });
      await saveAuth(response.access_token, email);
      setIsLoggedIn(true);
      Alert.alert('Successo', 'Login effettuato');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Login fallito');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterCamera() {
    if (!cameraName) {
      Alert.alert('Errore', 'Inserisci il nome della camera');
      return;
    }

    if (!isLoggedIn) {
      Alert.alert('Errore', 'Devi prima effettuare il login');
      return;
    }

    setLoading(true);
    try {
      const lat = parseFloat(cameraLat);
      const lng = parseFloat(cameraLng);

      const camera = await registerCamera({
        name: cameraName,
        lat,
        lng,
        module_type: moduleType as 'fall' | 'intrusion' | 'crowd' | 'vehicle' | 'fire',
      });

      await saveCameraConfig({
        cameraId: camera.id,
        cameraName: camera.name,
        moduleType: camera.module_type as 'fall' | 'intrusion' | 'crowd' | 'vehicle' | 'fire',
      });

      setCameraRegistered(true);
      Alert.alert('Successo', `Camera "${camera.name}" registrata`);
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Registrazione camera fallita');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Impostazioni</Text>

      {/* Server URL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Backend</Text>
        <TextInput
          style={styles.input}
          placeholder="http://localhost:8080"
          placeholderTextColor="#666"
          value={serverUrl}
          onChangeText={setServerUrlState}
          autoCapitalize="none"
          keyboardType="url"
        />
        <TouchableOpacity style={styles.btnSecondary} onPress={handleSaveServerUrl}>
          <Text style={styles.btnText}>Salva URL</Text>
        </TouchableOpacity>
      </View>

      {/* User Registration */}
      {!isLoggedIn && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Registrazione Utente</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor="#666"
              value={userName}
              onChangeText={setUserName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={handleRegisterUser}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Registra Utente</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Login</Text>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Camera Registration */}
      {isLoggedIn && !cameraRegistered && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registrazione Camera</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome Camera"
            placeholderTextColor="#666"
            value={cameraName}
            onChangeText={setCameraName}
          />
          <TextInput
            style={styles.input}
            placeholder="Latitudine"
            placeholderTextColor="#666"
            value={cameraLat}
            onChangeText={setCameraLat}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Longitudine"
            placeholderTextColor="#666"
            value={cameraLng}
            onChangeText={setCameraLng}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Modulo AI:</Text>
          <View style={styles.modulePicker}>
            {['fall', 'intrusion', 'crowd', 'vehicle', 'fire'].map((mod) => (
              <TouchableOpacity
                key={mod}
                style={[styles.moduleBtn, moduleType === mod && styles.moduleBtnActive]}
                onPress={() => setModuleType(mod)}
              >
                <Text style={[styles.moduleText, moduleType === mod && styles.moduleTextActive]}>
                  {mod}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleRegisterCamera}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Registra Camera</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Status */}
      {isLoggedIn && cameraRegistered && (
        <View style={styles.section}>
          <Text style={styles.successText}>✅ Camera configurata correttamente</Text>
          <Text style={styles.infoText}>Nome: {cameraName}</Text>
          <Text style={styles.infoText}>Modulo: {moduleType}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 40,
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  modulePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  moduleBtn: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moduleBtnActive: {
    backgroundColor: '#2196F3',
  },
  moduleText: {
    color: '#888',
    fontSize: 14,
  },
  moduleTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
});
