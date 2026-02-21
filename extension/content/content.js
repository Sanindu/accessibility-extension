/**
 * Content script - Main logic for accessibility assistant
 * Injected into all web pages
 */

// Import utilities (loaded via manifest)
let voiceManager;
let apiClient;
let currentElements = [];
let highlightedElement = null;
let pendingSummary = null;
let autoSpeakOnLoad = false;
let settings = {
  enabled: true,
  autoSummary: true,
  highlightColor: '#FFD700',
  speechRate: 1.0,
  language: 'en-US'
};

// Initialize
(async function init() {
  console.log('Accessibility Assistant: Content script loaded');

  // Load utilities
  await loadUtilities();

  // Get extension settings
  await loadSettings();

  // Check if extension is enabled
  if (!settings.enabled) {
    console.log('Extension is disabled');
    return;
  }

  // Check if we navigated here via a voice command — auto-speak summary if so
  const { autoSpeak } = await chrome.storage.local.get('autoSpeak');
  if (autoSpeak) {
    await chrome.storage.local.remove('autoSpeak');
    autoSpeakOnLoad = true;
  }

  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onPageReady);
  } else {
    onPageReady();
  }

  // Listen for keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'a') {
      e.preventDefault();
      stopAllSpeech();
      startVoiceCommand();
    } else if (e.key === 'Escape') {
      stopAllSpeech();
    }
  });
})();

/**
 * Load utility scripts
 */
async function loadUtilities() {
  // Voice and API utilities are loaded via content script in manifest
  // Access them from window scope
  voiceManager = window.voiceManager;
  apiClient = window.apiClient;

  // Verify utilities are loaded
  if (!voiceManager || !apiClient) {
    console.error('Failed to load utilities');
    throw new Error('Utilities not available');
  }

  console.log('Utilities loaded successfully');
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  const stored = await chrome.storage.sync.get([
    'enabled',
    'autoSummary',
    'highlightColor',
    'speechRate',
    'language'
  ]);

  settings = { ...settings, ...stored };

  if (voiceManager) {
    voiceManager.setSpeechRate(settings.speechRate);
    voiceManager.setLanguage(settings.language);
  }
}

/**
 * Called when page is ready
 */
async function onPageReady() {
  console.log('Page ready for accessibility processing');

  // Fetch summary silently in background — will be spoken on first Alt+A
  if (settings.autoSummary) {
    setTimeout(() => {
      fetchSummary();
    }, 1000);
  }
}

/**
 * Silently fetch page summary in background (no speech — avoids not-allowed error)
 */
async function fetchSummary() {
  try {
    console.log('Fetching page summary in background...');

    const pageContent = extractPageContent();
    const pageTitle = document.title || window.location.hostname || 'Untitled Page';
    const interactiveElements = extractInteractiveElements();
    const mainElements = interactiveElements.slice(0, 25).map(el => ({
      type: el.tag,
      text: el.text || el.ariaLabel || 'unlabeled'
    }));

    const result = await apiClient.analyzePage(pageContent, pageTitle, mainElements);
    pendingSummary = result.summary;
    console.log('✅ Summary ready:', pendingSummary.substring(0, 80) + '...');

    // If we navigated here via voice command, speak summary automatically
    if (autoSpeakOnLoad) {
      autoSpeakOnLoad = false;
      chrome.runtime.sendMessage({
        action: 'speak',
        text: pendingSummary + ' Press Option A to give a voice command.'
      });
      pendingSummary = null;
    }
  } catch (error) {
    console.error('Error fetching summary:', error);
  }
}

/**
 * Extract meaningful content from page
 */
function extractPageContent() {
  let content = '';

  // Extract meta description if available
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    content += metaDesc.getAttribute('content') + ' ';
  }

  // Extract main heading (h1)
  const h1 = document.querySelector('h1');
  if (h1) {
    content += h1.textContent.trim() + '. ';
  }

  // Extract subheadings (h2, h3)
  const subheadings = document.querySelectorAll('h2, h3');
  subheadings.forEach((h, index) => {
    if (index < 5) { // Limit to first 5 subheadings
      content += h.textContent.trim() + '. ';
    }
  });

  // Extract paragraphs or main content
  const mainContent = document.querySelector('main, article, [role="main"]');
  if (mainContent) {
    const paragraphs = mainContent.querySelectorAll('p');
    paragraphs.forEach((p, index) => {
      if (index < 3 && p.textContent.trim().length > 20) {
        content += p.textContent.trim() + ' ';
      }
    });
  } else {
    // Fallback: get first few paragraphs from body
    const paragraphs = document.querySelectorAll('p');
    paragraphs.forEach((p, index) => {
      if (index < 3 && p.textContent.trim().length > 20) {
        content += p.textContent.trim() + ' ';
      }
    });
  }

  // Fallback: if no content found from semantic elements, extract visible text from body
  if (!content.trim()) {
    const bodyText = document.body?.innerText || '';
    // Take first meaningful chunk of visible text
    content = bodyText.substring(0, 2000).trim();
  }

  // Final fallback: use the page title or URL as content
  if (!content.trim()) {
    content = document.title || window.location.href;
  }

  // Limit total length
  return content.substring(0, 2000).trim();
}

/**
 * Extract interactive elements from page
 */
function extractInteractiveElements() {
  const elements = [];
  const selectors = [
    'button',
    'a[href]',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[onclick]'
  ];

  const allElements = document.querySelectorAll(selectors.join(','));

  allElements.forEach((el, index) => {
    if (!isElementVisible(el)) return;

    const elementData = {
      index: index,
      tag: el.tagName.toLowerCase(),
      text: getElementText(el),
      ariaLabel: el.getAttribute('aria-label') || '',
      role: el.getAttribute('role') || '',
      type: el.type || '',
      href: el.href || '',
      id: el.id || '',
      className: el.className || ''
    };

    elements.push(elementData);

    // Store reference to actual DOM element
    el.dataset.accessibilityIndex = index;
  });

  return elements;
}

/**
 * Get visible text from element
 */
function getElementText(el) {
  // Try aria-label first
  if (el.getAttribute('aria-label')) {
    return el.getAttribute('aria-label');
  }

  // Try visible text
  let text = el.textContent?.trim() || '';

  // For inputs, include placeholder
  if (el.tagName === 'INPUT' && el.placeholder) {
    text = el.placeholder;
  }

  // Limit length
  return text.substring(0, 100);
}

/**
 * Check if element is visible
 */
function isElementVisible(el) {
  const style = window.getComputedStyle(el);
  return style.display !== 'none' &&
         style.visibility !== 'hidden' &&
         style.opacity !== '0' &&
         el.offsetWidth > 0 &&
         el.offsetHeight > 0;
}

/**
 * Stop all speech (both browser TTS and background chrome.tts)
 */
function stopAllSpeech() {
  voiceManager.stopSpeaking();
  chrome.runtime.sendMessage({ action: 'stopSpeaking' });
}

/**
 * Start voice command listening
 */
async function startVoiceCommand() {
  try {
    // Speak the pending summary first if available (user gesture makes this allowed)
    if (pendingSummary) {
      await voiceManager.speak(pendingSummary);
      pendingSummary = null;
    }

    await voiceManager.speak('Listening for your command...');

    // Extract current page elements
    currentElements = extractInteractiveElements();

    if (currentElements.length === 0) {
      await voiceManager.speak('No interactive elements found on this page.');
      return;
    }

    // Reset recognition so it can be restarted after previous use
    voiceManager.resetRecognition();

    // Start listening
    const success = voiceManager.startListening(async (command) => {
      await processVoiceCommand(command);
    });

    if (!success) {
      await voiceManager.speak('Could not start voice recognition. Please check microphone permissions.');
    }
  } catch (error) {
    console.error('Error starting voice command:', error);
    voiceManager.speak('Error starting voice command.');
  }
}

/**
 * Process voice command
 */
async function processVoiceCommand(command) {
  try {
    console.log('📝 Processing command:', command);
    console.log('📊 Total elements available:', currentElements.length);

    voiceManager.speak('Searching for element...');

    // Send to backend to find matching element
    console.log('🔍 Sending to backend...');
    const result = await apiClient.findElement(command, currentElements);

    console.log('✅ Backend response:', result);

    if (!result.found) {
      console.warn('❌ Element not found:', result.message);
      voiceManager.speak(result.message || 'Could not find matching element.');
      return;
    }

    // Speak result
    console.log('🎯 Found element:', result.element);
    await voiceManager.speak(result.message);

    // Find and interact with element
    const elementData = result.element;
    console.log('🔎 Looking for element with index:', elementData.index);

    const domElement = document.querySelector(
      `[data-accessibility-index="${elementData.index}"]`
    );

    console.log('📍 DOM element found:', !!domElement);

    if (domElement) {
      await interactWithElement(domElement, elementData, command);
    } else {
      console.error('❌ Element found in list but not in DOM');
      voiceManager.speak('Element found but could not interact with it.');
    }

  } catch (error) {
    console.error('❌ Error processing voice command:', error);
    console.error('Error details:', error.message, error.stack);
    voiceManager.speak('Error processing your command: ' + error.message);
  }
}

/**
 * Interact with DOM element
 */
async function interactWithElement(element, elementData, command) {
  // Highlight element
  highlightElement(element);

  // Scroll into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Wait a moment for visual feedback
  await new Promise(resolve => setTimeout(resolve, 500));

  // Determine action based on element type and command
  if (command.toLowerCase().includes('click') ||
      element.tagName === 'BUTTON' ||
      element.tagName === 'A') {
    // If it's a link that navigates away, flag the next page to auto-speak
    if (element.tagName === 'A' && element.href && !element.href.startsWith('javascript')) {
      await chrome.storage.local.set({ autoSpeak: true });
    }
    element.click();
    voiceManager.speak('Clicked.');
  } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    element.focus();
    voiceManager.speak('Focused on input field. You can now type.');
  } else {
    element.click();
    voiceManager.speak('Activated.');
  }
}

/**
 * Highlight element
 */
function highlightElement(element) {
  // Remove previous highlight
  if (highlightedElement) {
    highlightedElement.classList.remove('accessibility-highlight');
  }

  // Add highlight
  element.classList.add('accessibility-highlight');
  highlightedElement = element;

  // Remove highlight after 3 seconds
  setTimeout(() => {
    element.classList.remove('accessibility-highlight');
    if (highlightedElement === element) {
      highlightedElement = null;
    }
  }, 3000);
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarizePage') {
    startVoiceCommand();
    sendResponse({ success: true });
  } else if (request.action === 'startVoiceCommand') {
    startVoiceCommand();
    sendResponse({ success: true });
  } else if (request.action === 'updateSettings') {
    loadSettings();
    sendResponse({ success: true });
  }
});
