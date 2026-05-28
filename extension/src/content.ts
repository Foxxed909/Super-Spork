// Content script: injected into every page

// --- Selection bubble ---
let selectionBubble: HTMLElement | null = null;

function removeSelectionBubble() {
  selectionBubble?.remove();
  selectionBubble = null;
}

function showSelectionBubble(x: number, y: number, text: string) {
  removeSelectionBubble();
  const bubble = document.createElement('div');
  bubble.id = 'spork-bubble';
  bubble.innerHTML = `<button style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:20px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 12px rgba(124,58,237,.4);font-family:-apple-system,sans-serif">✦ Ask Spork</button>`;
  Object.assign(bubble.style, {
    position: 'fixed', zIndex: '2147483647',
    left: `${Math.min(x, window.innerWidth - 160)}px`,
    top: `${Math.max(y - 50, 10)}px`,
  });
  bubble.querySelector('button')?.addEventListener('click', (e) => {
    e.stopPropagation();
    removeSelectionBubble();
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL', pendingText: text });
  });
  document.body.appendChild(bubble);
  selectionBubble = bubble;
}

document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const text = window.getSelection()?.toString().trim() ?? '';
    if (text.length > 10) showSelectionBubble(e.clientX, e.clientY, text);
    else removeSelectionBubble();
  }, 10);
});

document.addEventListener('mousedown', (e) => {
  if (!(e.target as Element)?.closest('#spork-bubble')) removeSelectionBubble();
});

// --- Code block review buttons ---
function injectCodeButtons() {
  const isGitHub = location.hostname === 'github.com';
  const isStackOverflow = location.hostname.includes('stackoverflow.com');
  if (!isGitHub && !isStackOverflow) return;

  const selector = isGitHub ? '.highlight:not([data-spork])' : 'pre:not([data-spork])';
  document.querySelectorAll(selector).forEach((block) => {
    block.setAttribute('data-spork', '1');
    const code = (block.querySelector('code, .blob-code') ?? block).textContent?.trim() ?? '';
    if (code.length < 30) return;

    const btn = document.createElement('button');
    btn.textContent = '✦ Review';
    Object.assign(btn.style, {
      position: 'absolute', top: '8px', right: '8px',
      background: 'rgba(124,58,237,.9)', color: '#fff', border: 'none',
      borderRadius: '6px', padding: '4px 10px', fontSize: '11px',
      fontWeight: '600', cursor: 'pointer', zIndex: '100',
      fontFamily: '-apple-system,sans-serif',
    });
    btn.addEventListener('click', () =>
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL', pendingText: `Review this code:\n\`\`\`\n${code.slice(0, 3000)}\n\`\`\`` })
    );
    const el = block as HTMLElement;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(btn);
  });
}

injectCodeButtons();
new MutationObserver(injectCodeButtons).observe(document.body, { childList: true, subtree: true });

// --- Messages from background ---
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SAVE_MEMORY') {
    chrome.runtime.sendMessage({ type: 'API_SAVE_MEMORY', text: message.text });
    showToast(`✓ Saved to Spork Memory`);
  }
  if (message.type === 'CLIP_PAGE') {
    chrome.runtime.sendMessage({
      type: 'OPEN_SIDEPANEL',
      pendingText: `Summarize and discuss this page:\nTitle: ${document.title}\nURL: ${location.href}\n\n${document.body.innerText?.slice(0, 5000) ?? ''}`,
    });
    showToast('📎 Page clipped to Spork');
  }
  if (message.type === 'QUOTE_SELECTION') {
    const text = window.getSelection()?.toString().trim() ?? '';
    if (text) chrome.storage.session.set({ pendingAction: { type: 'ask', text } });
  }
});

function showToast(msg: string) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    background: '#7c3aed', color: '#fff', padding: '10px 20px', borderRadius: '24px',
    fontSize: '13px', fontWeight: '500', zIndex: '2147483647',
    boxShadow: '0 4px 20px rgba(124,58,237,.5)', fontFamily: '-apple-system,sans-serif',
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
