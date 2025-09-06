# Blood on the Clocktower - Party PWA Grimoire

A Progressive Web App (PWA) version of the Blood on the Clocktower Grimoire that works offline, allowing game masters to manage in-person game sessions without an internet connection.

## Features

- **Offline First**: Works completely offline after initial load via service worker caching
- **Base Scripts Included**: One-click load for Trouble Brewing, Bad Moon Rising, and Sects & Violets
- **All Characters Mode**: Load the entire character library for custom setups
- **Custom Script Support**: Upload custom JSON scripts using the same schema as `characters.json`
- **Player Management**: Set up games with 5–20 players
- **Character Assignment**: Drag and drop character tokens to players
- **Reminders**: Add text reminders and choose reminder tokens
- **Travellers Toggle**: Optionally include Traveller roles in the character sheet
- **History**: Script history and Grimoire history with rename/delete
- **Backgrounds**: Select from built-in backgrounds or disable
- **Responsive Design**: Works on desktop and mobile devices
- **PWA Installation**: Can be installed as a native app on supported devices

## Usage

1. **Set Player Count**: Choose the number of players (5–20)
2. **Load a Script**:
   - Click one of: "Trouble Brewing", "Bad Moon Rising", "Sects & Violets", or "Load All Characters"
   - Or upload a custom JSON script (same schema as `characters.json`)
3. **Start Game**: Click "Start Game" to create the player circle
4. **Assign Characters**: Click player tokens to assign characters from the loaded script
5. **Add Reminders**: Use the + button on players for text or token-based reminders
6. **Optional**:
   - Toggle "Include Travellers" to show Traveller roles
   - Pick a background in "Background" settings
   - Use the tutorial for a quick tour
   - Manage past setups in Script History and Grimoire History

## File Structure

- `index.html` – Main application interface
- `script.js` – Main application logic (imports `pwa.js` and UI modules)
- `utils.js` – Shared utility functions
- `ui/` – UI modules (`tooltip.js`, `svg.js`, `guides.js`, `sidebar.js`, `tour.js`, `layout.js`)
- `characters.json` – Default character library
- `Trouble Brewing.json`, `Bad Moon Rising.json`, `Sects and Violets.json` – Base scripts
- `service-worker.js` – Offline functionality and caching strategy
- `pwa.js` – Service worker registration and update handling
- `manifest.json` – PWA manifest
- `assets/` – Fonts, icons, backgrounds, reminder assets
- `build/img/icons/` – Character token images (cached on demand)
- `tests/` – Cypress E2E tests and configuration
- `terms.html` – Terms of Use
- `LICENSE.md` – License

## Offline Functionality

The service worker caches core assets and data for reliable offline usage. Notable behavior:

- Caches HTML, CSS, JS, and manifest assets
- Caches base scripts and `characters.json` (with background refresh)
- Caches token images on first fetch after `characters.json` loads
- Uses network-first for app shell files (falls back to cache)

## Installation

### As PWA

1. Open the app in a supported browser (Chrome, Edge, Safari)
2. Look for the install prompt or use the browser menu to install

### Manual Setup (local or hosted)

1. Clone or download the repository
2. Serve the directory with any static web server (required for service workers):

```bash
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1
```

3. Open `http://127.0.0.1:5173` in your browser

> Note: Opening via `file://` will prevent the service worker from registering. Use an HTTP server.

## Browser Support

- Chrome 67+
- Edge 79+
- Firefox 67+
- Safari 11.1+
- Mobile browsers with PWA support

## Development

The app is built with vanilla HTML, CSS, and JavaScript. No build process or dependencies are required.

## Tests (Cypress)

- Tests live under `tests/` and are written in JavaScript
- You can run Cypress via `npx` without installing it globally. This command serves the app and runs headlessly:

```bash
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1 & CYPRESS_BASE_URL=http://127.0.0.1:5173 npx --yes cypress run --config-file tests/cypress.config.js ; kill %1 || true
```

- Or open the interactive test runner:

```bash
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1 & CYPRESS_BASE_URL=http://127.0.0.1:5173 npx --yes cypress open --config-file tests/cypress.config.js ; kill %1 || true
```

## Deployment

- **Other Hosts**: This is a static site—host the repo contents on any static hosting provider.

## License

This project is for educational and personal use. Blood on the Clocktower is a trademark of The Pandemonium Institute.

## Acknowledgments

Some of the assets including the jinxes and the character info are from the [pocket-grimoire](https://github.com/Skateside/pocket-grimoire) project.

- [Blood on the Clocktower](https://bloodontheclocktower.com/)
- [pocket-grimoire](https://github.com/Skateside/pocket-grimoire)
