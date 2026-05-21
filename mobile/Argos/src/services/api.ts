/**
 * API Service - Client REST per comunicare con il backend FastAPI
 *
 * Endpoint disponibili:
 * - POST /api/v1/auth/register - registra utente
 * - POST /api/v1/auth/login - login utente
 * - GET /api/v1/me - utente corrente
 * - POST /api/v1/cameras - registra camera
 * - GET /api/v1/cameras - lista camere
 */

import { getItem, getToken } from './storage';

/**
 * BASE URL - Viene letto da AsyncStorage (configurato dall'utente)
 */
async function getBaseUrl(): Promise<string> {
  const serverUrl = await getItem('server_url');
  if (!serverUrl) {
    throw new Error('Server URL not configured. Please go to Settings.');
  }
  return serverUrl;
}

/**
 * HELPER: Fetch con auth automatico
 */
async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = await getBaseUrl();
  const token = await getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Aggiungi Bearer token se disponibile (tranne per login/register)
  if (token && !endpoint.includes('/auth/')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  return response;
}

/**
 * AUTH - Registra utente
 */
export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ id: string; name: string; email: string }> {
  const response = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return await response.json();
}

/**
 * AUTH - Login utente
 */
export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<{ access_token: string; token_type: string }> {
  const response = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return await response.json();
}

/**
 * AUTH - Utente corrente
 */
export async function getCurrentUser(): Promise<{
  id: string;
  name: string;
  email: string;
}> {
  const response = await apiFetch('/api/v1/me');
  return await response.json();
}

/**
 * CAMERAS - Registra camera
 */
export async function registerCamera(data: {
  name: string;
  lat: number;
  lng: number;
  module_type: 'fall' | 'intrusion' | 'crowd' | 'vehicle' | 'fire';
  default_quality?: '360p' | '720p' | '1080p';
}): Promise<{
  id: string;
  name: string;
  lat: number;
  lng: number;
  module_type: string;
  status: string;
}> {
  const response = await apiFetch('/api/v1/cameras', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      default_quality: data.default_quality || '720p',
    }),
  });

  return await response.json();
}

/**
 * CAMERAS - Lista camere
 */
export async function getCameras(): Promise<Array<{
  id: string;
  name: string;
  lat: number;
  lng: number;
  module_type: string;
  status: string;
  last_seen: string;
}>> {
  const response = await apiFetch('/api/v1/cameras');
  return await response.json();
}

/**
 * UPLOAD - Foto evento
 *
 * Upload di una foto al backend (gestito come form-data multipart)
 * Ritorna l'URL pubblico della foto
 */
export async function uploadPhoto(photoUri: string): Promise<string> {
  const baseUrl = await getBaseUrl();
  const token = await getToken();

  // Prepara FormData
  const formData = new FormData();
  formData.append('file', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'event_photo.jpg',
  } as any);

  const response = await fetch(`${baseUrl}/api/v1/upload/photo`, {
    method: 'POST',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  const result = await response.json();
  return result.url; // Ritorna URL pubblico della foto
}

/**
 * STREAM - Avvia stream
 */
export async function startStream(
  cameraId: string,
  quality: '360p' | '720p' | '1080p' = '720p'
): Promise<void> {
  await apiFetch(`/api/v1/stream/${cameraId}/start?quality=${quality}`, {
    method: 'POST',
  });
}

/**
 * STREAM - Ferma stream
 */
export async function stopStream(cameraId: string): Promise<void> {
  await apiFetch(`/api/v1/stream/${cameraId}/stop`, {
    method: 'POST',
  });
}

/**
 * EVENTS - Lista eventi
 */
export async function getEvents(params?: {
  camera_id?: string;
  event_type?: string;
  limit?: number;
  offset?: number;
}): Promise<Array<{
  id: string;
  camera_id: string;
  event_type: string;
  confidence_score: number;
  timestamp: string;
}>> {
  const queryParams = new URLSearchParams(params as any).toString();
  const endpoint = `/api/v1/events${queryParams ? '?' + queryParams : ''}`;

  const response = await apiFetch(endpoint);
  return await response.json();
}
