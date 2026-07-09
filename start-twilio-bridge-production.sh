#!/usr/bin/env bash
set -e
set -a
. /home/anino-site/.env
set +a
export TWILIO_PUBLIC_BASE_URL="https://anino-ai.com"
export TWILIO_BRIDGE_PORT="3008"
exec node /home/anino-site/twilio-bridge.cjs
