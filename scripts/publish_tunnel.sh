#!/usr/bin/env bash
set -euo pipefail

PORT=8080

# Write IP/password on line 1 and deterministic URL on line 2
IP=$(curl -fsSL https://loca.lt/mytunnelpassword || true)
SUB="clk$RANDOM$RANDOM"
URL="https://${SUB}.loca.lt"
printf '%s\n%s\n' "$IP" "$URL" > /workspace/.port

# Ensure the static server is running
if ! pgrep -af "http-server -p ${PORT}" >/dev/null 2>&1; then
	nohup npx --yes http-server -p ${PORT} -c-1 . >/dev/null 2>&1 &
	echo $! > /tmp/http-server.pid
fi

# Restart localtunnel with the chosen subdomain and keep it running after shell exit
pkill -f "localtunnel --port ${PORT}" 2>/dev/null || true
nohup npx --yes localtunnel --port ${PORT} --subdomain "$SUB" >/tmp/localtunnel.log 2>&1 & echo $! > /tmp/localtunnel.pid

