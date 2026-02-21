// Background service worker for the accessibility extension

// Extension state
let extensionEnabled = true;

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Accessibility Extension installed');

  // Initialize default settings
  chrome.storage.sync.set({
    enabled: true,
    userId: generateUserId(),
    backendUrl: 'http://localhost:3000'
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ enabled: extensionEnabled });
  } else if (request.action === 'toggleExtension') {
    extensionEnabled = request.enabled;
    chrome.storage.sync.set({ enabled: extensionEnabled });
    sendResponse({ success: true, enabled: extensionEnabled });
  } else if (request.action === 'speak') {
    const preferred = ['Samantha', 'Google US English', 'Karen', 'Daniel'];
    chrome.tts.getVoices((voices) => {
      const options = {
        rate: request.rate || 1.0,
        pitch: request.pitch || 1.0,
        volume: request.volume || 1.0,
        lang: 'en-US'
      };
      for (const name of preferred) {
        if (voices.find(v => v.voiceName === name)) {
          options.voiceName = name;
          break;
        }
      }
      chrome.tts.speak(request.text, options);
    });
    sendResponse({ success: true });
  } else if (request.action === 'stopSpeaking') {
    chrome.tts.stop();
    sendResponse({ success: true });
  } else if (request.action === 'getSettings') {
    chrome.storage.sync.get([
      'enabled',
      'userId',
      'backendUrl',
      'speechRate',
      'language',
      'highlightColor',
      'autoSummary'
    ], (settings) => {
      sendResponse(settings);
    });
    return true; // Keep channel open for async response
  }
});

// Listen for tab updates to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && extensionEnabled) {
    // Tab loaded, content script will auto-inject via manifest
    console.log('Page loaded:', tab.url);
  }
});

// Generate a unique user ID
function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension service worker started');
  chrome.storage.sync.get(['enabled'], (result) => {
    extensionEnabled = result.enabled !== false;
  });
});
