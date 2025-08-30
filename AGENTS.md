## AI Instructions

1. Start local server (from repo root):

```bash
# Run in background on port 8080 and store PID (recommended for agents)
npx --yes http-server -p 8080 -c-1 . > /dev/null 2>&1 & echo $! > /tmp/http-server.pid
```

2. Publish the local port (default http-server port 8080):

```bash
# Save tunnel password/IP to first line
rm -f /workspace/.port /tmp/localtunnel.pid /tmp/localtunnel.log /tmp/localtunnel_watch.pid
curl -fsSL https://loca.lt/mytunnelpassword > /workspace/.port
echo "" >> /workspace/.port

# Stop any existing localtunnel
pkill -f 'localtunnel --port 8080' 2>/dev/null || true

# Start localtunnel under nohup, logging to a file so we can scrape the URL
nohup sh -c 'npx --yes localtunnel --port 8080 >> /tmp/localtunnel.log 2>&1' >/dev/null 2>&1 & echo $! > /tmp/localtunnel.pid

# Start a watcher that appends the first URL line to .port, then exits
nohup sh -c 'tail -F /tmp/localtunnel.log | grep -m1 -Eo "https?://[^[:space:]]+" >> /workspace/.port' >/dev/null 2>&1 & echo $! > /tmp/localtunnel_watch.pid

# Wait until .port has 2 lines (IP + URL) or timeout (~20s)
for i in $(seq 1 80); do
  [ "$(wc -l < /workspace/.port)" -ge 2 ] && break
  sleep 0.25
done

# Optional: verify processes are alive
ps -p "$(cat /tmp/http-server.pid 2>/dev/null)" 2>/dev/null || true
ps -p "$(cat /tmp/localtunnel.pid 2>/dev/null)" 2>/dev/null || true
```

3. Before committing changes, always run the tests and ESLint fix:

```bash
# Run tests (headless)
# Full suite (starts a server on 5173, runs Cypress, then stops server)
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1 & CYPRESS_BASE_URL=http://127.0.0.1:5173 npx --yes cypress run --config-file tests/cypress.config.js ; kill %1 || true

# Single spec example
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1 & CYPRESS_BASE_URL=http://127.0.0.1:5173 npx --yes cypress run --config-file tests/cypress.config.js --spec tests/09_player_context_menu.cy.js ; kill %1 || true

# Fix lint issues
npx eslint --fix
```

