chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'open-manager') {
    chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
  }
});
