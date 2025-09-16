#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./test.sh                # run full Cypress suite
#   ./test.sh tests/05_upload_and_background.cy.js tests/10_travellers_toggle.cy.js
#
# Any arguments are treated as spec file paths (relative or absolute) and passed
# to Cypress via a comma-separated --spec list.

BASE_URL="http://127.0.0.1:5173"
CONFIG_FILE="tests/cypress.config.js"

SPECS_ARG=""
if [ "$#" -gt 0 ]; then
	# Join all arguments with commas to form Cypress --spec value
	IFS=',' read -r -a SPEC_ARRAY <<< "$(printf '%s,' "$@" | sed 's/,$//')"
	# Reconstruct to ensure no trailing comma
	SPECS_COMMA_SEP=$(IFS=','; echo "${SPEC_ARRAY[*]}")
	SPECS_ARG="--spec ${SPECS_COMMA_SEP}"
fi

# Start static server in background
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1 &
SERVER_PID=$!

cleanup() {
	kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Running Cypress with base url ${BASE_URL} ${SPECS_ARG}" >&2

CYPRESS_BASE_URL=$BASE_URL npx --yes cypress run --config-file "$CONFIG_FILE" $SPECS_ARG || true

# Cleanup handled by trap