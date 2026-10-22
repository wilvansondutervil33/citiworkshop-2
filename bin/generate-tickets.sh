#!/usr/bin/env bash
# Script: Sample Ticket Generator
# Purpose: Add realistic sample tickets to the AWS database, or remove them again
# Usage: ./generate-tickets.sh [count] [days]   |   ./generate-tickets.sh --remove
# Default: 1000 tickets created over the last 90 days
#
# Runs inside the deployed backend Lambda, because the database isn't reachable from outside AWS.
# Generated tickets end with "(sample data)" in their description; --remove deletes only those.

set -e

if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [count] [days]"
    echo "       $0 --remove"
    echo ""
    echo "  count           Number of tickets to add (default: 1000)"
    echo "  days            Spread creation dates over this many past days (default: 90)"
    echo "  --remove        Delete every generated ticket and its notes"
    exit 0
fi

echo "===================================="
echo "Coding Workshop - Sample Tickets"
echo "===================================="
echo ""

export PATH="$HOME/.local/bin:$PATH"
export AWS_REGION=${AWS_REGION:-us-east-1}

aws --version > /dev/null 2>&1 || { echo "ERROR: 'aws' is missing. Aborting..."; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" > /dev/null 2>&1 || exit 1; pwd -P)"
PROJECT_ROOT="$(cd $SCRIPT_DIR/.. > /dev/null 2>&1 || exit 1; pwd -P)"
ENVIRONMENT_CONFIG="$PROJECT_ROOT/ENVIRONMENT.config"

if [ "$1" = "--remove" ]; then
    PAYLOAD='{"task": "remove-generated"}'
else
    COUNT=${1:-1000}
    DAYS=${2:-90}
    [[ "$COUNT" =~ ^[0-9]+$ && "$DAYS" =~ ^[0-9]+$ ]] || { echo "ERROR: count and days must be whole numbers"; exit 1; }
    PAYLOAD="{\"task\": \"generate-tickets\", \"count\": $COUNT, \"days\": $DAYS}"
fi

$SCRIPT_DIR/setup-participant.sh
if [ -f "$ENVIRONMENT_CONFIG" ]; then
    source $ENVIRONMENT_CONFIG
else
    echo "ERROR: $ENVIRONMENT_CONFIG is missing. Run ./bin/setup-participant.sh first."
    exit 1
fi

FUNCTION_NAME="coding-workshop-facilities-${PARTICIPANT_ID}"
OUTPUT_FILE="$(mktemp)"
trap 'rm -f "$OUTPUT_FILE"' EXIT

echo "INFO: Invoking $FUNCTION_NAME in $AWS_REGION with $PAYLOAD ..."
aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload "$PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    --cli-read-timeout 300 \
    "$OUTPUT_FILE" > /dev/null

if grep -q '"errorMessage"\|"error"' "$OUTPUT_FILE"; then
    echo "ERROR: Task failed:"
    cat "$OUTPUT_FILE"; echo ""
    echo "INFO: See the logs with: aws logs tail /aws/lambda/$FUNCTION_NAME --since 10m"
    exit 1
fi

echo "INFO: Result: $(cat "$OUTPUT_FILE")"
echo "INFO: Done!"
