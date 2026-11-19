# Gem Mine

A gentle, illustrated typing adventure for a young learner. Follow a map of short key lessons, type school words, dig for treasure, and decorate a camp. No accounts, tracking, backend, or time pressure.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Open the local URL shown by Vite. To check the project:

```sh
npm run typecheck
npm test
npm run build
npm run preview
npm run test:e2e
```

Browser tests use an installed Google Chrome and start the local Vite server automatically. They cover complete levels, spelling, digging, the drill, purchases, reloads, backups, old and broken saves, small screens, and axe accessibility checks. Set `GEM_MINE_BASE_URL` to test an already-running static production server instead.

## Publish on GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. The included **Deploy Gem Mine to Pages** workflow tests, builds, and deploys `dist`. Run it manually from Actions if the first push happened before Pages was enabled.
4. Open the deployment URL in the workflow. Assets use relative paths, so repository subpaths work. All screens are local application state; no server routing configuration is required.

This project is prepared for deployment but does not create a repository or publish itself locally.

## Playing

Everything a child needs is one click (or one press of Enter) from the map.

- **Map:** four caves, each a trail of short levels. Mossy Hollow teaches the home keys two at a time (F J, D K, S L, A ;, G H), Crystal Cavern the top row, Amber Grotto the bottom row, Moonstone Deep numbers and apostrophes. Each cave ends with a level of real words made from the keys learned so far. A level opens when the one before it is finished; **Grown-ups → Open every level** removes that gate.
- **A level:** ten rocks. A level that teaches new keys first introduces each one with the animated hands. Typing works anywhere on the screen with no need to click or focus anything; Escape goes back to the map and the level is kept for later. Wrong keys flash on the keyboard and are never punished beyond the star count.
- **Stars:** every finished level earns one to three stars for accuracy (90% for three, 70% for two). The best result is kept.
- **My school words:** pick a week, then **Type the words** (the word is shown) or **Listen and spell** (the word is spoken; **Show me** reveals it, and two misses reveal it automatically). Built-in words and the 1,284 common elementary spelling words in `scripts/spelling-words.txt` use recorded clips in `public/audio/words`; after adding words to either, run `OPENAI_API_KEY=... node scripts/generate-word-audio.mjs` to record the new ones (needs ffmpeg). Any other word a grown-up adds uses browser speech, which depends on installed voices.
- **Dig:** walk with the arrow keys and dig with Space. Each swing uses one dig power; every typed rock earns two more. The dig has eight depth levels with different treasure in each: ores near the top, gold, dinosaur bones and fossils from level 3, gems and petrified wood below, and ancient coins, vases, necklaces and a golden mask at the bottom. Levels 5 to 8 are hard rock that only a powered drill can cut.
- **Toolshed:** the drill costs 100 gems and is powered by finishing 10 typing levels. Pickaxes are cosmetic. **My finds** shows every treasure dug up so far.
- **My camp:** spend gems on stickers for the camp picture.
- **Gems:** one per rock, two per star, plus the value of each treasure found.

Lists retain original capitalization but input is case-insensitive. Apostrophes are required; curly apostrophes are normalized. Missed words receive extra selection weight.

The numbers that tune the game are constants at the top of `src/dig.ts` (drill cost, levels to power it, dig power, treasure chances) and `src/game.ts` (gems per rock and per star).

## Progress and backups

Progress auto-saves under `gem-mine:progress:v2` in this browser’s local storage, including the current expedition. It belongs to the site origin (protocol, hostname, port); localhost and GitHub Pages have separate saves. Avoid hosting unrelated Gem Mine copies on the same origin if they need separate progress.

In **Grown-ups**, choose **Export progress** to download a versioned JSON backup. On another device, use **Import progress**, inspect its summary, optionally export the current save, and confirm replacement. Imports are limited to 2 MB and validated before changing state. Keep backups before clearing browser data or moving domains.

If storage is blocked or full, the game continues in memory and shows a warning; export before leaving. If an existing save is corrupt, it is left untouched. Download the preserved original for recovery, then restore a valid backup or explicitly reset. Reset/import replaces the preserved save only after confirmation.

Use **Grown-ups → Add a week of words** to add lists (1–100 words, letters/apostrophes, 32 characters maximum). These lists are local and included in backups. The game comes with eight sample weekly lists.

## Technical notes

React + TypeScript + Vite. `src/game.ts` is the pure reducer for typing, rewards and the shop; `src/dig.ts` is the pure logic for the dig; `src/curriculum.ts` holds caves, levels, word lists and shop items; `src/persistence.ts` validates and transfers state; `src/audio.ts` provides optional effects and speech. One file per screen: `MapScreen`, `PlayScreen`, `DigScreen`, `ShedScreen`, `CampScreen`, `GrownUps`.

Art ships in `public/art`: painted cave backgrounds and miner poses (generated with the OpenAI Images API from the original cave and miner as references), and sticker-style SVGs in `public/art/stickers` for camp items, treasures and the drill (generated with Quiver, then cleaned by hand). No API keys are needed to build or run the game. Google Fonts supplies Fredoka and Nunito when available, with system fallbacks. The site needs an initial network load; an offline service worker is not included.

`ProgressV2` is the saved state; `BackupV2` wraps it with format/version/export time. Saves and backups from the first version are migrated on load: ore and gems become one gem count, tools, camp items, word lists and practice history are kept, and every level is opened for a player who had already finished expeditions. The old `gem-mine:progress:v1` entry is left in place.

Accessibility includes native controls, a keyboard-only path through every screen, on-screen buttons for the dig, visible focus, text alternatives, sound toggles, and system/user reduced motion. Browser tests run axe on every screen. Typing accuracy measures key and word levels; spelling success is separate. The grown-ups page is organizational, not an authentication barrier.
