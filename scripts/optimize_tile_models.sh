#!/usr/bin/env bash
# Allège les GLB bruts de generate_tile_models.py pour le jeu (24 cases, mobile compris) :
# environ 6 000 triangles visés, texture WebP 512 px, compression meshopt (décodée par useGLTF sans fichier externe).
set -euo pipefail

WORK="${1:-/tmp/tilegen}"
OUT="public/assets/models"
mkdir -p "$OUT"

for raw in "$WORK"/raw_*.glb; do
  theme="$(basename "$raw" .glb)"
  theme="${theme#raw_}"
  npx -y @gltf-transform/cli@4 optimize "$raw" "$OUT/tile_$theme.glb" \
    --compress meshopt \
    --simplify-ratio 0.15 \
    --simplify-error 0.01 \
    --texture-compress webp \
    --texture-size 512
done
ls -la "$OUT"
