# Web Accessibility Assistant - Browser Extension

An AI-powered browser extension designed to help visually impaired users navigate web pages using voice commands and automated page summaries.

## Features

- **Automatic Page Summarization**: When a page loads, the extension automatically generates and reads aloud a concise summary of the page content
- **Voice-Controlled Navigation**: Users can navigate and interact with page elements using natural voice commands
- **Intelligent Element Matching**: AI-powered matching of voice commands to page elements (buttons, links, inputs)
- **Customizable Settings**: Adjustable speech rate, language, highlight colors, and more
- **Navigation History**: Tracks user interactions for improved suggestions
- **Cross-Device Sync**: User preferences synced via MongoDB

## Technology Stack

### Frontend (Browser Extension)
- **Manifest V3** (Chrome/Edge compatible)
- **Web Speech API** for voice recognition and synthesis
- **Vanilla JavaScript** for compatibility

### Backend
- **Node.js + Express.js**
- **MongoDB** for user data and history
- **Minimax API** for AI-powered text summarization and TTS

## Project Structure

```
.
├── extension/              # Browser extension files
│   ├── manifest.json      # Extension configuration
│   ├── background.js      # Service worker
│   ├── content/           # Content scripts
│   │   ├── content.js
│   │   └── content.css
│   ├── popup/             # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── utils/             # Utility modules
│   │   ├── api.js         # Backend API client
│   │   └── voice.js       # Voice/speech utilities
│   └── icons/             # Extension icons (16, 48, 128px)
│
└── server/                # Backend server
    ├── server.js          # Main server file
    ├── package.json       # Node.js dependencies
    ├── .env.example       # Environment variables template
    ├── models/            # MongoDB models
    │   ├── User.js
    │   └── NavigationHistory.js
    ├── routes/            # API routes
    │   ├── page-analysis.js
    │   ├── element-finder.js
    │   ├── preferences.js
    │   └── history.js
    └── services/          # Business logic
        ├── minimax.js     # Minimax API integration
        └── database.js    # MongoDB connection
```

## Setup Instructions

### Prerequisites

1. **Node.js** (v16 or higher)
2. **MongoDB** (local installation or MongoDB Atlas)
3. **Minimax Account** with API key
4. **Chrome or Edge browser**

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from template:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` file with your credentials:
   ```env
   MINIMAX_API_KEY=your_minimax_api_key_here
   MINIMAX_GROUP_ID=your_group_id_here
   MONGODB_URI=mongodb://localhost:27017/accessibility-extension
   PORT=3000
   ALLOWED_ORIGINS=chrome-extension://your-extension-id-here
   ```

5. Start the server:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

6. Verify server is running:
   - Open http://localhost:3000/health in your browser
   - You should see: `{"status":"OK","timestamp":"...","uptime":...}`

### MongoDB Setup

**Option 1: Local MongoDB**
```bash
# Install MongoDB (if not already installed)
# Start MongoDB service
mongod --dbpath /path/to/data/directory
```

**Option 2: MongoDB Atlas (Cloud)**
1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string and update `MONGODB_URI` in `.env`

### Minimax API Setup

1. Sign up at https://minimax.io
2. Get your API key and Group ID from the dashboard
3. Update `.env` file with your credentials

**Note**: Check Minimax API documentation for:
- Correct API endpoints
- Model names (may differ from `abab6.5-chat` or `speech-01`)
- Rate limits and pricing

### Extension Installation

1. Open Chrome/Edge and navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. Enable "Developer mode" (toggle in top-right)

3. Click "Load unpacked"

4. Select the `extension` folder from this project

5. Copy the extension ID (it will look like: `abcdefghijklmnopqrstuvwxyz123456`)

6. Update `ALLOWED_ORIGINS` in server `.env` file:
   ```env
   ALLOWED_ORIGINS=chrome-extension://your-actual-extension-id
   ```

7. Restart the backend server

8. In the extension popup, verify:
   - Backend URL is set to `http://localhost:3000`
   - Connection status shows "Connected" (green dot)

### Extension Icons

The extension requires icons in the `extension/icons/` directory:
- `icon16.png` (16x16px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

You can create these using any image editor or use free icon generators online.

## Usage

### First Time Setup

1. Click the extension icon in the browser toolbar
2. Verify the extension is **Enabled** (toggle should be on)
3. Check that the backend connection shows **Connected**
4. Adjust settings as needed:
   - Speech Rate (0.5x - 2.0x)
   - Language
   - Highlight Color
   - Auto-summarize pages

### Using the Extension

#### Automatic Page Summary
- When enabled, the extension automatically summarizes and reads aloud new pages
- Wait for the summary to complete
- You'll hear: "Where would you like to navigate?"

#### Voice Commands
1. Press `Alt + A` on any page (or click the Voice Command button in popup)
2. Wait for: "Listening for your command..."
3. Speak your command clearly:
   - "Click on register button"
   - "Click sign in"
   - "Go to contact link"
   - "Click search button"
4. The extension will:
   - Find the matching element
   - Highlight it (golden outline with pulse animation)
   - Scroll it into view
   - Click or focus on it
   - Announce the action

#### Manual Controls
- **Summarize Page**: Click in popup to manually trigger page summary
- **Voice Command**: Click in popup or use `Alt + A` keyboard shortcut

## API Endpoints

The backend server exposes the following endpoints:

### Page Analysis
```
POST /api/analyze-page
Body: { pageContent, pageTitle, userId }
Response: { success, summary, audio, audioFormat }
```

### Element Finder
```
POST /api/find-element
Body: { command, elements, userId }
Response: { success, found, element, elementIndex, message }
```

### User Preferences
```
GET /api/preferences/:userId
Response: { success, preferences }

POST /api/preferences/:userId
Body: { speechRate, voiceType, language, highlightColor, autoSummary }
Response: { success, preferences }
```

### Navigation History
```
POST /api/history/:userId
Body: { url, pageTitle, command, targetElement, actionType, success }
Response: { success, message }

GET /api/history/:userId?limit=50
Response: { success, history }
```

## Troubleshooting

### Extension Issues

**"Not connected" in popup**
- Ensure backend server is running (`npm start` in server directory)
- Check backend URL in popup settings
- Verify `ALLOWED_ORIGINS` in `.env` includes your extension ID

**Voice recognition not working**
- Check browser microphone permissions
- Ensure you're using HTTPS or localhost (required for Web Speech API)
- Try a different browser (Chrome recommended)

**No audio playback**
- Check browser audio permissions
- Verify Minimax TTS is working (check server logs)
- Try browser fallback TTS in voice.js

**Elements not found**
- Some dynamic pages may not be fully parsed
- Try being more specific with commands
- Check browser console for errors

### Backend Issues

**MongoDB connection error**
- Verify MongoDB is running
- Check `MONGODB_URI` in `.env`
- For Atlas, ensure IP whitelist includes your IP

**Minimax API errors**
- Verify API key and Group ID
- Check API rate limits
- Review Minimax API documentation for correct endpoints
- Check server console logs for detailed errors

**CORS errors**
- Update `ALLOWED_ORIGINS` with correct extension ID
- Restart backend server after changing `.env`

## Development

### Running in Development Mode

**Backend:**
```bash
cd server
npm run dev
```

**Extension:**
- Make changes to extension files
- Go to `chrome://extensions/`
- Click reload icon on your extension

### Testing

1. Test on various websites:
   - Simple static pages
   - Complex web applications
   - Forms and interactive elements

2. Test voice commands:
   - Different phrasings
   - Synonyms (e.g., "sign up" vs "register")
   - Multiple elements with similar text

3. Test edge cases:
   - Pages with many buttons
   - Dynamic content (SPAs)
   - iframes and shadow DOM

## Security Considerations

- API keys are stored only in backend `.env` file (never exposed to client)
- CORS restricts API access to your extension only
- Input sanitization on all API endpoints
- User data isolated by userId
- MongoDB connection with authentication recommended for production

## Future Enhancements

- [ ] Multi-language page summarization
- [ ] Custom voice command macros
- [ ] Form auto-fill assistance
- [ ] Keyboard shortcut customization
- [ ] Offline mode with cached summaries
- [ ] Integration with screen readers
- [ ] Support for Firefox and Safari
- [ ] Voice command history suggestions
- [ ] Page element search/filtering
- [ ] Advanced AI prompts for better element matching

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review server console logs
3. Check browser console (F12) for errors
4. Verify all prerequisites are installed correctly

## Acknowledgments

- Minimax API for AI and TTS capabilities
- Web Speech API for voice recognition
- MongoDB for data persistence
- Chrome Extensions platform
