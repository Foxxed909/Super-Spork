// MV3 Service Worker — handles context menus, commands, and message routing

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'spork-ask', title: 'Ask Spork AI', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'spork-review-code', title: 'Review with Spork', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'spork-save-memory', title: 'Save to Spork Memory', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'spork-clip-page', title: 'Clip page to Spork', contexts: ['page'] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'spork-ask':
    case 'spork-review-code': {
      const text = info.menuItemId === 'spork-review-code'
        ? `Review this code:\n\`\`\`\n${info.selectionText ?? ''}\n\`\`\``
        : info.selectionText ?? '';
      chrome.sidePanel.open({ tabId: tab.id });
      chrome.storage.session.set({ pendingAction: { type: 'ask', text } });
      break;
    }
    case 'spork-save-memory':
      chrome.tabs.sendMessage(tab.id, { type: 'SAVE_MEMORY', text: info.selectionText ?? '' });
      break;
    case 'spork-clip-page':
      chrome.tabs.sendMessage(tab.id, { type: 'CLIP_PAGE' });
      break;
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab?.id) return;
  if (command === 'open-sidepanel') chrome.sidePanel.open({ tabId: tab.id });
  if (command === 'quote-selection') {
    chrome.tabs.sendMessage(tab.id, { type: 'QUOTE_SELECTION' });
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_SIDEPANEL' && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    if (message.pendingText) {
      chrome.storage.session.set({ pendingAction: { type: 'ask', text: message.pendingText } });
    }
    sendResponse({ ok: true });
  }
  return true;
});
