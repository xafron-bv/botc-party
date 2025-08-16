# Blood on the Clocktower - Party PWA Grimoire

A Progressive Web App (PWA) version of the Blood on the Clocktower Grimoire that works offline, allowing game masters to manage in-person game sessions without an internet connection.

## Features

- **Offline First**: Works completely offline after initial load for in-person games
- **Default Token Library**: Includes comprehensive character tokens from the official BOTC game
- **Custom Script Support**: Upload custom JSON scripts for specific game scenarios
- **Player Management**: Set up games with 5-20 players
- **Character Assignment**: Drag and drop character tokens to players
- **Reminder System**: Add text reminders to player tokens
- **Responsive Design**: Works on desktop and mobile devices
- **PWA Installation**: Can be installed as a native app on supported devices

## Usage

1. **Load Default Tokens**: Click "Load Default Tokens" to load the built-in character library
2. **Set Player Count**: Choose the number of players (5-20)
3. **Start Game**: Click "Start Game" to create the player circle
4. **Assign Characters**: Click on player tokens to assign characters from the loaded script
5. **Add Reminders**: Click the "+" button on players to add text reminders
6. **Custom Scripts**: Upload custom JSON scripts in the same format as tokens.json

## File Structure

- `index.html` - Main application interface
- `tokens.json` - Default character library with all official BOTC roles
- `service-worker.js` - Service worker for offline functionality and caching
- `manifest.json` - PWA manifest for app installation
- `tb.json` - Example script file (Trouble Brewing)

## Offline Functionality

The app uses a service worker to cache:
- All HTML, CSS, and JavaScript files
- Character token images
- Default token data
- External resources (Font Awesome, background images)

## Installation

### As PWA
1. Open the app in a supported browser (Chrome, Edge, Safari)
2. Look for the install prompt or use the browser's menu
3. Install the app for offline access

### Manual Setup
1. Clone or download the repository
2. Serve the files from a web server (local or hosted)
3. Access via browser

## Browser Support

- Chrome 67+
- Edge 79+
- Firefox 67+
- Safari 11.1+
- Mobile browsers with PWA support

## Development

The app is built with vanilla HTML, CSS, and JavaScript. No build process or dependencies required.

## License

This project is for educational and personal use. Blood on the Clocktower is a trademark of The Pandemonium Institute.

## Recent Updates

- Reuse players: a new checkbox under Game Setup preserves existing player names when starting a new game.
- Reminder tokens: initial Balloonist-related tokens added; modal prioritizes character-related reminders when applicable.
- Mobile UX: reminder tokens and plus button slightly smaller on small screens; delete icon only visible when the player's reminders are expanded; raised z-index to avoid overlap at center.
- Saving: current game is auto-saved and appears as "Last game" in Grimoire History without starting a new game first.
