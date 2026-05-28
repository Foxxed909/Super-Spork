import { getToken, setToken, isAuthenticated } from '../lib/auth';

async function init() {
  const authed = await isAuthenticated();
  const dot = document.getElementById('dot')!;
  const statusText = document.getElementById('status-text')!;
  if (authed) { dot.classList.add('on'); statusText.textContent = 'Connected to Spork'; }
  else statusText.textContent = 'No token — paste yours below';

  const token = await getToken();
  const inp = document.getElementById('token-input') as HTMLInputElement;
  if (token) inp.placeholder = '••••' + token.slice(-4);

  document.getElementById('open-panel')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  });

  document.getElementById('summarize')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.storage.session.set({ pendingAction: { type: 'summarize', text: tab.title ?? '' } });
    chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  });

  document.getElementById('screenshot')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.storage.session.set({ pendingAction: { type: 'screenshot', text: '' } });
    chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  });

  document.getElementById('clip')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'CLIP_PAGE' });
    window.close();
  });

  document.getElementById('save-token')?.addEventListener('click', async () => {
    const val = inp.value.trim();
    if (!val) return;
    await setToken(val);
    dot.classList.add('on');
    statusText.textContent = 'Connected to Spork';
    inp.value = '';
    inp.placeholder = '••••' + val.slice(-4);
  });
}

init();
