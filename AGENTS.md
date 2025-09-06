## AI Instructions

1. Start local server (from repo root):

```bash
# Run in background on port 8080 and store PID (recommended for agents)
npx --yes http-server -p 8080 -c-1 . > /dev/null 2>&1 & echo $! > /tmp/http-server.pid
```

2. Before committing changes, always run the tests and ESLint fix:

```bash
# Run tests (headless)
# Full suite (starts a server on 5173, runs Cypress, then stops server)
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1 & CYPRESS_BASE_URL=http://127.0.0.1:5173 npx --yes cypress run --config-file tests/cypress.config.js ; kill %1 || true

# Single spec example
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1 & CYPRESS_BASE_URL=http://127.0.0.1:5173 npx --yes cypress run --config-file tests/cypress.config.js --spec tests/09_player_context_menu.cy.js ; kill %1 || true

# Fix lint issues
npx eslint --fix
```
