/**
 * Storage Service - AsyncStorage wrapper
 *
 * Gestisce lo storage locale dell'app per salvare:
 * - server_url: URL del backend (es. http://192.168.1.10:8080)
 * - token: JWT token dell'utente
 * - camera_id: UUID della camera registrata
 * - module_type: Modulo AI configurato (fall, intrusion, crowd, vehicle, fire)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Chiavi storage
export const STORAGE_KEYS = {
  SERVER_URL: 'server_url',
  TOKEN: 'token',
  CAMERA_ID: 'camera_id',
  MODULE_TYPE: 'module_type',
  USER_EMAIL: 'user_email',
  CAMERA_NAME: 'camera_name',
};

/**
 * SALVA valore
 */
export async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error(`❌ Failed to save ${key}:`, error);
    throw error;
  }
}

/**
 * LEGGI valore
 */
export async function getItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`❌ Failed to read ${key}:`, error);
    return null;
  }
}

/**
 * ELIMINA valore
 */
export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`❌ Failed to remove ${key}:`, error);
    throw error;
  }
}

/**
 * PULISCI tutto (logout)
 */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.clear();
    console.log('✅ Storage cleared');
  } catch (error) {
    console.error('❌ Failed to clear storage:', error);
    throw error;
  }
}

/**
 * HELPER: Salva configurazione camera
 */
export async function saveCameraConfig(config: {
  cameraId: string;
  cameraName: string;
  moduleType: 'fall' | 'intrusion' | 'crowd' | 'vehicle' | 'fire';
}): Promise<void> {
  await setItem(STORAGE_KEYS.CAMERA_ID, config.cameraId);
  await setItem(STORAGE_KEYS.CAMERA_NAME, config.cameraName);
  await setItem(STORAGE_KEYS.MODULE_TYPE, config.moduleType);
}

/**
 * HELPER: Leggi configurazione camera
 */
export async function getCameraConfig(): Promise<{
  cameraId: string | null;
  cameraName: string | null;
  moduleType: string | null;
}> {
  const cameraId = await getItem(STORAGE_KEYS.CAMERA_ID);
  const cameraName = await getItem(STORAGE_KEYS.CAMERA_NAME);
  const moduleType = await getItem(STORAGE_KEYS.MODULE_TYPE);

  return { cameraId, cameraName, moduleType };
}

/**
 * HELPER: Salva auth
 */
export async function saveAuth(token: string, email: string): Promise<void> {
  await setItem(STORAGE_KEYS.TOKEN, token);
  await setItem(STORAGE_KEYS.USER_EMAIL, email);
}

/**
 * HELPER: Leggi token
 */
export async function getToken(): Promise<string | null> {
  return await getItem(STORAGE_KEYS.TOKEN);
}

/**
 * HELPER: Controlla se l'utente è loggato
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}
