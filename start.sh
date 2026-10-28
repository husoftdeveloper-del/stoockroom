#!/usr/bin/env bash
# Stoockroom — run locally and install as an app
# macOS / Linux:  bash start.sh   (or: ./start.sh)
set -e
cd "$(dirname "$0")"

PORT="${1:-5173}"

if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "Python نه دی نصب شوی. لومړی Python 3 نصب کړه: https://www.python.org/downloads/"
  exit 1
fi

URL="http://localhost:$PORT"
echo ""
echo "  Stoockroom  →  $URL"
echo "  د اپ نصبولو لپاره: د براوزر په آدرس پټۍ کې د نصب آیکون، یا پاڼې پورتنۍ ښي خوا 'Install app' تڼۍ."
echo "  بندولو لپاره: Ctrl + C"
echo ""

# open the browser once the server is up
( sleep 1.5
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then open "$URL" >/dev/null 2>&1 || true
  fi
) &

exec "$PY" serve.py "$PORT"
