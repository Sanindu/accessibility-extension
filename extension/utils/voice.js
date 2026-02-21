/**
 * Voice utility for Web Speech API (Speech Recognition & Synthesis)
 */

class VoiceManager {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.onCommandCallback = null;
    this.speechRate = 1.0;
    this.language = 'en-US';
    this.preferredVoice = null;
  }

  /**
   * Pick the best available English voice — called lazily on first speak()
   * Avoids triggering macOS permission dialog on page load
   */
  selectBestVoice() {
    if (this.preferredVoice) return; // Already selected

    const voices = this.synthesis.getVoices();
    if (voices.length === 0) return;

    const preferred = [
      'Samantha',          // macOS — clear and natural
      'Google US English', // Chrome's Google voice
      'Karen',             // macOS Australian English
      'Daniel',            // macOS British English
    ];

    for (const name of preferred) {
      const match = voices.find(v => v.name === name);
      if (match) {
        this.preferredVoice = match;
        console.log('Selected voice:', match.name);
        return;
      }
    }

    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      this.preferredVoice = englishVoice;
      console.log('Selected fallback voice:', englishVoice.name);
    }
  }

  /**
   * Initialize speech recognition
   */
  initRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = this.language;

    this.recognition.onstart = () => {
      console.log('Voice recognition started');
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      const command = event.results[0][0].transcript;
      console.log('Voice command received:', command);

      if (this.onCommandCallback) {
        this.onCommandCallback(command);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;

      if (event.error === 'no-speech') {
        this.speak('No voice command detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        this.speak('Microphone access denied. Please enable microphone permissions.');
      }
    };

    this.recognition.onend = () => {
      console.log('Voice recognition ended');
      this.isListening = false;
    };

    return true;
  }

  /**
   * Start listening for voice commands
   * @param {function} onCommand - Callback when command is recognized
   */
  startListening(onCommand) {
    if (!this.recognition) {
      if (!this.initRecognition()) {
        return false;
      }
    }

    this.onCommandCallback = onCommand;

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting recognition:', error);
      return false;
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Reset recognition so it can be started fresh
   */
  resetRecognition() {
    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
      this.recognition = null;
    }
    this.isListening = false;
  }

  /**
   * Speak text using browser TTS
   * @param {string} text - Text to speak
   * @param {object} options - Speech options
   * @returns {Promise<void>}
   */
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Cancel any ongoing speech
        this.synthesis.cancel();

        this.selectBestVoice();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || this.speechRate;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        utterance.lang = options.lang || this.language;
        if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
        }

        utterance.onend = () => {
          console.log('Speech finished:', text.substring(0, 50) + '...');
          resolve();
        };

        utterance.onerror = (event) => {
          if (event.error === 'interrupted') {
            // Expected when cancel() is called — not a real error
            return;
          }
          console.error('Speech error:', event.error, event.type);
          resolve();
        };

        // Small delay after cancel() to avoid Chrome bug where
        // speak() immediately after cancel() triggers onerror
        setTimeout(() => {
          this.synthesis.speak(utterance);
          console.log('Speaking:', text.substring(0, 50) + '...');
        }, 100);
      } catch (error) {
        console.error('Exception in speak():', error);
        resolve();
      }
    });
  }

  /**
   * Play audio from base64 data (from Minimax TTS)
   * @param {string} audioBase64 - Base64 encoded audio
   * @param {string} format - Audio format (mp3, wav, etc.)
   * @returns {Promise<void>}
   */
  playAudio(audioBase64, format = 'mp3') {
    return new Promise((resolve, reject) => {
      const audio = new Audio(`data:audio/${format};base64,${audioBase64}`);

      audio.onended = () => {
        console.log('Audio playback finished');
        resolve();
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        reject(error);
      };

      audio.play().catch(reject);
    });
  }

  /**
   * Stop any ongoing speech
   */
  stopSpeaking() {
    this.synthesis.cancel();
  }

  /**
   * Set speech rate
   * @param {number} rate - Speech rate (0.1 to 2.0)
   */
  setSpeechRate(rate) {
    this.speechRate = Math.max(0.1, Math.min(2.0, rate));
  }

  /**
   * Set language
   * @param {string} lang - Language code (e.g., 'en-US')
   */
  setLanguage(lang) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  /**
   * Get available voices
   * @returns {Array} - Available voices
   */
  getAvailableVoices() {
    return this.synthesis.getVoices();
  }

  /**
   * Check if speech recognition is supported
   * @returns {boolean}
   */
  isRecognitionSupported() {
    return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
  }

  /**
   * Check if speech synthesis is supported
   * @returns {boolean}
   */
  isSynthesisSupported() {
    return 'speechSynthesis' in window;
  }
}

// Export singleton instance
window.voiceManager = new VoiceManager();
