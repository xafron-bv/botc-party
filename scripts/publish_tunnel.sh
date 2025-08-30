#!/usr/bin/env bash
set -euo pipefail

PORT=8080

# Write IP/password to first line and a blank second line placeholder
PASS=$(curl -fsSL https://loca.lt/mytunnelpassword || true)
printf '%s\n' "$PASS" > /workspace/.port
printf '\n' >> /workspace/.port

# Ensure the static server is running
if ! pgrep -af "http-server -p ${PORT}" >/dev/null 2>&1; then
  nohup npx --yes http-server -p ${PORT} -c-1 . >/dev/null 2>&1 &
  echo $! > /tmp/http-server.pid
fi

# Kill any existing localtunnel and start a new one with a random subdomain
pkill -f "localtunnel --port ${PORT}" 2>/dev/null || true
rm -f /tmp/localtunnel.log

SUB="clk$RANDOM$RANDOM"
nohup npx --yes localtunnel --port ${PORT} --subdomain "$SUB" >> /tmp/localtunnel.log 2>&1 &
echo $! > /tmp/localtunnel.pid

# Wait up to ~20s for the URL to appear in the log
ACTUAL=""
for i in $(seq 1 80); do
  if [ -f /tmp/localtunnel.log ]; then
    ACTUAL=$(grep -Eo 'https?://[^[:space:]]+' /tmp/localtunnel.log | head -n1 || true)
  fi
  if [ -n "$ACTUAL" ]; then
    break
  fi
  sleep 0.25
done

if [ -z "$ACTUAL" ]; then
  ACTUAL="https://${SUB}.loca.lt"
fi

# Ensure .port has the URL on the second line
if [ "$(wc -l < /workspace/.port)" -lt 2 ]; then
  printf '%s\n' "$ACTUAL" >> /workspace/.port
else
  awk -v url="$ACTUAL" 'NR==2{$0=url} {print}' /workspace/.port > /workspace/.port.tmp && mv /workspace/.port.tmp /workspace/.port
fi

exit 0

