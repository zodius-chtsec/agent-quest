#!/usr/bin/env bash
# Optional art upgrade. agent-quest ships with built-in procedural pixel art
# and works without any downloads. This script installs the Tiny Swords
# free pack (hero skins) from a zip you download yourself:
#
#   Tiny Swords by Pixel Frog — free, commercial use OK, but the asset files
#   may NOT be redistributed, so they are gitignored and downloaded per-user.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/assets/sprites/tiny-swords"
ZIP="${1:-$HOME/Downloads/Tiny Swords (Free Pack).zip}"

mkdir -p "$DEST" "$ROOT/assets/tiles"

if [ ! -f "$ZIP" ]; then
  cat <<EOF
Tiny Swords zip not found at: $ZIP

  1. Visit https://pixelfrog-assets.itch.io/tiny-swords
  2. Download the free pack (consider donating)
  3. Re-run: ./scripts/fetch-assets.sh [path-to-zip]

agent-quest keeps working with its built-in pixel art in the meantime.
EOF
  exit 1
fi

unzip -oq "$ZIP" -d "$DEST"
rm -rf "$DEST/__MACOSX"
if [ -d "$DEST/Tiny Swords (Free Pack)" ]; then
  rm -rf "$DEST/free-pack"
  mv "$DEST/Tiny Swords (Free Pack)" "$DEST/free-pack"
fi

if [ -f "$DEST/free-pack/Units/Blue Units/Warrior/Warrior_Idle.png" ]; then
  echo "Tiny Swords installed to assets/sprites/tiny-swords/free-pack"
  echo "Hero skin atlases in assets/atlas/ will be picked up on next launch."
else
  echo "warning: unexpected zip layout; hero skins may not load." >&2
  exit 1
fi
