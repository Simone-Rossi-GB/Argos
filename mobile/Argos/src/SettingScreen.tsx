import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, ModuleType, VideoQuality } from './services/api';
import { storage } from './services/storage';

const MODULE_TYPES: ModuleType[] = ['fall', 'intrusion', 'crowd', 'vehicle', 'fire'];
const QUALITIES: VideoQuality[] = ['360p', '720p', '1080p'];

export default function SettingScreen() {
  const [serverUrl, setServerUrl] = useState('http://192.168.1.x:8080');
  const [isNewUser, setIsNewUser] = useState(false);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cameraName, setCameraName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [moduleType, setModuleType] = useState<ModuleType>('fall');
  const [quality, setQuality] = useState<VideoQuality>('720p');
  const [loading, setLoading] = useState(false);
  const [savedCameraId, setSavedCameraId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [url, id, name, mod] = await Promise.all([
        storage.getServerUrl(),
        storage.getCameraId(),
        storage.getCameraName(),
        storage.getModuleType(),
      ]);
      if (url) setServerUrl(url);
      if (id) setSavedCameraId(id);
      if (name) setCameraName(name);
      if (mod) setModuleType(mod as ModuleType);
    })();
  }, []);

  const handleSave = async () => {
    if (!serverUrl || !email || !password || !cameraName || !lat || !lng) {
      Alert.alert('Errore', 'Compila tutti i campi');
      return;
    }
    if (isNewUser && !userName) {
      Alert.alert('Errore', 'Inserisci il nome utente');
      return;
    }
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      Alert.alert('Errore', 'Latitudine e longitudine devono essere numeri validi');
      return;
    }

    setLoading(true);
    try {
      const token = isNewUser
        ? await api.registerUser(serverUrl, userName, email, password)
        : await api.login(serverUrl, email, password);

      const cameraId = await api.registerCamera(serverUrl, token, {
        name: cameraName,
        lat: latNum,
        lng: lngNum,
        module_type: moduleType,
        default_quality: quality,
      });

      await Promise.all([
        storage.setServerUrl(serverUrl),
        storage.setToken(token),
        storage.setCameraId(cameraId),
        storage.setCameraName(cameraName),
        storage.setModuleType(moduleType),
      ]);

      setSavedCameraId(cameraId);
      Alert.alert('Successo', `Camera registrata!\nID: ${cameraId}`);
    } catch (e: any) {
      Alert.alert('Errore', e.message ?? 'Qualcosa è andato storto');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset', 'Vuoi rimuovere la configurazione?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await storage.clear();
          setSavedCameraId(null);
        },
      },
    ]);
  };

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Configurazione</Text>

      {savedCameraId && (
        <View style={s.banner}>
          <Text style={s.bannerText}>Camera: {savedCameraId.slice(0, 8)}...</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={s.bannerReset}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={s.label}>Server URL</Text>
      <TextInput
        style={s.input}
        value={serverUrl}
        onChangeText={setServerUrl}
        placeholder="http://192.168.1.x:8080"
        autoCapitalize="none"
        keyboardType="url"
      />

      <View style={s.toggle}>
        <TouchableOpacity
          style={[s.toggleBtn, !isNewUser && s.toggleActive]}
          onPress={() => setIsNewUser(false)}>
          <Text style={[s.toggleText, !isNewUser && s.toggleTextActive]}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, isNewUser && s.toggleActive]}
          onPress={() => setIsNewUser(true)}>
          <Text style={[s.toggleText, isNewUser && s.toggleTextActive]}>Nuovo utente</Text>
        </TouchableOpacity>
      </View>

      {isNewUser && (
        <>
          <Text style={s.label}>Nome</Text>
          <TextInput style={s.input} value={userName} onChangeText={setUserName} />
        </>
      )}

      <Text style={s.label}>Email</Text>
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={s.label}>Password</Text>
      <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />

      <Text style={s.label}>Nome camera</Text>
      <TextInput style={s.input} value={cameraName} onChangeText={setCameraName} />

      <View style={s.row}>
        <View style={s.half}>
          <Text style={s.label}>Latitudine</Text>
          <TextInput
            style={s.input}
            value={lat}
            onChangeText={setLat}
            keyboardType="decimal-pad"
            placeholder="45.4642"
          />
        </View>
        <View style={s.half}>
          <Text style={s.label}>Longitudine</Text>
          <TextInput
            style={s.input}
            value={lng}
            onChangeText={setLng}
            keyboardType="decimal-pad"
            placeholder="9.1900"
          />
        </View>
      </View>

      <Text style={s.label}>Modulo AI</Text>
      <View style={s.chips}>
        {MODULE_TYPES.map(m => (
          <TouchableOpacity
            key={m}
            style={[s.chip, moduleType === m && s.chipActive]}
            onPress={() => setModuleType(m)}>
            <Text style={moduleType === m ? s.chipTextActive : s.chipText}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Qualità default</Text>
      <View style={s.chips}>
        {QUALITIES.map(q => (
          <TouchableOpacity
            key={q}
            style={[s.chip, quality === q && s.chipActive]}
            onPress={() => setQuality(q)}>
            <Text style={quality === q ? s.chipTextActive : s.chipText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.button} onPress={handleSave} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.buttonText}>Salva e registra camera</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginTop: 14, marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 11,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#333', fontSize: 13 },
  chipTextActive: { color: '#fff', fontSize: 13 },
  button: {
    marginTop: 30,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  banner: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerText: { color: '#155724', fontSize: 13 },
  bannerReset: { color: '#721c24', fontWeight: '600', fontSize: 13 },
  toggle: {
    flexDirection: 'row',
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  toggleActive: { backgroundColor: '#007AFF' },
  toggleText: { fontSize: 14, color: '#007AFF' },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
});
