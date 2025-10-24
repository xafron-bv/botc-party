#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./test-parallel.sh                # run full Cypress suite in parallel (4 shards)
#   ./test-parallel.sh 2              # run with 2 shards
#   ./test-parallel.sh tests/05_*.cy.js tests/10_*.cy.js  # run specific specs
#
# Uses the same sharding logic as CI: distributes tests across N parallel shards
# and runs them. Each shard outputs to a separate log file.

OUTPUT_DIR=".test-output"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RUN_DIR="${OUTPUT_DIR}/${TIMESTAMP}"

# Determine number of shards: first arg if numeric, else 4 (balanced for local)
# CI uses 6 shards but local machines may struggle with that many parallel Cypress instances
SHARD_TOTAL=4
if [[ "$#" -gt 0 ]] && [[ "$1" =~ ^[0-9]+$ ]]; then
	SHARD_TOTAL=$1
	shift
fi

# Create output directory
mkdir -p "$RUN_DIR"

# Collect spec files
if [ "$#" -gt 0 ]; then
	# Use provided spec files/patterns
	ALL_SPECS=()
	for pattern in "$@"; do
		if [[ -f "$pattern" ]]; then
			ALL_SPECS+=("$pattern")
		else
			# Expand glob pattern
			for file in $pattern; do
				if [[ -f "$file" ]]; then
					ALL_SPECS+=("$file")
				fi
			done
		fi
	done
else
	# Find all test files (same as CI)
	ALL_SPECS=()
	while IFS= read -r file; do
		ALL_SPECS+=("$file")
	done < <(find tests -maxdepth 1 -type f -name '*.cy.js' | sort)
fi

if [ "${#ALL_SPECS[@]}" -eq 0 ]; then
	echo "Error: No test files found" >&2
	exit 1
fi

echo "Found ${#ALL_SPECS[@]} test files, splitting into ${SHARD_TOTAL} shards"
echo "Output directory: ${RUN_DIR}"
echo ""

# Start a single shared static server for all shards
echo "Starting shared server on port 5173..."
npx --yes http-server -p 5173 -c- . > /dev/null 2>&1 &
SERVER_PID=$!

cleanup() {
	echo ""
	echo "Stopping server..."
	# Kill the server process group to ensure all child processes are terminated
	if [ -n "${SERVER_PID:-}" ]; then
		kill -TERM -"$SERVER_PID" 2>/dev/null || kill "$SERVER_PID" 2>/dev/null || true
		# Wait briefly for graceful shutdown
		sleep 1
		# Force kill if still running
		kill -9 -"$SERVER_PID" 2>/dev/null || kill -9 "$SERVER_PID" 2>/dev/null || true
	fi
	# Also kill any lingering http-server or node processes on port 5173
	lsof -ti:5173 | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for server to be ready
sleep 2

# Run shards in parallel (fail-fast: false, like CI)
echo "Running ${SHARD_TOTAL} shards in parallel..."
FAILED=0
PIDS=()

for shard in $(seq 1 "$SHARD_TOTAL"); do
	(
		# Assign specs by modulo to balance roughly evenly (same as CI)
		SPECS=()
		for i in "${!ALL_SPECS[@]}"; do
			idx=$(( i % SHARD_TOTAL + 1 ))
			if [ "$idx" -eq "$shard" ]; then
				SPECS+=("${ALL_SPECS[$i]}")
			fi
		done
		
		if [ ${#SPECS[@]} -eq 0 ]; then
			echo "Shard ${shard}/${SHARD_TOTAL}: No specs assigned"
			exit 0
		fi
		
		echo "Shard ${shard}/${SHARD_TOTAL}: ${#SPECS[@]} specs - ${SPECS[*]}"
		
		# Join specs with commas for Cypress --spec argument
		specs_comma_sep=$(IFS=','; echo "${SPECS[*]}")
		
		# Run Cypress directly (not via ./test.sh to avoid starting multiple servers)
		log_file="${RUN_DIR}/shard-${shard}.log"
		
		# Cypress bundled Electron fails to launch if ELECTRON_RUN_AS_NODE is set.
		if [[ -n ${ELECTRON_RUN_AS_NODE-} ]]; then
			unset ELECTRON_RUN_AS_NODE
		fi
		
		# Give each shard its own npx cache to avoid ENOTEMPTY/rename races when unpacking Cypress concurrently
		NPX_CACHE_DIR="$(mktemp -d "${RUN_DIR}/npx-cache-shard-${shard}.XXXXXX")"
		trap 'rm -rf "$NPX_CACHE_DIR"' EXIT
		export NPX_CACHE_DIR
		export npm_config_cache="$NPX_CACHE_DIR"

		if CYPRESS_BASE_URL="http://127.0.0.1:5173" \
			npx --yes cypress run \
			--browser electron \
			--config-file tests/cypress.config.js \
			--spec "$specs_comma_sep" \
			> "$log_file" 2>&1; then
			echo "✓ Shard ${shard}/${SHARD_TOTAL} passed"
			exit 0
		else
			echo "✗ Shard ${shard}/${SHARD_TOTAL} failed (see ${log_file})"
			exit 1
		fi
	) &
	PIDS+=($!)
done

# Wait for all background jobs
for pid in "${PIDS[@]}"; do
	if ! wait "$pid" 2>/dev/null; then
		FAILED=1
	fi
done

EXIT_CODE=$FAILED

echo ""
echo "================================================================"
if [ $EXIT_CODE -eq 0 ]; then
	echo "✔ All shards passed!"
	echo "Logs saved to: ${RUN_DIR}"
else
	echo "✗ Some shards failed"
	echo "Check logs in: ${RUN_DIR}"
	echo ""
	echo "Failed shards:"
	for log in "${RUN_DIR}"/shard-*.log; do
		if grep -q "failing" "$log" 2>/dev/null; then
			basename "$log"
		fi
	done
fi
echo "================================================================"

# Explicitly call cleanup before exit to ensure server is stopped
cleanup

exit $EXIT_CODE
