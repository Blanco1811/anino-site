#!/usr/bin/env bash
set -u

cd /home/anino-site || exit 1

set -a
. ./.env
set +a

while true; do
  curl --silent --show-error --fail \
    --max-time 15 \
    -X POST \
    -H "X-Anino-Reconcile-Secret: ${TWILIO_RECONCILE_SECRET}" \
    http://127.0.0.1:3003/api/internal/twilio/reconcile \
    > /tmp/anino-twilio-billing-worker.last.json \
    || echo "$(date -Is) worker request failed" >&2

  sleep 10
done
