# Gem Mine

A gentle, illustrated typing adventure for a young learner. Mine letters and school words, discover caves, collect tools, and decorate a base. No accounts, tracking, backend, or time pressure.

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

Browser tests use an installed Google Chrome and start the local Vite server automatically. They cover complete sessions, focus, reloads, backups, purchases, unavailable storage, responsive layout, and axe accessibility checks. Set `GEM_MINE_BASE_URL` to test an already-running static production server instead.

## Publish on GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. The included **Deploy Gem Mine to Pages** workflow tests, builds, and deploys `dist`. Run it manually from Actions if the first push happened before Pages was enabled.
4. Open the deployment URL in the workflow. Assets use relative paths, so repository subpaths work. All screens are local application state; no server routing configuration is required.

This project is prepared for deployment but does not create a repository or publish itself locally.

## Playing

- **Key Quarry:** guided home-row, upper-row, lower-row, apostrophe, number-row, and punctuation lessons with a full US QWERTY keyboard guide. F and J are the home-position anchors. Lessons are selectable; no proficiency claims or forced gates.
- **Word Mine:** visible school words with a letter-by-letter keyboard guide.
- **Treasure Challenge:** listen and spell; use **Hear word** for each prompt. Browser speech depends on installed voices. Reveal gives visible practice when audio is unavailable. Reveals or incorrect submissions prevent that word from counting as unaided spelling success.
- Each expedition has 10 prompts. Letter rocks award 1 ore; words award 5. Every expedition gives 1 gem. Tools are cosmetic and cannot bypass practice.
- Typing is captured only in the focused mining region. Tab navigates controls and Escape pauses letter/word practice. Switching screens or hiding the browser pauses typing. Repeated keydown events are ignored.
- Lists retain original capitalization but input is case-insensitive. Apostrophes are required; curly apostrophes are normalized.
- Missed letters and words receive extra selection weight. Word selection avoids repeats within the pool until every item has been selected.

## Finger school

Open **Finger school** in the main navigation or choose **Where do my fingers go?** above the mining keyboard. Five lessons cover F/J anchors, all eight home-row fingers plus Space, reaching to other rows, numbers, and punctuation. The animated hands show the learner’s view. Read the key letters through the translucent hands and follow the gold fingertip to the highlighted key. Choose **Full keyboard** to see the function row, navigation keys, and number pad.

**Watch** demonstrates a slow reach, press, and return. Play/pause and next-key controls are keyboard accessible; demonstrations stop when the window loses focus or the page is hidden. **Your turn** checks a physical key press, then asks the learner to return home before moving on. Wrong keys and held repeats do not advance. The app cannot detect which finger physically touched the key, so a grown-up can help check that part.

Completed lessons and the next practice step save locally and in backups without awarding mining currency or changing an active expedition. Earlier v1 saves remain supported. System and in-game reduced-motion settings remove finger travel while retaining the highlighted position and text instructions.

## Progress and backups

Progress auto-saves under `gem-mine:progress:v1` in this browser’s local storage, including the current expedition. It belongs to the site origin (protocol, hostname, port); localhost and GitHub Pages have separate saves. Avoid hosting unrelated Gem Mine copies on the same origin if they need separate progress.

In **Grown-up corner**, choose **Export progress** to download a versioned JSON backup. On another device, use **Import progress**, inspect its summary, optionally export the current save, and confirm replacement. Imports are limited to 2 MB and validated before changing state. Keep backups before clearing browser data or moving domains.

If storage is blocked or full, the game continues in memory and shows a warning; export before leaving. If an existing save is corrupt, it is left untouched. Download the preserved original for recovery, then restore a valid backup or explicitly reset. Reset/import replaces the preserved save only after confirmation.

Use the parent paste box to add lists (1–100 words, letters/apostrophes, 32 characters maximum). These lists are local and included in backups. The game comes with eight sample weekly lists.

## Technical notes

React + TypeScript + Vite. `src/game.ts` is the pure reducer, `src/curriculum.ts` contains stable content IDs, `src/persistence.ts` validates and transfers state, and `src/audio.ts` provides optional effects and speech. Painted cave, campsite, miner, and rock artwork ships in `public/art`. SVG supplies the animated hands, keyboard, tools, and hit effects. The UI uses Lucide icons. Google Fonts supplies DM Sans and Manrope when available, with system sans-serif fallbacks. No runtime API keys are needed. The site needs an initial network load; an offline service worker is not included.

`ProgressV1` is the local state shape; `BackupV1` wraps it with format/version/export time. Unsupported versions are rejected rather than guessing a migration. Future versions should add explicit migrations and retain stable list/item IDs.

Accessibility includes native controls, labeled input, visible focus, native modal dialogs, text feedback, sound toggles, and system/user reduced motion. Typing accuracy measures Key Quarry/Word Mine physical-key attempts; spelling success is separate. A parent area is organizational, not an authentication barrier.
