#!/bin/bash
# Draws the sticker-style SVGs (camp stickers, treasures and the drill) with
# the Quiver SVG API.
#
#   QUIVER_API_KEY=... scripts/generate-stickers.sh [out_dir]
#   python3 scripts/clean-stickers.py [out_dir]
#
# Raw SVGs (and Quiver's JSON responses, with token usage) go to out_dir
# (default: stickers-raw/). Files that already exist there are skipped, so
# rerunning only retries failures. Delete a file to redo it. The clean step
# removes Quiver's leftovers and copies the results into public/art/stickers.
# Needs curl and jq.
set -u
cd "$(dirname "$0")/.."

OUT="${1:-stickers-raw}"
: "${QUIVER_API_KEY:?Set QUIVER_API_KEY}"
MODEL="${QUIVER_MODEL:-arrow-2}"
mkdir -p "$OUT"

INSTR="Children's sticker illustration for a kids' game. Flat vector cartoon with simple rounded shapes, a bold dark navy outline of even weight, and a thick white die-cut sticker border around the whole silhouette. Bright, warm, friendly colours with one or two simple highlight shapes. Single centred object filling most of the canvas. Transparent background: no background rectangle, no ground, no shadow, no text. Keep the SVG compact: plain paths and basic shapes, no filters, no gradients, no embedded images."

# svg <name> <prompt>
svg() {
  local name="$1" prompt="$2"
  [ -s "$OUT/$name.svg" ] && return
  jq -n --arg m "$MODEL" --arg p "$prompt" --arg i "$INSTR" \
    '{model:$m,prompt:$p,instructions:$i,n:1,max_output_tokens:8000,attributes:{viewBox:{minX:0,minY:0,width:256,height:256}}}' |
    curl -s -X POST https://api.quiver.ai/v1/svgs/generations \
      -H "Authorization: Bearer $QUIVER_API_KEY" -H 'Content-Type: application/json' \
      -d @- -o "$OUT/$name.json" --max-time 600
  if jq -e '.data[0].svg' "$OUT/$name.json" >/dev/null 2>&1; then
    jq -r '.data[0].svg' "$OUT/$name.json" > "$OUT/$name.svg"
    echo "ok $name $(jq -c '.usage' "$OUT/$name.json")"
  else
    echo "FAIL $name: $(head -c 400 "$OUT/$name.json")"
  fi
}

# Camp stickers (four at a time)
svg lantern "A glowing camping lantern with a warm yellow light" &
svg starlights "A string of glowing yellow star-shaped fairy lights hanging in a curve between two short wooden poles" &
svg fern "A leafy green fern growing in a small clay pot" &
svg cherrytree "A small cherry blossom tree with a round pink crown" &
wait
svg snail "A cute smiling snail with a spiral teal shell" &
svg fox "A cute friendly orange fox cub sitting down, big eyes, fluffy tail" &
svg campfire "A cosy campfire with orange flames on crossed logs ringed by small stones" &
svg cabin "A tiny cosy log cabin with a red roof, a round window and a little chimney" &
wait
svg crystals "A cluster of three shiny crystals, teal, purple and pink, on a small rock" &
svg flag "A triangular adventure flag on a wooden pole, teal flag with a yellow star on it" &
svg rainbow "A cheerful rainbow arch with a small fluffy white cloud at each end" &
svg chest "A closed wooden treasure chest with gold trim and a gold lock, with three big colourful gems sitting on top of the lid" &
wait

# Treasures and the drill (five at a time)
svg coal "A shiny black lump of coal" &
svg copper "A chunk of rock with bright orange copper ore streaks" &
svg iron "A chunk of grey rock with rusty red iron ore patches" &
svg quartz "A clear white quartz crystal point" &
svg gold "A shiny gold nugget with sparkles" &
wait
svg fossil "A spiral ammonite shell fossil in a round stone" &
svg bone "A big cartoon dinosaur bone" &
svg emerald "A bright green cut emerald gemstone" &
svg wood "A piece of petrified wood log showing colourful stone tree rings" &
svg ruby "A bright red cut ruby gemstone" &
wait
svg trilobite "A trilobite fossil in a flat stone slab" &
svg diamond "A sparkling pale blue cut diamond" &
svg skull "A friendly cartoon T-rex dinosaur skull fossil" &
svg coin "An ancient gold coin with a simple sun symbol stamped on it" &
svg vase "An ancient clay vase (amphora) with two handles and painted zigzag bands" &
wait
svg necklace "An ancient gold necklace with turquoise beads and a red jewel pendant" &
svg mask "An ancient golden ceremonial mask with turquoise inlay, friendly face" &
svg drill "A chunky handheld mining drill machine with a big spiral cone drill bit, yellow body, teal handle" &
wait
echo "Done. Raw SVGs are in $OUT/. Next: python3 scripts/clean-stickers.py $OUT"
