#!/usr/bin/env bash
# Stoockroom — pull the latest changes from GitHub and restart the app
# Usage:  bash update.sh [port]
set -e
cd "$(dirname "$0")"

BRANCH="arena/20252ded-stoockroom"
PORT="${1:-5173}"

if ! command -v git >/dev/null 2>&1; then
  echo "Git نه دی نصب شوی. https://git-scm.com/downloads"
  exit 1
fi

echo "→ له GitHub نه بدلونونه راوړل…"
git pull --ff-only origin "$BRANCH"

echo "→ اپ بیا چالانول…"
exec bash start.sh "$PORT"
