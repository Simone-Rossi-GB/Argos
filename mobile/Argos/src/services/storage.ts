import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SERVER_URL: 'server_url',
  TOKEN: 'token',
  CAMERA_ID: 'camera_id',
  CAMERA_NAME: 'camera_name',
  MODULE_TYPE: 'module_type',
};

export const storage = {
  async getServerUrl(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.SERVER_URL);
  },
  async setServerUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.SERVER_URL, url);
  },
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.TOKEN);
  },
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  },
  async getCameraId(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.CAMERA_ID);
  },
  async setCameraId(id: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.CAMERA_ID, id);
  },
  async getCameraName(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.CAMERA_NAME);
  },
  async setCameraName(name: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.CAMERA_NAME, name);
  },
  async getModuleType(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.MODULE_TYPE);
  },
  async setModuleType(type: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.MODULE_TYPE, type);
  },
  async clear(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
