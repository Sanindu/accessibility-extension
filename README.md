# Accessibility Assistant

A Chrome extension that helps visually impaired users navigate the web using voice commands and AI-generated page summaries.

## How it works

- **Page summary** — when you arrive on a page, the extension reads aloud a short AI-generated summary of the page content
- **Voice navigation** — press ⌥A and say something like "click sign in" or "go to about" — the extension finds the right element and clicks it
- **Auto-speak on navigation** — when a voice command takes you to a new page, the new page is summarized automatically

## Tech stack

- Chrome Extension (Manifest V3)
- Web Speech API — voice recognition and text-to-speech
- Groq (Llama 3.3) — page summarization and voice-to-element matching
- Node.js + Express — backend proxy to keep API keys off the client

## Setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` with your credentials:

```env
GROQ_API_KEY=your_groq_api_key_here
ALLOWED_ORIGINS=chrome-extension://your_extension_id_here
PORT=3000
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).

Start the server:

```bash
npm run dev
```

### 2. Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder
4. Copy the extension ID and paste it into `ALLOWED_ORIGINS` in your `.env`
5. Restart the server

In the extension popup, make sure the backend URL is set to `http://localhost:3000` and the status shows **Connected**.

## Usage

| Action | How |
|---|---|
| Hear page summary | Press ⌥A (first press reads summary, then listens) |
| Give voice command | Press ⌥A and speak — e.g. "click register" |
| Stop speech | Press Escape |
| Trigger from popup | Click **Start voice command** or **Summarize this page** |

## Project structure

```
extension/       Chrome extension files
  background.js  Service worker (chrome.tts, message handling)
  content/       Content script injected into every page
  popup/         Extension popup UI
  utils/
    api.js       Backend API client
    voice.js     Speech recognition and synthesis

server/
  server.js      Express server
  routes/
    page-analysis.js    POST /api/analyze-page
    element-finder.js   POST /api/find-element
  services/
    gemini.js    Groq API integration
```

## API

```
POST /api/analyze-page
Body: { pageContent, pageTitle, elements }
Response: { success, summary }

POST /api/find-element
Body: { command, elements }
Response: { success, found, element, elementIndex, message }
```
