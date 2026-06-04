#!/usr/bin/env bash
# Optional art upgrade. agent-quest ships with built-in procedural pixel art
# and works without any downloads. To use the high-quality Tiny Swords pack:
#
#   Tiny Swords by Pixel Frog — free, commercial use OK, but the asset files
#   themselves may NOT be redistributed, so they are gitignored and must be
#   downloaded by each user.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/assets/sprites" "$ROOT/assets/tiles"

cat <<'EOF'
agent-quest asset setup
=======================

Built-in pixel art is already active; nothing below is required.

Optional: Tiny Swords (recommended upgrade)
  1. Visit https://pixelfrog-assets.itch.io/tiny-swords
  2. Download the pack (free; consider donating)
  3. Unzip into assets/sprites/tiny-swords/

Optional: CC0 terrain tiles
  1. Visit https://opengameart.org/content/16x16-rpg-tileset
  2. Download and unzip into assets/tiles/

Then restart agent-quest. Sprite atlas mapping lives in assets/atlas/.
EOF
