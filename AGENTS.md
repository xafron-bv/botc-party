## AI Instructions

1. Run tests (headless):

```bash
# Full suite (starts a server on 5173, runs Cypress, then stops server)
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1 & CYPRESS_BASE_URL=http://127.0.0.1:5173 npx --yes cypress run --config-file tests/cypress.config.js ; kill %1 || true

# Single spec example
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1 & CYPRESS_BASE_URL=http://127.0.0.1:5173 npx --yes cypress run --config-file tests/cypress.config.js --spec tests/09_player_context_menu.cy.js ; kill %1 || true
```
2. Start local server (from repo root):

```bash
npx --yes http-server -c-1
```

3. Publish the local port (default http-server port 8080):

```bash
# Save tunnel password
curl -fsSL https://loca.lt/mytunnelpassword > /workspace/.port

# Stop any existing localtunnel
[ -f /tmp/tunnel.pid ] && kill $(cat /tmp/tunnel.pid) 2>/dev/null || true

# Start localtunnel in background and capture logs/PID (log and pid in /tmp)
npx --yes localtunnel --port 8080 > /tmp/tunnel.log 2>&1 & echo $! > /tmp/tunnel.pid

# Wait for the public URL and append it to /workspace/.port
timeout 20s bash -lc 'until grep -m1 -Eo "https?://[^[:space:]]+" /tmp/tunnel.log >> /workspace/.port; do sleep 0.5; done'
```

4. Before committing changes, always run the tests and ESLint fix:

```bash
# Run tests as in step 1, then:
npx eslint --fix
```

