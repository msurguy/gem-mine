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
type Sound = "hit" | "miss" | "complete" | "win" | "dig" | "find";
const tunes: Record<Sound, { notes: number[]; type: OscillatorType }> = {
  hit: { notes: [520], type: "sine" },
  miss: { notes: [170], type: "triangle" },
  complete: { notes: [523, 659, 784], type: "sine" },
  win: { notes: [523, 659, 784, 1047, 1319], type: "triangle" },
  dig: { notes: [140], type: "square" },
  find: { notes: [784, 988, 1175], type: "sine" },
};
export function chime(kind: Sound) {
  try {
    context ??= new AudioContext();
    void context.resume();
    const start = context.currentTime,
      { notes, type } = tunes[kind];
    notes.forEach((freq, i) => {
      const osc = context!.createOscillator(),
        gain = context!.createGain(),
        at = start + i * 0.09;
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.05, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      osc.connect(gain);
      gain.connect(context!.destination);
      osc.start(at);
      osc.stop(at + 0.18);
    });
  } catch {
    /* Visual feedback remains available. */
  }
}
