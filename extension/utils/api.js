/**
 * API utility for communicating with the backend server
 */

class APIClient {
  constructor() {
    this.backendUrl = 'http://localhost:3000';
    this.init();
  }

  async init() {
    const settings = await chrome.storage.sync.get(['backendUrl']);
    if (settings.backendUrl) {
      this.backendUrl = settings.backendUrl;
    }
  }

  async analyzePage(pageContent, pageTitle, elements = []) {
    try {
      const response = await fetch(`${this.backendUrl}/api/analyze-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageContent, pageTitle, elements })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to analyze page');

      return { summary: data.summary, audio: data.audio, audioFormat: data.audioFormat };
    } catch (error) {
      console.error('API Error - analyzePage:', error);
      throw error;
    }
  }

  async findElement(command, elements) {
    try {
      const response = await fetch(`${this.backendUrl}/api/find-element`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, elements })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to find element');

      return { found: data.found, element: data.element, elementIndex: data.elementIndex, message: data.message };
    } catch (error) {
      console.error('API Error - findElement:', error);
      throw error;
    }
  }
}

window.apiClient = new APIClient();
