#!/usr/bin/env bash
# Script: Database Initialization
# Purpose: Create the tables and load the demo data in the AWS database
# Usage: ./init-database.sh [service]
# Default service: facilities
#
# The Aurora database is only reachable from inside AWS, so this asks the deployed
# backend Lambda to do it ({"task": "init-db"}). Safe to run more than once: it never
# re-seeds a database that already has users.

set -e

if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [service]"
    echo "Create tables and load demo data in the AWS database through the backend Lambda"
    echo ""
    echo "Arguments:"
    echo "  service         Backend service folder name (default: facilities)"
    echo ""
    echo "Requirements:"
    echo "  - aws CLI installed"
    echo "  - ./bin/deploy-backend.sh has run successfully"
    exit 0
fi

echo "===================================="
echo "Coding Workshop - Database Setup"
echo "===================================="
echo ""

export PATH="$HOME/.local/bin:$PATH"
export AWS_REGION=${AWS_REGION:-us-east-1}

aws --version > /dev/null 2>&1 || { echo "ERROR: 'aws' is missing. Aborting..."; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" > /dev/null 2>&1 || exit 1; pwd -P)"
PROJECT_ROOT="$(cd $SCRIPT_DIR/.. > /dev/null 2>&1 || exit 1; pwd -P)"
ENVIRONMENT_CONFIG="$PROJECT_ROOT/ENVIRONMENT.config"
SERVICE=${1:-"facilities"}

# Refresh temporary credentials and load participant configuration
$SCRIPT_DIR/setup-participant.sh
if [ -f "$ENVIRONMENT_CONFIG" ]; then
    source $ENVIRONMENT_CONFIG
else
    echo "ERROR: $ENVIRONMENT_CONFIG is missing. Run ./bin/setup-participant.sh first."
    exit 1
fi

FUNCTION_NAME="coding-workshop-${SERVICE}-${PARTICIPANT_ID}"
OUTPUT_FILE="$(mktemp)"
trap 'rm -f "$OUTPUT_FILE"' EXIT

echo "INFO: Invoking $FUNCTION_NAME in $AWS_REGION (the first run can take a minute while the database starts)..."
aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload '{"task": "init-db"}' \
    --cli-binary-format raw-in-base64-out \
    --cli-read-timeout 300 \
    "$OUTPUT_FILE" > /dev/null

if grep -q '"errorMessage"' "$OUTPUT_FILE"; then
    echo "ERROR: Database setup failed:"
    cat "$OUTPUT_FILE"; echo ""
    echo "INFO: See the logs with: aws logs tail /aws/lambda/$FUNCTION_NAME --since 10m"
    exit 1
fi

echo "INFO: Result: $(cat "$OUTPUT_FILE")"
echo "INFO: Database setup complete!"
