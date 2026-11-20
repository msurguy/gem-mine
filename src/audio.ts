let context: AudioContext | undefined;
export const canSpeak = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;
let clip: HTMLAudioElement | undefined;
/** File name of a word's recorded clip: "I'll" becomes "i_ll". */
export const clipName = (word: string) =>
  word.toLowerCase().replace(/[^a-z0-9]/g, "_");
export function stopSpeech() {
  clip?.pause();
  clip = undefined;
  if (canSpeak()) window.speechSynthesis.cancel();
}
/**
 * Says a word with its recorded clip from public/audio/words (made by
 * scripts/generate-word-audio.mjs). Words without a clip, such as a
 * grown-up's own list, use the browser's voice.
 */
export function say(word: string, onError?: () => void) {
  stopSpeech();
  if (typeof Audio === "undefined") return speak(word, onError);
  const audio = new Audio(`./audio/words/${clipName(word)}.mp3`);
  clip = audio;
  const fallback = () => {
    if (clip !== audio) return;
    clip = undefined;
    speak(word, onError);
  };
  audio.onerror = fallback;
  audio.play().catch(fallback);
}
function speak(word: string, onError?: () => void) {
  if (!canSpeak()) {
    onError?.();
    return;
  }
  try {
    stopSpeech();
    const speech = new SpeechSynthesisUtterance(word);
    speech.lang = "en-US";
    speech.rate = 0.75;
    speech.onerror = () => onError?.();
    window.speechSynthesis.speak(speech);
  } catch {
    onError?.();
  }
}
/**
 * A sound is one or more clips from public/audio/sfx (from SFX Kit, CC0).
 * `delay` is in seconds; `vary` nudges the pitch so repeated sounds don't drone.
 */
type Layer = { file: string; gain?: number; delay?: number; vary?: boolean };
const sounds = {
  // Typing
  hit: [{ file: "impact-light-hard", gain: 0.55, vary: true }],
  miss: [{ file: "notification-failure-pluck", gain: 0.6 }],
  rock: [{ file: "appear-burst", gain: 0.6 }],
  letter: [{ file: "keyboard-letter-soft", gain: 0.7, vary: true }],
  erase: [{ file: "keyboard-space-soft", gain: 0.6 }],
  "wrong-word": [{ file: "notification-failure-wobble", gain: 0.7 }],
  hint: [{ file: "appear-flip-quick", gain: 0.8 }],
  "new-key-1": [{ file: "tone-step-1" }],
  "new-key-2": [{ file: "tone-step-2" }],
  "new-key-3": [{ file: "tone-step-3" }],
  "new-key-4": [{ file: "tone-step-4" }],
  "new-key-5": [{ file: "tone-step-5" }],
  // The level's last rock bursts first, then the sting.
  win: [{ file: "sting-playful-short", gain: 0.8, delay: 0.3 }],
  "win-perfect": [
    { file: "sting-playful-short", gain: 0.8, delay: 0.3 },
    { file: "celebration-confetti", gain: 0.6, delay: 0.8 },
  ],
  "drill-ready": [{ file: "digital-power-up", gain: 0.6, delay: 1.6 }],
  // Digging
  crack: [{ file: "impact-medium-hard", gain: 0.7, vary: true }],
  "dig-earth": [{ file: "impact-medium-soft", gain: 0.9, vary: true }],
  "dig-stone": [{ file: "impact-heavy-hard", gain: 0.7, vary: true }],
  drill: [{ file: "mechanical-ratchet-heavy", gain: 0.8 }],
  "find-common": [{ file: "shimmer-short-soft", gain: 0.7 }],
  "find-gem": [{ file: "shimmer-short-sparkle", gain: 0.6 }],
  "find-coin": [{ file: "money-coin-drop", gain: 0.8 }],
  "find-ancient": [{ file: "shimmer-medium-bright", gain: 0.6 }],
  "find-new": [{ file: "notification-success-sparkle", gain: 0.7, delay: 0.2 }],
  "find-new-ancient": [{ file: "sting-bright-short", gain: 0.7, delay: 0.15 }],
  "too-hard": [{ file: "notification-failure-thud", gain: 0.8 }],
  "no-energy": [{ file: "digital-power-down", gain: 0.6 }],
  // Shopping and menus
  buy: [{ file: "money-register", gain: 0.6 }],
  "buy-sticker": [
    { file: "money-register", gain: 0.6 },
    { file: "pop-large-in", gain: 0.8, delay: 0.35 },
  ],
  equip: [{ file: "click-latch-firm", gain: 0.8 }],
  "sound-on": [{ file: "click-toggle-on-medium" }],
  "sound-off": [{ file: "click-toggle-off-medium" }],
  "map-slide": [{ file: "whoosh-medium-soft", gain: 0.5 }],
  "page-turn": [{ file: "props-page-turn", gain: 0.8 }],
} satisfies Record<string, Layer[]>;
export type Sfx = keyof typeof sounds;
/** Overall loudness, under the recorded words. */
const MASTER = 0.6;
/** A sound that takes longer than this to load is skipped, not played late. */
const STALE_MS = 400;

const buffers = new Map<string, Promise<AudioBuffer | null>>();
function audioContext() {
  context ??= new AudioContext();
  return context;
}
function load(file: string) {
  let buffer = buffers.get(file);
  if (!buffer) {
    buffer = fetch(`./audio/sfx/${file}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((data) => audioContext().decodeAudioData(data))
      .catch(() => null);
    buffers.set(file, buffer);
  }
  return buffer;
}
/** Fetch and decode every sound, so the first ones play on time. */
export function preloadSfx() {
  try {
    for (const layers of Object.values(sounds))
      for (const { file } of layers) void load(file);
  } catch {
    /* No Web Audio: the game stays silent. */
  }
}
export function sfx(kind: Sfx) {
  try {
    const ctx = audioContext(),
      asked = performance.now();
    void ctx.resume();
    for (const layer of sounds[kind] as Layer[])
      void load(layer.file).then((buffer) => {
        const late = performance.now() - asked;
        if (!buffer || late > STALE_MS) return;
        const source = ctx.createBufferSource(),
          gain = ctx.createGain();
        source.buffer = buffer;
        if (layer.vary) source.playbackRate.value = 0.94 + Math.random() * 0.12;
        gain.gain.value = (layer.gain ?? 1) * MASTER;
        source.connect(gain).connect(ctx.destination);
        source.start(
          ctx.currentTime + Math.max(0, (layer.delay ?? 0) - late / 1000),
        );
      });
  } catch {
    /* Visual feedback remains available. */
  }
}
