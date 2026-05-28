const TOKEN_KEY = 'spork_api_token';
const API_URL_KEY = 'spork_api_url';
const DEFAULT_API_URL = 'https://your-spork-app.com';

export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.sync.get([TOKEN_KEY]);
  return result[TOKEN_KEY] ?? null;
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.sync.set({ [TOKEN_KEY]: token });
}

export async function clearToken(): Promise<void> {
  await chrome.storage.sync.remove(TOKEN_KEY);
}

export async function getApiUrl(): Promise<string> {
  const result = await chrome.storage.sync.get([API_URL_KEY]);
  return result[API_URL_KEY] ?? DEFAULT_API_URL;
}

export async function setApiUrl(url: string): Promise<void> {
  await chrome.storage.sync.set({ [API_URL_KEY]: url.replace(/\/$/, '') });
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null && token.length > 0;
}
