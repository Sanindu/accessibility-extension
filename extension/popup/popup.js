/**
 * Popup script - Manages extension settings and controls
 */

// DOM elements
const extensionToggle = document.getElementById('extensionToggle');
const statusText = document.getElementById('statusText');
const summarizeBtn = document.getElementById('summarizeBtn');
const voiceCommandBtn = document.getElementById('voiceCommandBtn');
const speechRateSlider = document.getElementById('speechRate');
const speechRateValue = document.getElementById('speechRateValue');
const languageSelect = document.getElementById('language');
const highlightColorInput = document.getElementById('highlightColor');
const autoSummaryCheckbox = document.getElementById('autoSummary');
const backendUrlInput = document.getElementById('backendUrl');
const connectionStatus = document.getElementById('connectionStatus');
const connectionText = document.getElementById('connectionText');

// Load settings on popup open
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkBackendConnection();
  setupEventListeners();
});

/**
 * Load settings from storage
 */
async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'enabled',
    'speechRate',
    'language',
    'highlightColor',
    'autoSummary',
    'backendUrl'
  ]);

  // Apply settings to UI
  extensionToggle.checked = settings.enabled !== false;
  updateStatusText(settings.enabled !== false);

  speechRateSlider.value = settings.speechRate || 1.0;
  speechRateValue.textContent = (settings.speechRate || 1.0) + 'x';

  languageSelect.value = settings.language || 'en-US';
  highlightColorInput.value = settings.highlightColor || '#FFD700';
  updateColorHex(highlightColorInput.value);
  autoSummaryCheckbox.checked = settings.autoSummary !== false;
  backendUrlInput.value = settings.backendUrl || 'http://localhost:3000';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Extension toggle
  extensionToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.sync.set({ enabled });
    updateStatusText(enabled);

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'toggleExtension',
      enabled: enabled
    });

    // Update button states
    updateButtonStates(enabled);
  });

  // Summarize button
  summarizeBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'summarizePage' });
    window.close();
  });

  // Voice command button
  voiceCommandBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'startVoiceCommand' });
    window.close();
  });

  // Speech rate slider
  speechRateSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    speechRateValue.textContent = value.toFixed(1) + 'x';
  });

  speechRateSlider.addEventListener('change', async (e) => {
    const value = parseFloat(e.target.value);
    await chrome.storage.sync.set({ speechRate: value });
    notifyContentScripts();
  });

  // Language select
  languageSelect.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ language: e.target.value });
    notifyContentScripts();
  });

  // Highlight color
  highlightColorInput.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ highlightColor: e.target.value });
    updateColorHex(e.target.value);
    notifyContentScripts();
  });

  highlightColorInput.addEventListener('input', (e) => {
    updateColorHex(e.target.value);
  });

  // Auto-summary checkbox
  autoSummaryCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ autoSummary: e.target.checked });
    notifyContentScripts();
  });

  // Backend URL
  backendUrlInput.addEventListener('change', async (e) => {
    const url = e.target.value.trim();
    await chrome.storage.sync.set({ backendUrl: url });
    await checkBackendConnection();
  });
}

/**
 * Update status text based on enabled state
 */
function updateStatusText(enabled) {
  if (enabled) {
    statusText.textContent = 'ON';
    statusText.classList.add('enabled');
    statusText.classList.remove('disabled');
  } else {
    statusText.textContent = 'OFF';
    statusText.classList.remove('enabled');
    statusText.classList.add('disabled');
  }
}

/**
 * Update the hex color label
 */
function updateColorHex(value) {
  const colorHex = document.getElementById('colorHex');
  if (colorHex) colorHex.textContent = value.toUpperCase();
}

/**
 * Update button states based on enabled state
 */
function updateButtonStates(enabled) {
  summarizeBtn.disabled = !enabled;
  voiceCommandBtn.disabled = !enabled;
}

/**
 * Notify content scripts of settings update
 */
async function notifyContentScripts() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: 'updateSettings' });
  }
}

/**
 * Check backend server connection
 */
async function checkBackendConnection() {
  const settings = await chrome.storage.sync.get(['backendUrl']);
  const backendUrl = settings.backendUrl || 'http://localhost:3000';

  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });

    if (response.ok) {
      connectionStatus.classList.add('connected');
      connectionStatus.classList.remove('error');
      connectionText.textContent = 'Connected';
    } else {
      throw new Error('Server responded with error');
    }
  } catch (error) {
    connectionStatus.classList.remove('connected');
    connectionStatus.classList.add('error');
    connectionText.textContent = 'Not connected';
    console.error('Backend connection error:', error);
  }
}

// Check connection every 10 seconds while popup is open
setInterval(checkBackendConnection, 10000);
