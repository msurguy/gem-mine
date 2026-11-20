#!/bin/bash
# Paints the cave backgrounds and the miner poses with the OpenAI Images API.
# Each image is an edit of an existing game image, so the style and the
# character stay consistent.
#
#   OPENAI_API_KEY=... scripts/generate-art.sh [out_dir] [--install]
#
# Raw results go to out_dir (default: art-raw/). Files that already exist there
# are skipped, so rerunning only retries failures. Delete a file to redo it.
# --install converts the results and copies them into public/art (needs cwebp).
# Needs curl, jq and base64; the drill poses also need `npx playwright` (a dev
# dependency) to turn the drill sticker into a PNG reference.
set -u
cd "$(dirname "$0")/.."

OUT="art-raw"
INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
    *) OUT="$arg" ;;
  esac
done
: "${OPENAI_API_KEY:?Set OPENAI_API_KEY}"
MODEL="${OPENAI_IMAGE_MODEL:-gpt-image-2.6-sunburst}"
ART=public/art
mkdir -p "$OUT"

# edit <name> <size> <format> <background> <prompt> <reference>...
edit() {
  local name="$1" size="$2" fmt="$3" bg="$4" prompt="$5"
  shift 5
  [ -s "$OUT/$name.$fmt" ] && return
  local refs=()
  for ref in "$@"; do
    # A .webp reference needs an explicit type or the API rejects it.
    refs+=(-F "image[]=@$ref;type=$(file -b --mime-type "$ref")")
  done
  curl -s -X POST https://api.openai.com/v1/images/edits \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -F "model=$MODEL" "${refs[@]}" \
    -F "size=$size" -F "quality=high" -F "output_format=$fmt" -F "background=$bg" \
    --form-string "prompt=$prompt" -o "$OUT/$name.json" --max-time 600
  if jq -e '.data[0].b64_json' "$OUT/$name.json" >/dev/null 2>&1; then
    jq -r '.data[0].b64_json' "$OUT/$name.json" | base64 --decode > "$OUT/$name.$fmt"
    rm "$OUT/$name.json"
    echo "ok $name"
  else
    echo "FAIL $name: $(head -c 400 "$OUT/$name.json")"
  fi
}

# --- Cave backgrounds, in the style of the original crystal grotto ---
BG="Paint a new background for the same children's game in exactly the same art style as the reference image (vibrant, hand-painted storybook game art, soft glow, rich saturated colours, same camera angle and same composition: framing rocks and features on the left and right edges, and a wide, calm, empty open cave floor in the centre and lower middle where game objects will be placed). No characters, no text, no UI, no pickaxe, no boulder in the centre."
edit bg-moss 1536x864 jpeg opaque "$BG The place: Mossy Hollow, a friendly green cave near the surface. Soft mossy rocks, ferns, curly roots, glowing mushrooms, small emerald-green crystals, warm sunbeams from an opening above, fireflies. Dominant colours emerald and leaf green with golden light." "$ART/crystal-grotto.jpg" &
edit bg-amber 1536x864 jpeg opaque "$BG The place: Amber Grotto, a warm cave full of golden light. Honey-coloured amber crystals, glowing orange and gold gems, hanging lanterns, warm sandstone rocks, little sparkles in the air. Dominant colours amber, orange and gold with deep brown shadows." "$ART/crystal-grotto.jpg" &
edit bg-moon 1536x864 jpeg opaque "$BG The place: Moonstone Deep, a magical deep cave at night. Pale glowing moonstone and opal crystals, silvery blue and soft pink shimmer, a still pool reflecting light, a gap in the ceiling showing a starry sky and a crescent moon. Dominant colours indigo, silver-blue and soft violet." "$ART/crystal-grotto.jpg" &

# --- Miner poses ---
# The first run used the original miner illustration as the reference. That
# file was replaced by miner-wave.webp, which is now the reference.
MINER="The same cartoon boy miner character from the reference image, identical face, freckles, curly brown hair, brass helmet with headlamp, teal jacket, satchel, blue trousers and brown boots, same hand-painted storybook style. Full body, centred, whole character visible with space around, transparent background, no ground shadow, no text."
REF="$ART/miner-wave.webp"
edit miner-cheer 1024x1536 png transparent "$MINER New pose: jumping for joy with both arms raised high in the air, huge happy open smile, eyes sparkling, celebrating a win." "$REF" &
edit miner-swing 1024x1536 png transparent "$MINER New pose: holding a small pickaxe in both hands raised over his shoulder, ready to swing at a rock to his right, body turned slightly to the right, determined cheerful smile." "$REF" &
edit miner-think 1024x1536 png transparent "$MINER New pose: encouraging and kind, giving a big thumbs up with one hand, other hand on his hip, gentle warm smile, looking at the viewer." "$REF" &
edit miner-wave 1024x1536 png transparent "$MINER Same friendly waving pose as the reference: one hand waving hello, other hand holding the satchel strap, happy open smile. Redraw at high resolution and crisp detail." "$REF" &
wait

# --- Miner with the drill: the miner plus the drill sticker as references ---
[ -s "$OUT/drill-ref.png" ] || node scripts/rasterize-svg.mjs "$ART/stickers/drill.svg" "$OUT/drill-ref.png"
DRILL="The same cartoon boy miner character from the first reference image, identical face, freckles, curly brown hair, brass helmet with headlamp, teal jacket, satchel, blue trousers and brown boots, in the same hand-painted storybook style. He is holding a chunky handheld mining drill painted in that same hand-painted style (not a flat sticker, no white outline): yellow body, teal handle, big grey spiral cone drill bit, like the second reference image. He grips it firmly with both hands and his face is fully visible, with a happy determined smile. Full body, whole character and whole drill visible with space around, transparent background, no ground, no shadow, no rock, no text."
edit miner-drill-side 1024x1024 png transparent "$DRILL Pose: side view, body facing right, holding the drill level at waist height with the drill bit pointing straight to the right, drilling sideways." "$REF" "$OUT/drill-ref.png" &
edit miner-drill-down 1024x1024 png transparent "$DRILL Pose: front three-quarter view, standing with feet apart, holding the drill vertically like a jackhammer with the drill bit pointing straight down below his feet level between his boots, drilling into the floor." "$REF" "$OUT/drill-ref.png" &
edit miner-drill-up 1024x1024 png transparent "$DRILL Pose: front three-quarter view, holding the drill raised above his head with both arms, the drill bit pointing straight up, drilling into the ceiling, looking up at it." "$REF" "$OUT/drill-ref.png" &
wait

if [ "$INSTALL" = 1 ]; then
  for name in moss amber moon; do
    [ -s "$OUT/bg-$name.jpeg" ] && cp "$OUT/bg-$name.jpeg" "$ART/bg-$name.jpg"
  done
  for pose in cheer swing think wave; do
    [ -s "$OUT/miner-$pose.png" ] && cwebp -quiet -q 88 -resize 0 640 "$OUT/miner-$pose.png" -o "$ART/miner-$pose.webp"
  done
  for dir in side down up; do
    [ -s "$OUT/miner-drill-$dir.png" ] && cwebp -quiet -q 88 -resize 0 560 "$OUT/miner-drill-$dir.png" -o "$ART/miner-drill-$dir.webp"
  done
  echo "Installed into $ART"
fi
echo "Done. Raw images are in $OUT/"
