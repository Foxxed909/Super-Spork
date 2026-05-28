import { sendMessage, getAgents, uploadScreenshot, SporkMessage } from '../lib/api';

const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
let isStreaming = false;
let pageUrl = '';
let pageTitle = '';

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    pageUrl = tab.url;
    pageTitle = tab.title ?? '';
    const ctx = document.getElementById('page-ctx')!;
    const link = document.getElementById('page-link') as HTMLAnchorElement;
    ctx.style.display = 'flex';
    link.textContent = pageTitle || pageUrl;
    link.href = pageUrl;
  }

  const agents = await getAgents();
  const sel = document.getElementById('agent-sel') as HTMLSelectElement;
  agents.forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.emoji} ${a.name}`;
    sel.appendChild(opt);
  });

  const result = await chrome.storage.session.get('pendingAction');
  if (result.pendingAction) {
    const action = result.pendingAction as { type: string; text: string };
    await chrome.storage.session.remove('pendingAction');
    if (action.type === 'summarize') {
      await send(`Summarize this page: "${pageTitle}" (${pageUrl})`);
    } else if (action.type === 'screenshot') {
      addNotice('Taking screenshot…');
      const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'jpeg', quality: 80 });
      if (dataUrl) {
        await uploadScreenshot(dataUrl);
        addNotice('Screenshot captured. What would you like to know?');
      }
    } else if (action.text) {
      (document.getElementById('input') as HTMLTextAreaElement).value = action.text;
    }
  }

  document.getElementById('send')?.addEventListener('click', handleSend);
  document.getElementById('input')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
}

function addNotice(text: string) {
  const d = document.createElement('div');
  d.className = 'msg notice';
  d.textContent = text;
  document.getElementById('messages')?.appendChild(d);
  scrollDown();
}

function addMsg(role: 'user' | 'assistant', text: string): HTMLElement {
  history.push({ role, content: text });
  const d = document.createElement('div');
  d.className = `msg ${role}`;
  d.textContent = text;
  document.getElementById('messages')?.appendChild(d);
  scrollDown();
  return d;
}

function scrollDown() {
  const m = document.getElementById('messages')!;
  m.scrollTop = m.scrollHeight;
}

async function handleSend() {
  const input = document.getElementById('input') as HTMLTextAreaElement;
  const text = input.value.trim();
  if (!text || isStreaming) return;
  input.value = '';
  await send(text);
}

async function send(text: string) {
  if (isStreaming) return;
  isStreaming = true;
  const btn = document.getElementById('send') as HTMLButtonElement;
  btn.disabled = true;

  addMsg('user', text);

  const ctxMessages: SporkMessage[] = pageUrl
    ? [{ role: 'system', content: `User is browsing: "${pageTitle}" at ${pageUrl}` }]
    : [];

  const agentId = (document.getElementById('agent-sel') as HTMLSelectElement)?.value || undefined;
  const model = (document.getElementById('model-sel') as HTMLSelectElement)?.value;

  const replyDiv = addMsg('assistant', '…');

  const stream = await sendMessage({
    messages: [...ctxMessages, ...history.slice(-12).map(m => ({ role: m.role, content: m.content }))],
    model,
    agentId: agentId || undefined,
  });

  if (!stream) {
    replyDiv.textContent = '⚠️ Could not connect. Check your token in the popup.';
    isStreaming = false;
    btn.disabled = false;
    return;
  }

  const reader = stream.getReader();
  const dec = new TextDecoder();
  let full = '';
  replyDiv.textContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value, { stream: true }).split('\n')) {
        if (line.startsWith('0:')) {
          try {
            const t = JSON.parse(line.slice(2));
            if (typeof t === 'string') { full += t; replyDiv.textContent = full; scrollDown(); }
          } catch {}
        }
      }
    }
  } catch {}

  history[history.length - 1].content = full;
  isStreaming = false;
  btn.disabled = false;
}

init();
