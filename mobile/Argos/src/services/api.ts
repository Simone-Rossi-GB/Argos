export type ModuleType = 'fall' | 'intrusion' | 'crowd' | 'vehicle' | 'fire';
export type VideoQuality = '360p' | '720p' | '1080p';

export type CameraRegistration = {
  name: string;
  lat: number;
  lng: number;
  module_type: ModuleType;
  default_quality: VideoQuality;
};

const post = async (url: string, body: object, token?: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
};

export const api = {
  async login(serverUrl: string, email: string, password: string): Promise<string> {
    const data = await post(`${serverUrl}/api/v1/auth/login`, { email, password });
    return data.access_token;
  },

  async registerUser(
    serverUrl: string,
    name: string,
    email: string,
    password: string,
  ): Promise<string> {
    await post(`${serverUrl}/api/v1/auth/register`, { name, email, password });
    return api.login(serverUrl, email, password);
  },

  async registerCamera(
    serverUrl: string,
    token: string,
    data: CameraRegistration,
  ): Promise<string> {
    const camera = await post(`${serverUrl}/api/v1/cameras`, data, token);
    return camera.id;
  },

  async uploadPhoto(
    serverUrl: string,
    token: string,
    photoPath: string,
  ): Promise<string | undefined> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: `file://${photoPath}`,
        type: 'image/jpeg',
        name: 'event.jpg',
      } as any);
      const res = await fetch(`${serverUrl}/uploads/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.url as string;
      }
    } catch {}
    return undefined;
  },
};
