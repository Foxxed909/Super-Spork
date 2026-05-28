import { getToken, getApiUrl } from './auth';

export interface SporkMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: SporkMessage[];
  model?: string;
  agentId?: string;
  conversationId?: string;
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const [token, apiUrl] = await Promise.all([getToken(), getApiUrl()]);
  return fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

export async function sendMessage(request: ChatRequest): Promise<ReadableStream<Uint8Array> | null> {
  const res = await apiFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  if (!res.ok) return null;
  return res.body;
}

export async function getModels(): Promise<Array<{ id: string; name: string; tier: string }>> {
  const res = await apiFetch('/api/models');
  if (!res.ok) return [];
  return res.json();
}

export async function getAgents(): Promise<Array<{ id: string; name: string; emoji: string; tagline: string }>> {
  const res = await apiFetch('/api/agents');
  if (!res.ok) return [];
  return res.json();
}

export async function clipPage(data: { title: string; url: string; text: string }): Promise<{ id: string } | null> {
  const res = await apiFetch('/api/extension/clip', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function saveMemory(content: string): Promise<boolean> {
  const res = await apiFetch('/api/memory', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return res.ok;
}

export async function uploadScreenshot(dataUrl: string): Promise<{ contextId: string; extractedText: string } | null> {
  const res = await apiFetch('/api/extension/screenshot', {
    method: 'POST',
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) return null;
  return res.json();
}
